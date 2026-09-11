import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { roundMoney } from '../common/utils/money';
import { CreatePurchaseReturnDto } from './dto/purchase-return.dto';

@Injectable()
export class PurchaseReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  private async generateReturnNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.purchaseReturn.count();
    return `PRET-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const [items, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        include: {
          supplier: { select: { id: true, name: true } },
          purchase: { select: { id: true, invoiceNumber: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.purchaseReturn.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const purchaseReturn = await this.prisma.purchaseReturn.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchase: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
    if (!purchaseReturn) throw new NotFoundException('Purchase return not found');
    return purchaseReturn;
  }

  async create(dto: CreatePurchaseReturnDto, userId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: dto.purchaseId },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException('Original purchase not found');
    if (dto.items.length === 0) throw new BadRequestException('A return needs at least one item');

    // A fast, friendly pre-check outside the transaction (common case: no
    // concurrent request for the same line item). The transaction below
    // re-validates against fresh data under Serializable isolation, which is
    // what actually prevents two concurrent returns from jointly exceeding
    // the purchased quantity - Postgres aborts one of them as a write
    // conflict rather than letting both commit against stale reads.
    for (const item of dto.items) {
      const purchaseItem = purchase.items.find((i) => i.productId === item.productId);
      if (!purchaseItem) {
        throw new BadRequestException(
          `Product ${item.productId} was not part of purchase ${purchase.invoiceNumber}`,
        );
      }
      const alreadyReturned = await this.prisma.purchaseReturnItem.aggregate({
        where: { purchaseReturn: { purchaseId: purchase.id }, productId: item.productId },
        _sum: { quantity: true },
      });
      const returnedSoFar = alreadyReturned._sum.quantity ?? 0;
      if (returnedSoFar + item.quantity > purchaseItem.quantity) {
        throw new BadRequestException(
          `Cannot return ${item.quantity} units - only ${purchaseItem.quantity - returnedSoFar} available to return for this line item`,
        );
      }
    }

    const returnNumber = await this.generateReturnNumber();
    const refundTotal = roundMoney(dto.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0));

    const purchaseReturn = await this.prisma.$transaction(
      async (tx) => {
        for (const item of dto.items) {
          const purchaseItem = purchase.items.find((i) => i.productId === item.productId)!;
          const alreadyReturned = await tx.purchaseReturnItem.aggregate({
            where: { purchaseReturn: { purchaseId: purchase.id }, productId: item.productId },
            _sum: { quantity: true },
          });
          const returnedSoFar = alreadyReturned._sum.quantity ?? 0;
          if (returnedSoFar + item.quantity > purchaseItem.quantity) {
            throw new BadRequestException(
              `Cannot return ${item.quantity} units - only ${purchaseItem.quantity - returnedSoFar} available to return for this line item`,
            );
          }
        }

        const created = await tx.purchaseReturn.create({
          data: {
            returnNumber,
            purchaseId: purchase.id,
            supplierId: purchase.supplierId,
            status: 'COMPLETED',
            refundTotal,
            notes: dto.notes,
            userId,
            items: {
              create: dto.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitCost: i.unitCost,
                reason: i.reason,
                condition: i.condition,
              })),
            },
          },
          include: { items: true },
        });

        for (const item of dto.items) {
          await this.inventory.applyMovement(tx, {
            productId: item.productId,
            warehouseId: purchase.warehouseId,
            quantityDelta: -item.quantity,
            type: StockMovementType.PURCHASE_RETURN,
            userId,
            reference: created.returnNumber,
            reason: `Return to supplier: ${item.reason}`,
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'PurchaseReturn',
      entityId: purchaseReturn.id,
      description: `Created purchase return ${purchaseReturn.returnNumber} against ${purchase.invoiceNumber}`,
      newData: purchaseReturn,
    });

    return purchaseReturn;
  }
}
