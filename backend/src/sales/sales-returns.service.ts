import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { roundMoney } from '../common/utils/money';
import { CreateSalesReturnDto } from './dto/sales-return.dto';

@Injectable()
export class SalesReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly inventory: InventoryService,
  ) {}

  private async generateReturnNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.salesReturn.count();
    return `SRET-${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(params: { page: number; pageSize: number }) {
    const { page, pageSize } = params;
    const [items, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        include: {
          customer: { select: { id: true, name: true } },
          sale: { select: { id: true, invoiceNumber: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.salesReturn.count(),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const salesReturn = await this.prisma.salesReturn.findUnique({
      where: { id },
      include: {
        customer: true,
        sale: true,
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });
    if (!salesReturn) throw new NotFoundException('Sales return not found');
    return salesReturn;
  }

  async create(dto: CreateSalesReturnDto, userId: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id: dto.saleId }, include: { items: true } });
    if (!sale) throw new NotFoundException('Original sale not found');
    if (dto.items.length === 0) throw new BadRequestException('A return needs at least one item');

    // Fast pre-check outside the transaction; the transaction below
    // re-validates against fresh data under Serializable isolation, which is
    // what actually prevents two concurrent returns for the same sale item
    // from jointly exceeding the quantity that was sold.
    for (const item of dto.items) {
      const saleItem = sale.items.find((i) => i.productId === item.productId);
      if (!saleItem) {
        throw new BadRequestException(`Product ${item.productId} was not part of sale ${sale.invoiceNumber}`);
      }
      const alreadyReturned = await this.prisma.salesReturnItem.aggregate({
        where: { salesReturn: { saleId: sale.id }, productId: item.productId },
        _sum: { quantity: true },
      });
      const returnedSoFar = alreadyReturned._sum.quantity ?? 0;
      if (returnedSoFar + item.quantity > saleItem.quantity) {
        throw new BadRequestException(
          `Cannot return ${item.quantity} units - only ${saleItem.quantity - returnedSoFar} available to return for this line item`,
        );
      }
    }

    const returnNumber = await this.generateReturnNumber();
    const refundTotal = roundMoney(dto.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));

    const salesReturn = await this.prisma.$transaction(
      async (tx) => {
        for (const item of dto.items) {
          const saleItem = sale.items.find((i) => i.productId === item.productId)!;
          const alreadyReturned = await tx.salesReturnItem.aggregate({
            where: { salesReturn: { saleId: sale.id }, productId: item.productId },
            _sum: { quantity: true },
          });
          const returnedSoFar = alreadyReturned._sum.quantity ?? 0;
          if (returnedSoFar + item.quantity > saleItem.quantity) {
            throw new BadRequestException(
              `Cannot return ${item.quantity} units - only ${saleItem.quantity - returnedSoFar} available to return for this line item`,
            );
          }
        }

        const created = await tx.salesReturn.create({
          data: {
            returnNumber,
            saleId: sale.id,
            customerId: sale.customerId,
            status: 'COMPLETED',
            refundTotal,
            notes: dto.notes,
            userId,
            items: {
              create: dto.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                reason: i.reason,
                condition: i.condition,
                restocked: i.restock ?? true,
              })),
            },
          },
          include: { items: true },
        });

        for (const item of dto.items) {
          if (item.restock ?? true) {
            await this.inventory.applyMovement(tx, {
              productId: item.productId,
              warehouseId: sale.warehouseId,
              quantityDelta: item.quantity,
              type: StockMovementType.SALE_RETURN,
              userId,
              reference: created.returnNumber,
              reason: `Customer return: ${item.reason}`,
            });
          }
        }

        if (sale.paymentStatus === 'PAID') {
          await tx.payment.create({
            data: {
              direction: 'OUTBOUND',
              amount: refundTotal,
              method: sale.paymentMethod,
              saleId: sale.id,
              reference: created.returnNumber,
              notes: 'Refund for sales return',
            },
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'SalesReturn',
      entityId: salesReturn.id,
      description: `Created sales return ${salesReturn.returnNumber} against ${sale.invoiceNumber}`,
      newData: salesReturn,
    });

    return salesReturn;
  }
}
