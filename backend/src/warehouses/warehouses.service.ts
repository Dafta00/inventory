import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll() {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      include: {
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { inventory: true } },
      },
      orderBy: { name: 'asc' },
    });
    return warehouses;
  }

  async findOne(id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      include: { manager: { select: { id: true, name: true, email: true } } },
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async getInventory(id: string) {
    await this.findOne(id);
    const inventory = await this.prisma.inventory.findMany({
      where: { warehouseId: id },
      include: {
        product: {
          select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });
    return inventory;
  }

  async getValuation(id: string) {
    await this.findOne(id);
    const inventory = await this.prisma.inventory.findMany({
      where: { warehouseId: id },
      include: { product: { select: { costPrice: true, sellingPrice: true } } },
    });
    const totalCostValue = inventory.reduce((sum, i) => sum + i.quantity * Number(i.product.costPrice), 0);
    const totalRetailValue = inventory.reduce(
      (sum, i) => sum + i.quantity * Number(i.product.sellingPrice),
      0,
    );
    const totalUnits = inventory.reduce((sum, i) => sum + i.quantity, 0);
    return { totalCostValue, totalRetailValue, totalUnits, skuCount: inventory.length };
  }

  async create(dto: CreateWarehouseDto, userId: string) {
    const warehouse = await this.prisma.warehouse.create({ data: dto });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Warehouse',
      entityId: warehouse.id,
      description: `Created warehouse "${warehouse.name}"`,
      newData: warehouse,
    });
    return warehouse;
  }

  async update(id: string, dto: UpdateWarehouseDto, userId: string) {
    const existing = await this.findOne(id);
    const warehouse = await this.prisma.warehouse.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Warehouse',
      entityId: id,
      description: `Updated warehouse "${warehouse.name}"`,
      previousData: existing,
      newData: warehouse,
    });
    return warehouse;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    const stockCount = await this.prisma.inventory.count({
      where: { warehouseId: id, quantity: { gt: 0 } },
    });
    if (stockCount > 0) {
      throw new BadRequestException('Cannot deactivate a warehouse that still holds stock');
    }
    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Warehouse',
      entityId: id,
      description: `Deactivated warehouse "${existing.name}"`,
      previousData: existing,
    });
    return warehouse;
  }
}
