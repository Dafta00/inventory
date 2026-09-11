import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { roundMoney } from '../common/utils/money';
import { endOfDay } from '../common/utils/date-range';
import { CreateSaleDto, SaleQueryDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  private async generateInvoiceNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.sale.count();
    return `INV-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(query: SaleQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 20, 100);
    const where: any = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.staffId ? { staffId: query.staffId } : {}),
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
      this.prisma.sale.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          staff: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sale.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        warehouse: true,
        staff: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        salesReturns: true,
        payments: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async create(dto: CreateSaleDto, userId: string) {
    if (dto.items.length === 0) throw new BadRequestException('A sale needs at least one item');

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, deletedAt: null },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products could not be found');
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    const itemsData = dto.items.map((item) => {
      const lineSubtotal = roundMoney(item.quantity * item.unitPrice);
      const lineDiscount = roundMoney(item.discount ?? 0);
      const lineTax = roundMoney(((lineSubtotal - lineDiscount) * (item.taxRate ?? 0)) / 100);
      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate ?? 0,
        discount: lineDiscount,
        lineTotal: roundMoney(lineSubtotal - lineDiscount + lineTax),
      };
    });
    subtotal = roundMoney(subtotal);
    taxTotal = roundMoney(taxTotal);
    discountTotal = roundMoney(discountTotal);
    const total = roundMoney(subtotal - discountTotal + taxTotal);

    const sale = await this.prisma.$transaction(async (tx) => {
      // Stock sufficiency (respecting the allow_negative_stock setting) is
      // enforced atomically by inventory.applyMovement below, inside this
      // same transaction, so a shortfall rolls back the whole sale.
      const created = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId,
          warehouseId: dto.warehouseId,
          staffId: userId,
          status: 'COMPLETED',
          subtotal,
          taxTotal,
          discountTotal,
          total,
          paymentMethod: dto.paymentMethod ?? 'CASH',
          paymentStatus: 'PAID',
          notes: dto.notes,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await this.inventory.applyMovement(tx, {
          productId: item.productId,
          warehouseId: dto.warehouseId,
          quantityDelta: -item.quantity,
          type: StockMovementType.SALE,
          userId,
          reference: created.invoiceNumber,
          reason: 'Sale',
        });
      }

      await tx.payment.create({
        data: {
          direction: 'INBOUND',
          amount: total,
          method: dto.paymentMethod ?? 'CASH',
          saleId: created.id,
          reference: created.invoiceNumber,
        },
      });

      return created;
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      description: `Created sale ${sale.invoiceNumber} for ${total}`,
      newData: sale,
    });

    return sale;
  }
}
