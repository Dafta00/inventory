import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where: any = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const [purchases, aggregates, productsSupplied] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { supplierId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, invoiceNumber: true, total: true, status: true, createdAt: true },
      }),
      this.prisma.purchase.aggregate({
        where: { supplierId: id },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.product.findMany({
        where: { primarySupplierId: id, deletedAt: null },
        select: { id: true, name: true, sku: true },
      }),
    ]);

    return {
      ...supplier,
      recentPurchases: purchases,
      totalPurchases: aggregates._sum.total ?? 0,
      totalPurchaseOrders: aggregates._count,
      productsSupplied,
    };
  }

  async create(dto: CreateSupplierDto, userId: string) {
    const supplier = await this.prisma.supplier.create({ data: dto });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Supplier',
      entityId: supplier.id,
      description: `Created supplier "${supplier.name}"`,
      newData: supplier,
    });
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, userId: string) {
    const existing = await this.findOne(id);
    const supplier = await this.prisma.supplier.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Supplier',
      entityId: id,
      description: `Updated supplier "${supplier.name}"`,
      previousData: existing,
      newData: supplier,
    });
    return supplier;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Supplier',
      entityId: id,
      description: `Archived supplier "${existing.name}"`,
      previousData: existing,
    });
    return supplier;
  }
}
