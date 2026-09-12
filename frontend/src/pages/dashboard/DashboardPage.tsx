import { Link } from 'react-router-dom';
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
  ArrowRight,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard';
import { inventoryApi } from '@/api/inventory';
import { StatCard } from '@/components/stat-card';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { CHART_COLORS } from '@/lib/chart-colors';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils';

const AXIS_STYLE = { fontSize: 11, fill: CHART_COLORS.axis };
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  fontSize: 13,
};

export function DashboardPage() {
  const { user } = useAuth();
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: dashboardApi.summary });
  const alerts = useQuery({ queryKey: ['inventory', 'alerts'], queryFn: inventoryApi.alerts });
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
  const firstName = user?.name?.split(' ')[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const alertItems = [...(alerts.data?.outOfStockItems ?? []), ...(alerts.data?.lowStockItems ?? [])].slice(0, 5);
  const hasAlerts = (alerts.data?.outOfStockCount ?? 0) + (alerts.data?.lowStockCount ?? 0) > 0;

  return (
    <div>
      <PageHeader title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'} description={`${today} · Real-time overview of your business`} />

      {summary.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StatCard size="featured" label="Inventory Value" value={formatCurrency(s?.totalInventoryValue ?? 0)} icon={Warehouse} />
          <StatCard
            size="featured"
            label="Monthly Profit (est.)"
            value={formatCurrency(s?.estimatedProfit ?? 0)}
            icon={DollarSign}
            tone={Number(s?.estimatedProfit ?? 0) >= 0 ? 'success' : 'destructive'}
            hint="Revenue minus expenses, this month"
          />
        </div>
      )}

      {summary.isLoading ? (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard label="Total Products" value={formatNumber(s?.totalProducts ?? 0)} icon={Package} />
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
          <StatCard label="Low Stock Items" value={formatNumber(s?.lowStockCount ?? 0)} icon={AlertTriangle} tone="warning" />
          <StatCard label="Out of Stock" value={formatNumber(s?.outOfStockCount ?? 0)} icon={XCircle} tone="destructive" />
          <StatCard
            label="Pending Orders"
            value={formatNumber((s?.pendingPurchaseOrders ?? 0) + (s?.pendingSalesOrders ?? 0))}
            icon={ClipboardList}
            hint={`${s?.pendingPurchaseOrders ?? 0} PO · ${s?.pendingSalesOrders ?? 0} sales`}
          />
        </div>
      )}

      {!alerts.isLoading && hasAlerts && (
        <Card className="mt-4 border-warning/30 bg-warning/5">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle className="text-warning">Stock alerts</CardTitle>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/inventory/stock?lowStockOnly=1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {alertItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.product.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.warehouse.name} · SKU {item.product.sku}
                  </p>
                </div>
                {item.quantity === 0 ? (
                  <Badge variant="destructive">Out of stock</Badge>
                ) : (
                  <Badge variant="warning">
                    {item.quantity} left · reorder at {item.product.reorderLevel}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales over time</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {salesOverTime.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !salesOverTime.data?.length ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesOverTime.data}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} width={44} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="total" name="Sales" stroke={CHART_COLORS.revenue} fill="url(#salesGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchases over time</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {purchasesOverTime.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !purchasesOverTime.data?.length ? (
              <EmptyState title="No purchases in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={purchasesOverTime.data}>
                  <defs>
                    <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.categorical[1]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.categorical[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} width={44} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="total" name="Purchases" stroke={CHART_COLORS.categorical[1]} fill="url(#purchaseGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue vs expenses</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {revenueVsExpenses.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !revenueVsExpenses.data?.length ? (
              <EmptyState title="No financial data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueVsExpenses.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                  <YAxis tick={AXIS_STYLE} width={44} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill={CHART_COLORS.expenses} radius={[4, 4, 0, 0]} name="Expenses" />
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
                      <Cell key={i} fill={CHART_COLORS.categorical[i % CHART_COLORS.categorical.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top-selling products</CardTitle>
            <CardDescription>By units sold, last 30 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {topProducts.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !topProducts.data?.length ? (
              <EmptyState title="No sales in this period" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts.data} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
                  <XAxis type="number" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={AXIS_STYLE} width={120} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatNumber(v)} />
                  <Bar dataKey="quantitySold" fill={CHART_COLORS.revenue} radius={[0, 4, 4, 0]} name="Units sold" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : !recentActivity.data?.recentSales?.length && !recentActivity.data?.recentMovements?.length ? (
              <EmptyState title="No recent activity" description="Sales and stock movements will appear here as they happen." />
            ) : (
              <ol className="relative space-y-4 border-l border-border pl-4">
                {recentActivity.data?.recentSales?.slice(0, 3).map((s: any) => (
                  <li key={s.id} className="relative">
                    <span className="absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full bg-success" />
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.invoiceNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.customer?.name ?? 'Walk-in'} · {formatDateTime(s.createdAt)}
                        </p>
                      </div>
                      <Badge variant="success" className="shrink-0">{formatCurrency(s.total)}</Badge>
                    </div>
                  </li>
                ))}
                {recentActivity.data?.recentMovements?.slice(0, 3).map((m: any) => (
                  <li key={m.id} className="relative">
                    <span className="absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{m.product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {m.type} · {m.warehouse.name} · {formatDateTime(m.createdAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">{m.quantity}</Badge>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
