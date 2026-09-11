import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [
      totalProducts,
      inventoryRows,
      todaySalesAgg,
      todayPurchasesAgg,
      monthlySalesAgg,
      monthlyExpensesAgg,
      monthlyPurchasesAgg,
      pendingPurchaseOrders,
      pendingSales,
    ] = await Promise.all([
      this.prisma.product.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.inventory.findMany({
        include: { product: { select: { costPrice: true, status: true, reorderLevel: true } } },
      }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.purchase.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { total: true } }),
      this.prisma.expense.aggregate({ where: { date: { gte: monthStart } }, _sum: { amount: true } }),
      this.prisma.purchase.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { total: true } }),
      this.prisma.purchaseOrder.count({
        where: { status: { in: ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'] } },
      }),
      this.prisma.sale.count({ where: { status: 'PENDING' } }),
    ]);

    const activeInventory = inventoryRows.filter((i) => i.product.status === 'ACTIVE');
    const totalStockQuantity = activeInventory.reduce((sum, i) => sum + i.quantity, 0);
    const totalInventoryValue = activeInventory.reduce(
      (sum, i) => sum + i.quantity * Number(i.product.costPrice),
      0,
    );
    const lowStockCount = activeInventory.filter(
      (i) => i.quantity > 0 && i.quantity <= i.product.reorderLevel,
    ).length;
    const outOfStockCount = activeInventory.filter((i) => i.quantity === 0).length;

    const monthlyRevenue = Number(monthlySalesAgg._sum.total ?? 0);
    const monthlyExpenses = Number(monthlyExpensesAgg._sum.amount ?? 0);
    const monthlyCogsApprox = Number(monthlyPurchasesAgg._sum.total ?? 0);
    const estimatedProfit = monthlyRevenue - monthlyExpenses;

    return {
      totalProducts,
      totalInventoryValue,
      totalStockQuantity,
      lowStockCount,
      outOfStockCount,
      todaySales: Number(todaySalesAgg._sum.total ?? 0),
      todaySalesCount: todaySalesAgg._count,
      todayPurchases: Number(todayPurchasesAgg._sum.total ?? 0),
      todayPurchasesCount: todayPurchasesAgg._count,
      monthlyRevenue,
      monthlyExpenses,
      monthlyCogsApprox,
      estimatedProfit,
      pendingPurchaseOrders,
      pendingSalesOrders: pendingSales,
    };
  }

  async getSalesOverTime(days = 30) {
    const from = daysAgo(days);
    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true, total: true },
    });
    return this.bucketByDay(sales, days);
  }

  async getPurchasesOverTime(days = 30) {
    const from = daysAgo(days);
    const purchases = await this.prisma.purchase.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true, total: true },
    });
    return this.bucketByDay(purchases, days);
  }

  private bucketByDay(rows: { createdAt: Date; total: any }[], days: number) {
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const key = daysAgo(i).toISOString().slice(0, 10);
      buckets.set(key, 0);
    }
    for (const row of rows) {
      const key = startOfDay(row.createdAt).toISOString().slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, buckets.get(key)! + Number(row.total));
      }
    }
    return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
  }

  async getRevenueVsExpenses(months = 6) {
    const now = new Date();
    const results: { month: string; revenue: number; expenses: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const [salesAgg, expensesAgg] = await Promise.all([
        this.prisma.sale.aggregate({
          where: { createdAt: { gte: monthStart, lt: monthEnd } },
          _sum: { total: true },
        }),
        this.prisma.expense.aggregate({
          where: { date: { gte: monthStart, lt: monthEnd } },
          _sum: { amount: true },
        }),
      ]);
      results.push({
        month: monthStart.toISOString().slice(0, 7),
        revenue: Number(salesAgg._sum.total ?? 0),
        expenses: Number(expensesAgg._sum.amount ?? 0),
      });
    }
    return results;
  }

  async getTopSellingProducts(days = 30, limit = 10) {
    const from = daysAgo(days);
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: { createdAt: { gte: from } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });
    return grouped.map((g) => {
      const product = products.find((p) => p.id === g.productId);
      return {
        productId: g.productId,
        name: product?.name ?? 'Unknown',
        sku: product?.sku ?? '',
        quantitySold: g._sum.quantity ?? 0,
        revenue: Number(g._sum.lineTotal ?? 0),
      };
    });
  }

  async getInventoryByCategory() {
    const inventory = await this.prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
    });
    const map = new Map<string, { category: string; value: number; quantity: number }>();
    for (const i of inventory) {
      if (i.product.status !== 'ACTIVE') continue;
      const key = i.product.category?.name ?? 'Uncategorized';
      const existing = map.get(key) ?? { category: key, value: 0, quantity: 0 };
      existing.value += i.quantity * Number(i.product.costPrice);
      existing.quantity += i.quantity;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }

  async getStockMovementTrends(days = 30) {
    const from = daysAgo(days);
    const grouped = await this.prisma.stockMovement.groupBy({
      by: ['type'],
      where: { createdAt: { gte: from } },
      _sum: { quantity: true },
      _count: true,
    });
    return grouped.map((g) => ({ type: g.type, count: g._count, totalQuantity: g._sum.quantity ?? 0 }));
  }

  async getRecentActivity() {
    const [recentSales, recentPurchases, recentMovements] = await Promise.all([
      this.prisma.sale.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          createdAt: true,
          customer: { select: { name: true } },
          staff: { select: { name: true } },
        },
      }),
      this.prisma.purchase.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          createdAt: true,
          supplier: { select: { name: true } },
        },
      }),
      this.prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
    ]);
    return { recentSales, recentPurchases, recentMovements };
  }
}
