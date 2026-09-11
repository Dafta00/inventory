import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { endOfDay } from '../common/utils/date-range';

export type ReportFilters = ReportFiltersDto;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  toCsv(rows: Record<string, unknown>[]) {
    if (rows.length === 0) return 'No data';
    const parser = new Parser();
    return parser.parse(rows);
  }

  async inventoryReport(filters: ReportFilters) {
    const inventory = await this.prisma.inventory.findMany({
      where: {
        ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
        ...(filters.productId ? { productId: filters.productId } : {}),
        ...(filters.categoryId ? { product: { categoryId: filters.categoryId } } : {}),
      },
      include: {
        product: { include: { category: true, brand: true } },
        warehouse: { select: { id: true, name: true } },
      },
    });

    const rows = inventory
      .filter((i) => i.product.status === 'ACTIVE')
      .map((i) => ({
        sku: i.product.sku,
        name: i.product.name,
        category: i.product.category?.name ?? '-',
        brand: i.product.brand?.name ?? '-',
        warehouse: i.warehouse.name,
        quantity: i.quantity,
        reorderLevel: i.product.reorderLevel,
        costPrice: Number(i.product.costPrice),
        sellingPrice: Number(i.product.sellingPrice),
        stockValue: i.quantity * Number(i.product.costPrice),
        status: i.quantity === 0 ? 'OUT_OF_STOCK' : i.quantity <= i.product.reorderLevel ? 'LOW_STOCK' : 'OK',
      }));

    return {
      rows,
      totals: {
        totalUnits: rows.reduce((s, r) => s + r.quantity, 0),
        totalValue: rows.reduce((s, r) => s + r.stockValue, 0),
        lowStockCount: rows.filter((r) => r.status === 'LOW_STOCK').length,
        outOfStockCount: rows.filter((r) => r.status === 'OUT_OF_STOCK').length,
      },
    };
  }

  async salesReport(filters: ReportFilters) {
    const where: any = {
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
            },
          }
        : {}),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        staff: { select: { name: true } },
        warehouse: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows = sales.map((s) => ({
      invoiceNumber: s.invoiceNumber,
      date: s.createdAt.toISOString().slice(0, 10),
      customer: s.customer?.name ?? 'Walk-in',
      staff: s.staff.name,
      warehouse: s.warehouse.name,
      itemCount: s.items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: Number(s.subtotal),
      tax: Number(s.taxTotal),
      discount: Number(s.discountTotal),
      total: Number(s.total),
      paymentStatus: s.paymentStatus,
    }));

    const byStaff = new Map<string, number>();
    const byCustomer = new Map<string, number>();
    for (const s of sales) {
      byStaff.set(s.staff.name, (byStaff.get(s.staff.name) ?? 0) + Number(s.total));
      const custName = s.customer?.name ?? 'Walk-in';
      byCustomer.set(custName, (byCustomer.get(custName) ?? 0) + Number(s.total));
    }

    return {
      rows,
      totals: {
        totalSales: rows.length,
        totalRevenue: rows.reduce((s, r) => s + r.total, 0),
        totalQuantitySold: rows.reduce((s, r) => s + r.itemCount, 0),
      },
      byStaff: Array.from(byStaff.entries()).map(([staff, total]) => ({ staff, total })),
      byCustomer: Array.from(byCustomer.entries()).map(([customer, total]) => ({ customer, total })),
    };
  }

  async purchaseReport(filters: ReportFilters) {
    const where: any = {
      ...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: endOfDay(filters.to) } : {}),
            },
          }
        : {}),
    };

    const purchases = await this.prisma.purchase.findMany({
      where,
      include: { supplier: { select: { name: true } }, warehouse: { select: { name: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    });

    const rows = purchases.map((p) => ({
      invoiceNumber: p.invoiceNumber,
      date: p.createdAt.toISOString().slice(0, 10),
      supplier: p.supplier.name,
      warehouse: p.warehouse.name,
      itemCount: p.items.reduce((sum, i) => sum + i.quantity, 0),
      total: Number(p.total),
    }));

    const bySupplier = new Map<string, number>();
    for (const p of purchases) {
      bySupplier.set(p.supplier.name, (bySupplier.get(p.supplier.name) ?? 0) + Number(p.total));
    }

    return {
      rows,
      totals: {
        totalPurchases: rows.length,
        totalSpent: rows.reduce((s, r) => s + r.total, 0),
      },
      bySupplier: Array.from(bySupplier.entries()).map(([supplier, total]) => ({ supplier, total })),
    };
  }

  async profitAndLossReport(filters: ReportFilters) {
    const dateFilter =
      filters.from || filters.to
        ? {
            gte: filters.from ? new Date(filters.from) : undefined,
            lte: filters.to ? endOfDay(filters.to) : undefined,
          }
        : undefined;

    const [saleItems, expenses] = await Promise.all([
      this.prisma.saleItem.findMany({
        where: dateFilter ? { sale: { createdAt: dateFilter } } : {},
        include: { product: { select: { costPrice: true } } },
      }),
      this.prisma.expense.aggregate({
        where: dateFilter ? { date: dateFilter } : {},
        _sum: { amount: true },
      }),
    ]);

    const revenue = saleItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);
    const cogs = saleItems.reduce((sum, i) => sum + i.quantity * Number(i.product.costPrice), 0);
    const grossProfit = revenue - cogs;
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const netProfit = grossProfit - totalExpenses;

    return { revenue, cogs, grossProfit, totalExpenses, netProfit };
  }

  async stockValuationReport(filters: ReportFilters) {
    const inventory = await this.prisma.inventory.findMany({
      where: filters.warehouseId ? { warehouseId: filters.warehouseId } : {},
      include: { product: true, warehouse: { select: { name: true } } },
    });

    const rows = inventory
      .filter((i) => i.product.status === 'ACTIVE')
      .map((i) => ({
        sku: i.product.sku,
        name: i.product.name,
        warehouse: i.warehouse.name,
        quantity: i.quantity,
        costPrice: Number(i.product.costPrice),
        costValue: i.quantity * Number(i.product.costPrice),
        retailValue: i.quantity * Number(i.product.sellingPrice),
      }));

    return {
      rows,
      totals: {
        totalCostValue: rows.reduce((s, r) => s + r.costValue, 0),
        totalRetailValue: rows.reduce((s, r) => s + r.retailValue, 0),
      },
    };
  }
}
