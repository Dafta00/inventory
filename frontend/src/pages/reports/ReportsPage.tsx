import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, X } from 'lucide-react';
import { reportsApi } from '@/api/reports';
import { warehousesApi } from '@/api/warehouses';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { CHART_COLORS } from '@/lib/chart-colors';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DollarSign, Package, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

const AXIS_STYLE = { fontSize: 11, fill: CHART_COLORS.axis };
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid hsl(var(--border))',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  fontSize: 13,
};

/** Buckets already-fetched report rows by their `date` (YYYY-MM-DD) and sums `total`. Real data only — no series is invented. */
function useDailyTotals(rows: { date: string; total: number }[] | undefined) {
  return useMemo(() => {
    if (!rows?.length) return [];
    const byDate = new Map<string, number>();
    for (const row of rows) byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.total);
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));
  }, [rows]);
}

export function ReportsPage() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission(PERMISSIONS.REPORTS_EXPORT);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouseId, setWarehouseId] = useState('all');

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });

  const filters = { from: from || undefined, to: to || undefined, warehouseId: warehouseId === 'all' ? undefined : warehouseId };
  const hasActiveFilters = Boolean(from || to || warehouseId !== 'all');
  const resetFilters = () => {
    setFrom('');
    setTo('');
    setWarehouseId('all');
  };

  const inventoryReport = useQuery({ queryKey: ['reports', 'inventory', filters], queryFn: () => reportsApi.inventory(filters) });
  const salesReport = useQuery({ queryKey: ['reports', 'sales', filters], queryFn: () => reportsApi.sales(filters) });
  const purchaseReport = useQuery({ queryKey: ['reports', 'purchases', filters], queryFn: () => reportsApi.purchases(filters) });
  const profitLoss = useQuery({ queryKey: ['reports', 'profit-loss', filters], queryFn: () => reportsApi.profitLoss(filters) });
  const stockValuation = useQuery({ queryKey: ['reports', 'stock-valuation', filters], queryFn: () => reportsApi.stockValuation(filters) });

  const salesByDay = useDailyTotals(salesReport.data?.rows);
  const purchasesByDay = useDailyTotals(purchaseReport.data?.rows);

  const netProfit = Number(profitLoss.data?.netProfit ?? 0);
  const isProfitable = netProfit >= 0;

  return (
    <div>
      <PageHeader title="Reports" description="Business insights and exportable reports" />

      <Card className="mb-4 print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 pt-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Warehouse</label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="h-3.5 w-3.5" /> Reset filters
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="inventory">
        <TabsList className="print:hidden">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="valuation">Stock Valuation</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {inventoryReport.isLoading ? <Skeleton className="h-64" /> : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Total units" value={formatNumber(inventoryReport.data?.totals.totalUnits ?? 0)} icon={Package} />
                <StatCard label="Stock value" value={formatCurrency(inventoryReport.data?.totals.totalValue ?? 0)} icon={DollarSign} />
                <StatCard label="Low stock" value={formatNumber(inventoryReport.data?.totals.lowStockCount ?? 0)} icon={AlertTriangle} tone="warning" />
                <StatCard label="Out of stock" value={formatNumber(inventoryReport.data?.totals.outOfStockCount ?? 0)} icon={AlertTriangle} tone="destructive" />
              </div>
              <ReportTable
                canExport={canExport}
                onExport={() => reportsApi.downloadCsv('inventory', filters)}
                rows={inventoryReport.data?.rows ?? []}
                columns={[
                  { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Name' }, { key: 'category', label: 'Category' },
                  { key: 'warehouse', label: 'Warehouse' }, { key: 'quantity', label: 'Qty' },
                  { key: 'stockValue', label: 'Value', format: formatCurrency }, { key: 'status', label: 'Status' },
                ]}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="sales">
          {salesReport.isLoading ? <Skeleton className="h-64" /> : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatCard label="Total sales" value={formatNumber(salesReport.data?.totals.totalSales ?? 0)} icon={TrendingUp} />
                <StatCard label="Revenue" value={formatCurrency(salesReport.data?.totals.totalRevenue ?? 0)} icon={DollarSign} />
                <StatCard label="Units sold" value={formatNumber(salesReport.data?.totals.totalQuantitySold ?? 0)} icon={Package} />
              </div>
              {salesByDay.length > 1 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Revenue by day</CardTitle>
                    <CardDescription>Derived from the filtered sales below</CardDescription>
                  </CardHeader>
                  <CardContent className="h-56 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesByDay}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                        <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} width={48} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(v)} />
                        <Bar dataKey="total" name="Revenue" fill={CHART_COLORS.revenue} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <ReportTable
                canExport={canExport}
                onExport={() => reportsApi.downloadCsv('sales', filters)}
                rows={salesReport.data?.rows ?? []}
                columns={[
                  { key: 'invoiceNumber', label: 'Invoice' }, { key: 'date', label: 'Date' }, { key: 'customer', label: 'Customer' },
                  { key: 'staff', label: 'Staff' }, { key: 'itemCount', label: 'Items' }, { key: 'total', label: 'Total', format: formatCurrency },
                ]}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="purchases">
          {purchaseReport.isLoading ? <Skeleton className="h-64" /> : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
                <StatCard label="Total purchases" value={formatNumber(purchaseReport.data?.totals.totalPurchases ?? 0)} icon={TrendingDown} />
                <StatCard label="Total spent" value={formatCurrency(purchaseReport.data?.totals.totalSpent ?? 0)} icon={DollarSign} />
              </div>
              {purchasesByDay.length > 1 && (
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle>Spend by day</CardTitle>
                    <CardDescription>Derived from the filtered purchases below</CardDescription>
                  </CardHeader>
                  <CardContent className="h-56 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={purchasesByDay}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                        <XAxis dataKey="date" tick={AXIS_STYLE} tickFormatter={(v) => v.slice(5)} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
                        <YAxis tick={AXIS_STYLE} width={48} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => formatCurrency(v)} />
                        <Bar dataKey="total" name="Spend" fill={CHART_COLORS.expenses} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              <ReportTable
                canExport={canExport}
                onExport={() => reportsApi.downloadCsv('purchases', filters)}
                rows={purchaseReport.data?.rows ?? []}
                columns={[
                  { key: 'invoiceNumber', label: 'Invoice' }, { key: 'date', label: 'Date' }, { key: 'supplier', label: 'Supplier' },
                  { key: 'itemCount', label: 'Items' }, { key: 'total', label: 'Total', format: formatCurrency },
                ]}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="profit-loss">
          {profitLoss.isLoading ? <Skeleton className="h-64" /> : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Statement</CardTitle>
                  <CardDescription>For the selected period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  <StatementRow label="Revenue" value={profitLoss.data?.revenue} />
                  <StatementRow label="Cost of goods sold" value={-(profitLoss.data?.cogs ?? 0)} />
                  <StatementRow label="Gross profit" value={profitLoss.data?.grossProfit} emphasis border />
                  <StatementRow label="Operating expenses" value={-(profitLoss.data?.totalExpenses ?? 0)} />
                </CardContent>
              </Card>

              <Card className={`lg:col-span-2 ${isProfitable ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5'}`}>
                <CardContent className="flex h-full flex-col justify-center gap-2 pt-5">
                  <div className="flex items-center gap-2">
                    {isProfitable ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <p className={`text-sm font-medium ${isProfitable ? 'text-success' : 'text-destructive'}`}>
                      {isProfitable ? 'Net profit' : 'Net loss'}
                    </p>
                  </div>
                  <p className={`text-4xl font-bold tabular-nums tracking-tight ${isProfitable ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(Math.abs(netProfit))}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue minus cost of goods sold and operating expenses.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="valuation">
          {stockValuation.isLoading ? <Skeleton className="h-64" /> : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2">
                <StatCard label="Cost value" value={formatCurrency(stockValuation.data?.totals.totalCostValue ?? 0)} icon={DollarSign} />
                <StatCard label="Retail value" value={formatCurrency(stockValuation.data?.totals.totalRetailValue ?? 0)} icon={DollarSign} />
              </div>
              <ReportTable
                canExport={canExport}
                onExport={() => reportsApi.downloadCsv('stock-valuation', filters)}
                rows={stockValuation.data?.rows ?? []}
                columns={[
                  { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Name' }, { key: 'warehouse', label: 'Warehouse' },
                  { key: 'quantity', label: 'Qty' }, { key: 'costValue', label: 'Cost value', format: formatCurrency },
                  { key: 'retailValue', label: 'Retail value', format: formatCurrency },
                ]}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatementRow({ label, value, emphasis, border }: { label: string; value?: number; emphasis?: boolean; border?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between py-1.5 text-sm ${border ? 'border-t border-border pt-2.5' : ''} ${emphasis ? 'font-semibold' : ''}`}>
      <span className={emphasis ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={`tabular-nums ${Number(value) < 0 ? 'text-destructive' : ''}`}>{formatCurrency(value ?? 0)}</span>
    </div>
  );
}

function ReportTable({
  rows,
  columns,
  canExport,
  onExport,
}: {
  rows: Record<string, any>[];
  columns: { key: string; label: string; format?: (v: any) => string }[];
  canExport: boolean;
  onExport: () => void;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-border p-3 print:hidden">
        <p className="text-xs text-muted-foreground">{formatNumber(rows.length)} row{rows.length === 1 ? '' : 's'}</p>
        {canExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No data for the selected filters" description="Try widening the date range or clearing the warehouse filter." />
      ) : (
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>{columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key} className={typeof row[c.key] === 'number' || c.format ? 'tabular-nums' : undefined}>
                      {c.format ? c.format(row[c.key]) : row[c.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
