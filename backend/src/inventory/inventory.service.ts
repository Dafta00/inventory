import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AdjustStockDto, MovementsQueryDto, TransferStockDto } from './dto/inventory.dto';
import { endOfDay } from '../common/utils/date-range';

type TxClient = Prisma.TransactionClient;

export interface MovementParams {
  productId: string;
  warehouseId: string;
  quantityDelta: number; // signed
  type: StockMovementType;
  userId: string;
  reference?: string;
  reason?: string;
  transferToId?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async isNegativeStockAllowed(tx: TxClient): Promise<boolean> {
    const setting = await tx.setting.findUnique({ where: { key: 'allow_negative_stock' } });
    return setting?.value === true;
  }

  /**
   * Core stock mutation primitive. Always called within a transaction so
   * callers (sales, purchases, returns, transfers) can compose it with their
   * own record creation and have the whole operation roll back together.
   */
  async applyMovement(tx: TxClient, params: MovementParams) {
    const { productId, warehouseId, quantityDelta, type, userId, reference, reason, transferToId } = params;

    const inventory = await tx.inventory.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      create: { productId, warehouseId, quantity: 0 },
      update: {},
    });

    const previousQuantity = inventory.quantity;
    const newQuantity = previousQuantity + quantityDelta;

    if (newQuantity < 0) {
      const allowNegative = await this.isNegativeStockAllowed(tx);
      if (!allowNegative) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        throw new BadRequestException(
          `Insufficient stock for "${product?.name ?? productId}" in this warehouse. Available: ${previousQuantity}, requested: ${-quantityDelta}`,
        );
      }
    }

    await tx.inventory.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantity: newQuantity },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId,
        warehouseId,
        transferToId,
        type,
        quantity: Math.abs(quantityDelta),
        previousQuantity,
        newQuantity,
        reference,
        reason,
        userId,
      },
    });

    return movement;
  }

  async findStock(params: { productId?: string; warehouseId?: string; lowStockOnly?: boolean }) {
    const { productId, warehouseId, lowStockOnly } = params;
    const inventory = await this.prisma.inventory.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            minStockLevel: true,
            reorderLevel: true,
            maxStockLevel: true,
            costPrice: true,
            sellingPrice: true,
            status: true,
          },
        },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    const enriched = inventory
      .filter((i) => i.product.status === 'ACTIVE')
      .map((i) => ({
        ...i,
        isLowStock: i.quantity <= i.product.reorderLevel,
        isOutOfStock: i.quantity === 0,
      }));

    return lowStockOnly ? enriched.filter((i) => i.isLowStock) : enriched;
  }

  async getMovements(query: MovementsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: Prisma.StockMovementWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.type ? { type: query.type as StockMovementType } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: endOfDay(query.to) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
          transferTo: { select: { id: true, name: true, code: true } },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async adjustStock(dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Product not found');

    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, deletedAt: null },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const movement = await this.prisma.$transaction((tx) =>
      this.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        quantityDelta: dto.quantityDelta,
        type: dto.type as StockMovementType,
        userId,
        reason: dto.reason,
      }),
    );

    await this.audit.log({
      userId,
      action: 'STOCK_ADJUST',
      entity: 'StockMovement',
      entityId: movement.id,
      description: `${dto.type} of ${dto.quantityDelta} for "${product.name}" at ${warehouse.name}`,
      newData: movement,
    });

    return movement;
  }

  async transferStock(dto: TransferStockDto, userId: string) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouses must differ');
    }
    if (dto.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be greater than zero');
    }

    const [product, fromWarehouse, toWarehouse] = await Promise.all([
      this.prisma.product.findFirst({ where: { id: dto.productId, deletedAt: null } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.fromWarehouseId, deletedAt: null } }),
      this.prisma.warehouse.findFirst({ where: { id: dto.toWarehouseId, deletedAt: null } }),
    ]);
    if (!product) throw new NotFoundException('Product not found');
    if (!fromWarehouse) throw new NotFoundException('Source warehouse not found');
    if (!toWarehouse) throw new NotFoundException('Destination warehouse not found');

    const [outMovement, inMovement] = await this.prisma.$transaction(async (tx) => {
      const out = await this.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.fromWarehouseId,
        quantityDelta: -dto.quantity,
        type: StockMovementType.TRANSFER_OUT,
        userId,
        reason: dto.notes,
        transferToId: dto.toWarehouseId,
      });
      const inbound = await this.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.toWarehouseId,
        quantityDelta: dto.quantity,
        type: StockMovementType.TRANSFER_IN,
        userId,
        reason: dto.notes,
        transferToId: dto.fromWarehouseId,
      });
      return [out, inbound];
    });

    await this.audit.log({
      userId,
      action: 'STOCK_TRANSFER',
      entity: 'StockMovement',
      entityId: outMovement.id,
      description: `Transferred ${dto.quantity} x "${product.name}" from ${fromWarehouse.name} to ${toWarehouse.name}`,
      newData: { outMovement, inMovement },
    });

    return { outMovement, inMovement };
  }

  async lowStockSummary() {
    const inventory = await this.prisma.inventory.findMany({
      include: { product: true, warehouse: true },
    });
    const active = inventory.filter((i) => i.product.status === 'ACTIVE');
    const lowStock = active.filter((i) => i.quantity > 0 && i.quantity <= i.product.reorderLevel);
    const outOfStock = active.filter((i) => i.quantity === 0);
    return {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockItems: lowStock.slice(0, 20),
      outOfStockItems: outOfStock.slice(0, 20),
    };
  }
}
