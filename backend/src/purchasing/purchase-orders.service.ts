import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseOrderStatus, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { roundMoney } from '../common/utils/money';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderStatusDto,
} from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  private async generatePoNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.purchaseOrder.count();
    return `PO-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  private computeTotals(
    items: { quantity: number; unitCost: number; taxRate?: number; discount?: number }[],
  ) {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    for (const item of items) {
      const lineSubtotal = roundMoney(item.quantity * item.unitCost);
      const lineDiscount = roundMoney(item.discount ?? 0);
      const lineTax = roundMoney(((lineSubtotal - lineDiscount) * (item.taxRate ?? 0)) / 100);
      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    }
    return {
      subtotal: roundMoney(subtotal),
      taxTotal: roundMoney(taxTotal),
      discountTotal: roundMoney(discountTotal),
      total: roundMoney(subtotal - discountTotal + taxTotal),
    };
  }

  async findAll(params: {
    page: number;
    pageSize: number;
    status?: PurchaseOrderStatus;
    supplierId?: string;
  }) {
    const { page, pageSize, status, supplierId } = params;
    const where: any = {
      ...(status ? { status } : {}),
      ...(supplierId ? { supplierId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          warehouse: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
        purchases: { select: { id: true, invoiceNumber: true, createdAt: true, total: true } },
      },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, userId: string) {
    if (dto.items.length === 0) throw new BadRequestException('A purchase order needs at least one item');

    const poNumber = await this.generatePoNumber();
    const totals = this.computeTotals(dto.items);

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
            taxRate: item.taxRate ?? 0,
            discount: item.discount ?? 0,
          })),
        },
      },
      include: { items: true },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: po.id,
      description: `Created purchase order ${po.poNumber}`,
      newData: po,
    });

    return po;
  }

  async updateStatus(id: string, dto: UpdatePurchaseOrderStatusDto, userId: string) {
    const po = await this.findOne(id);
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['CANCELLED'],
    };
    const allowed = allowedTransitions[po.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot move purchase order from ${po.status} to ${dto.status}`);
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: dto.status as PurchaseOrderStatus },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE_STATUS',
      entity: 'PurchaseOrder',
      entityId: id,
      description: `Purchase order ${po.poNumber} moved from ${po.status} to ${dto.status}`,
      previousData: { status: po.status },
      newData: { status: dto.status },
    });

    return updated;
  }

  private async generateInvoiceNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.purchase.count();
    return `PUR-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  async receive(id: string, dto: ReceivePurchaseOrderDto, userId: string) {
    const po = await this.findOne(id);
    if (!['CONFIRMED', 'SENT', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw new BadRequestException(
        `Purchase order must be sent/confirmed before it can be received (current status: ${po.status})`,
      );
    }
    if (dto.items.length === 0) throw new BadRequestException('Specify at least one item to receive');

    const itemsToReceive = dto.items.filter((i) => i.quantityReceived > 0);
    if (itemsToReceive.length === 0) {
      throw new BadRequestException('Received quantities must be greater than zero');
    }

    for (const receivedItem of itemsToReceive) {
      const poItem = po.items.find((i) => i.productId === receivedItem.productId);
      if (!poItem) {
        throw new BadRequestException(`Product ${receivedItem.productId} is not part of this purchase order`);
      }
      const remaining = poItem.quantity - poItem.receivedQty;
      if (receivedItem.quantityReceived > remaining) {
        throw new BadRequestException(
          `Cannot receive ${receivedItem.quantityReceived} units - only ${remaining} remaining for this line item`,
        );
      }
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const result = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let taxTotal = 0;
      let discountTotal = 0;
      const purchaseItemsData = itemsToReceive.map((receivedItem) => {
        const poItem = po.items.find((i) => i.productId === receivedItem.productId)!;
        const lineSubtotal = roundMoney(receivedItem.quantityReceived * Number(poItem.unitCost));
        const proportion = receivedItem.quantityReceived / poItem.quantity;
        const lineDiscount = roundMoney(Number(poItem.discount) * proportion);
        const lineTax = roundMoney(((lineSubtotal - lineDiscount) * Number(poItem.taxRate)) / 100);
        subtotal += lineSubtotal;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
        return {
          productId: receivedItem.productId,
          quantity: receivedItem.quantityReceived,
          unitCost: poItem.unitCost,
          taxRate: poItem.taxRate,
          discount: lineDiscount,
          lineTotal: roundMoney(lineSubtotal - lineDiscount + lineTax),
        };
      });

      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          purchaseOrderId: po.id,
          supplierId: po.supplierId,
          warehouseId: po.warehouseId,
          status: 'RECEIVED',
          subtotal: roundMoney(subtotal),
          taxTotal: roundMoney(taxTotal),
          discountTotal: roundMoney(discountTotal),
          total: roundMoney(subtotal - discountTotal + taxTotal),
          notes: dto.notes,
          receivedById: userId,
          items: { create: purchaseItemsData },
        },
        include: { items: true },
      });

      for (const receivedItem of itemsToReceive) {
        const poItemId = po.items.find((i) => i.productId === receivedItem.productId)!.id;

        // Atomic, race-safe guard: the WHERE clause re-checks the remaining
        // quantity against the current DB row (not the pre-transaction
        // snapshot), so two concurrent receive requests against the same
        // line item can never jointly over-receive it.
        const affected = await tx.$executeRaw`
          UPDATE "purchase_order_items"
          SET "receivedQty" = "receivedQty" + ${receivedItem.quantityReceived}
          WHERE "id" = ${poItemId}
            AND "receivedQty" + ${receivedItem.quantityReceived} <= "quantity"
        `;
        if (affected === 0) {
          throw new BadRequestException(
            `Cannot receive ${receivedItem.quantityReceived} units for this line item - it no longer has that much remaining (it may have just been received by another request)`,
          );
        }

        await this.inventory.applyMovement(tx, {
          productId: receivedItem.productId,
          warehouseId: po.warehouseId,
          quantityDelta: receivedItem.quantityReceived,
          type: StockMovementType.PURCHASE,
          userId,
          reference: purchase.invoiceNumber,
          reason: `Received against PO ${po.poNumber}`,
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
      const fullyReceived = refreshedItems.every((i) => i.receivedQty >= i.quantity);
      const partiallyReceived = refreshedItems.some((i) => i.receivedQty > 0);
      const newStatus: PurchaseOrderStatus = fullyReceived
        ? 'RECEIVED'
        : partiallyReceived
          ? 'PARTIALLY_RECEIVED'
          : po.status;

      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: newStatus } });

      return { purchase, newStatus };
    });

    await this.audit.log({
      userId,
      action: 'RECEIVE',
      entity: 'PurchaseOrder',
      entityId: po.id,
      description: `Received goods against PO ${po.poNumber} (invoice ${invoiceNumber})`,
      newData: result.purchase,
    });

    return result.purchase;
  }
}
