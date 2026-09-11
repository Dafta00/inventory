import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Package,
  Warehouse,
  AlertTriangle,
  XCircle,
  DollarSign,
  ShoppingCart,
  Receipt,
  ClipboardList,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: dashboardApi.summary });
  const salesOverTime = useQuery({ queryKey: ['dashboard', 'sales-over-time'], queryFn: () => dashboardApi.salesOverTime(30) });
  const purchasesOverTime = useQuery({
    queryKey: ['dashboard', 'purchases-over-time'],
    queryFn: () => dashboardApi.purchasesOverTime(30),
  });
  const revenueVsExpenses = useQuery({
    queryKey: ['dashboard', 'revenue-vs-expenses'],
    queryFn: () => dashboardApi.revenueVsExpenses(6),
  });
  const topProducts = useQuery({ queryKey: ['dashboard', 'top-products'], queryFn: () => dashboardApi.topProducts(30, 6) });
  const inventoryByCategory = useQuery({
    queryKey: ['dashboard', 'inventory-by-category'],
    queryFn: dashboardApi.inventoryByCategory,
  });
  const recentActivity = useQuery({ queryKey: ['dashboard', 'recent-activity'], queryFn: dashboardApi.recentActivity });

  const s = summary.data;

  return (
    <div>
      <PageHeader title="Dashboard" description="Real-time overview of your business" />

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Products" value={formatNumber(s?.totalProducts ?? 0)} icon={Package} />
          <StatCard label="Inventory Value" value={formatCurrency(s?.totalInventoryValue ?? 0)} icon={Warehouse} />
          <StatCard
            label="Low Stock Items"
            value={formatNumber(s?.lowStockCount ?? 0)}
            icon={AlertTriangle}
            tone="warning"
          />
          <StatCard label="Out of Stock" value={formatNumber(s?.outOfStockCount ?? 0)} icon={XCircle} tone="destructive" />

          <StatCard
            label="Today's Sales"
            value={formatCurrency(s?.todaySales ?? 0)}
            icon={Receipt}
            hint={`${s?.todaySalesCount ?? 0} transaction(s)`}
          />
          <StatCard
            label="Today's Purchases"
            value={formatCurrency(s?.todayPurchases ?? 0)}
            icon={ShoppingCart}
            hint={`${s?.todayPurchasesCount ?? 0} transaction(s)`}
          />
          <StatCard
            label="Monthly Profit (est.)"
            value={formatCurrency(s?.estimatedProfit ?? 0)}
            icon={DollarSign}
            tone={Number(s?.estimatedProfit ?? 0) >= 0 ? 'success' : 'destructive'}
            hint="Revenue minus expenses, this month"
          />
          <StatCard
            label="Pending Orders"
            value={formatNumber((s?.pendingPurchaseOrders ?? 0) + (s?.pendingSalesOrders ?? 0))}
            icon={ClipboardList}
            hint={`${s?.pendingPurchaseOrders ?? 0} PO · ${s?.pendingSalesOrders ?? 0} sales`}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales over time (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {salesOverTime.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesOverTime.data}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} labelFormatter={(l) => l} />
                  <Area type="monotone" dataKey="total" stroke="#2563eb" fill="url(#salesGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchases over time (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {purchasesOverTime.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={purchasesOverTime.data}>
                  <defs>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="total" stroke="#16a34a" fill="url(#purchaseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses (6 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {revenueVsExpenses.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsExpenses.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#dc2626" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory value by category</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {inventoryByCategory.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !inventoryByCategory.data?.length ? (
              <EmptyState title="No inventory data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventoryByCategory.data}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {inventoryByCategory.data.map((_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top-selling products (30 days)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {topProducts.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !topProducts.data?.length ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.data} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: any) => formatNumber(v)} />
                  <Bar dataKey="quantitySold" fill="#7c3aed" radius={[0, 4, 4, 0]} name="Units sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <>
                {recentActivity.data?.recentSales?.slice(0, 3).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.invoiceNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.customer?.name ?? 'Walk-in'} · {formatDateTime(s.createdAt)}
                      </p>
                    </div>
                    <Badge variant="success">{formatCurrency(s.total)}</Badge>
                  </div>
                ))}
                {recentActivity.data?.recentMovements?.slice(0, 3).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.type} · {m.warehouse.name} · {formatDateTime(m.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline">{m.quantity}</Badge>
                  </div>
                ))}
                {!recentActivity.data?.recentSales?.length && !recentActivity.data?.recentMovements?.length && (
                  <EmptyState title="No recent activity" />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
