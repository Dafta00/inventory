import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { BulkArchiveDto, CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';

const SORTABLE_FIELDS = new Set(['name', 'sku', 'costPrice', 'sellingPrice', 'createdAt', 'updatedAt']);

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  private async generateSku(categoryId?: string) {
    let prefix = 'GEN';
    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (category)
        prefix =
          category.name
            .slice(0, 3)
            .toUpperCase()
            .replace(/[^A-Z]/g, '') || 'GEN';
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const random = Math.floor(100000 + Math.random() * 900000);
      const sku = `${prefix}-${random}`;
      const existing = await this.prisma.product.findUnique({ where: { sku } });
      if (!existing) return sku;
    }
    return `${prefix}-${Date.now()}`;
  }

  async findAll(query: ProductQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDir = query.sortDir === 'asc' ? 'asc' : 'desc';

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.supplierId ? { primarySupplierId: query.supplierId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { barcode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          inventory: { select: { quantity: true, warehouseId: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    let mapped = items.map((p) => {
      const totalStock = p.inventory.reduce((sum, i) => sum + i.quantity, 0);
      return {
        ...p,
        totalStock,
        isLowStock: totalStock <= p.reorderLevel,
        isOutOfStock: totalStock === 0,
      };
    });

    if (query.lowStockOnly) {
      mapped = mapped.filter((p) => p.isLowStock);
    }

    return { items: mapped, total, page, pageSize };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        brand: true,
        primarySupplier: { select: { id: true, name: true } },
        inventory: { include: { warehouse: { select: { id: true, name: true, code: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const totalStock = product.inventory.reduce((sum, i) => sum + i.quantity, 0);
    return { ...product, totalStock };
  }

  async create(dto: CreateProductDto, userId: string) {
    const sku = dto.sku?.trim() || (await this.generateSku(dto.categoryId));

    if (dto.sku) {
      const existingSku = await this.prisma.product.findUnique({ where: { sku } });
      if (existingSku) throw new ConflictException(`SKU "${sku}" is already in use`);
    }
    if (dto.barcode) {
      const existingBarcode = await this.prisma.product.findUnique({ where: { barcode: dto.barcode } });
      if (existingBarcode) throw new ConflictException(`Barcode "${dto.barcode}" is already in use`);
    }
    if (dto.initialQuantity && dto.initialQuantity > 0 && !dto.warehouseId) {
      throw new BadRequestException('warehouseId is required when providing initial stock');
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku,
          barcode: dto.barcode || null,
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          brandId: dto.brandId,
          primarySupplierId: dto.primarySupplierId,
          costPrice: dto.costPrice,
          sellingPrice: dto.sellingPrice,
          discount: dto.discount ?? 0,
          taxRate: dto.taxRate ?? 0,
          unit: dto.unit ?? 'pcs',
          minStockLevel: dto.minStockLevel ?? 0,
          reorderLevel: dto.reorderLevel ?? 0,
          maxStockLevel: dto.maxStockLevel,
          imageUrl: dto.imageUrl,
        },
      });

      if (dto.initialQuantity && dto.initialQuantity > 0 && dto.warehouseId) {
        await this.inventory.applyMovement(tx, {
          productId: created.id,
          warehouseId: dto.warehouseId,
          quantityDelta: dto.initialQuantity,
          type: StockMovementType.INITIAL_STOCK,
          userId,
          reason: 'Initial stock on product creation',
        });
      }

      return created;
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      description: `Created product "${product.name}" (${product.sku})`,
      newData: product,
    });

    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.findOne(id);

    if (dto.sku && dto.sku !== existing.sku) {
      const dup = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
      if (dup) throw new ConflictException(`SKU "${dto.sku}" is already in use`);
    }
    if (dto.barcode && dto.barcode !== existing.barcode) {
      const dup = await this.prisma.product.findUnique({ where: { barcode: dto.barcode } });
      if (dup) throw new ConflictException(`Barcode "${dto.barcode}" is already in use`);
    }

    const product = await this.prisma.product.update({ where: { id }, data: dto as any });

    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      description: `Updated product "${product.name}"`,
      previousData: existing,
      newData: product,
    });

    return product;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Product',
      entityId: id,
      description: `Archived product "${existing.name}"`,
      previousData: existing,
    });
    return product;
  }

  async bulkArchive(dto: BulkArchiveDto, userId: string) {
    const result = await this.prisma.product.updateMany({
      where: { id: { in: dto.ids } },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.audit.log({
      userId,
      action: 'BULK_DELETE',
      entity: 'Product',
      description: `Archived ${result.count} product(s)`,
      newData: { ids: dto.ids },
    });
    return { archived: result.count };
  }
}
