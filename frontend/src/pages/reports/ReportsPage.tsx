import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { reportsApi } from '@/api/reports';
import { warehousesApi } from '@/api/warehouses';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DollarSign, Package, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';

export function ReportsPage() {
  const { hasPermission } = useAuth();
  const canExport = hasPermission(PERMISSIONS.REPORTS_EXPORT);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [warehouseId, setWarehouseId] = useState('all');

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });

  const filters = { from: from || undefined, to: to || undefined, warehouseId: warehouseId === 'all' ? undefined : warehouseId };

  const inventoryReport = useQuery({ queryKey: ['reports', 'inventory', filters], queryFn: () => reportsApi.inventory(filters) });
  const salesReport = useQuery({ queryKey: ['reports', 'sales', filters], queryFn: () => reportsApi.sales(filters) });
  const purchaseReport = useQuery({ queryKey: ['reports', 'purchases', filters], queryFn: () => reportsApi.purchases(filters) });
  const profitLoss = useQuery({ queryKey: ['reports', 'profit-loss', filters], queryFn: () => reportsApi.profitLoss(filters) });
  const stockValuation = useQuery({ queryKey: ['reports', 'stock-valuation', filters], queryFn: () => reportsApi.stockValuation(filters) });

  return (
    <div>
      <PageHeader title="Reports" description="Business insights and exportable reports" />

      <Card className="mb-4">
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
        </CardContent>
      </Card>

      <Tabs defaultValue="inventory">
        <TabsList>
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
            <Card>
              <CardContent className="space-y-3 pt-5 max-w-md">
                <Row label="Revenue" value={profitLoss.data?.revenue} />
                <Row label="Cost of goods sold" value={-(profitLoss.data?.cogs ?? 0)} />
                <Row label="Gross profit" value={profitLoss.data?.grossProfit} bold />
                <Row label="Operating expenses" value={-(profitLoss.data?.totalExpenses ?? 0)} />
                <Row label="Net profit" value={profitLoss.data?.netProfit} bold border />
              </CardContent>
            </Card>
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

function Row({ label, value, bold, border }: { label: string; value?: number; bold?: boolean; border?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${border ? 'border-t border-border pt-2' : ''} ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={Number(value) < 0 ? 'text-destructive' : ''}>{formatCurrency(value ?? 0)}</span>
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
      <div className="flex justify-end border-b border-border p-3">
        {canExport && (
          <Button variant="outline" size="sm" onClick={onExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="No data for the selected filters" />
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
                    <TableCell key={c.key}>{c.format ? c.format(row[c.key]) : row[c.key]}</TableCell>
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
