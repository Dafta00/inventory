import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { roundMoney } from '../common/utils/money';
import { CreateQuickPurchaseDto } from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  private async generateInvoiceNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.purchase.count();
    return `PUR-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(params: { page: number; pageSize: number; supplierId?: string; warehouseId?: string }) {
    const { page, pageSize, supplierId, warehouseId } = params;
    const where: any = {
      ...(supplierId ? { supplierId } : {}),
      ...(warehouseId ? { warehouseId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          receivedBy: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        receivedBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        purchaseReturns: true,
      },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    return purchase;
  }

  /** Direct restock without a formal purchase order - e.g. a walk-in cash purchase from a supplier. */
  async createQuickPurchase(dto: CreateQuickPurchaseDto, userId: string) {
    if (dto.items.length === 0) throw new BadRequestException('A purchase needs at least one item');

    const invoiceNumber = await this.generateInvoiceNumber();

    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    const itemsData = dto.items.map((item) => {
      const lineSubtotal = roundMoney(item.quantity * item.unitCost);
      const lineDiscount = roundMoney(item.discount ?? 0);
      const lineTax = roundMoney(((lineSubtotal - lineDiscount) * (item.taxRate ?? 0)) / 100);
      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        taxRate: item.taxRate ?? 0,
        discount: lineDiscount,
        lineTotal: roundMoney(lineSubtotal - lineDiscount + lineTax),
      };
    });

    const purchase = await this.prisma.$transaction(async (tx) => {
      const created = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          status: 'RECEIVED',
          subtotal: roundMoney(subtotal),
          taxTotal: roundMoney(taxTotal),
          discountTotal: roundMoney(discountTotal),
          total: roundMoney(subtotal - discountTotal + taxTotal),
          notes: dto.notes,
          receivedById: userId,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      for (const item of dto.items) {
        await this.inventory.applyMovement(tx, {
          productId: item.productId,
          warehouseId: dto.warehouseId,
          quantityDelta: item.quantity,
          type: StockMovementType.PURCHASE,
          userId,
          reference: created.invoiceNumber,
          reason: 'Direct purchase (no purchase order)',
        });
      }

      return created;
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase.id,
      description: `Recorded direct purchase ${purchase.invoiceNumber}`,
      newData: purchase,
    });

    return purchase;
  }
}
