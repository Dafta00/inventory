import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, ArrowLeftRight, SlidersHorizontal, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { inventoryApi } from '@/api/inventory';
import { warehousesApi } from '@/api/warehouses';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatNumber } from '@/lib/utils';
import { invalidateInventoryRelated } from '@/lib/query-invalidation';
import { AdjustStockDialog } from './AdjustStockDialog';
import { TransferStockDialog } from './TransferStockDialog';

export function StockPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(() => searchParams.get('lowStockOnly') === '1');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'stock', warehouseId, lowStockOnly],
    queryFn: () => inventoryApi.stock({ warehouseId: warehouseId === 'all' ? undefined : warehouseId, lowStockOnly }),
  });

  const invalidate = () => invalidateInventoryRelated(queryClient);

  return (
    <div>
      <PageHeader
        title="Stock"
        description="Current stock levels across all warehouses"
        actions={
          <>
            {hasPermission(PERMISSIONS.INVENTORY_TRANSFER) && (
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowLeftRight className="h-4 w-4" /> Transfer stock
              </Button>
            )}
            {hasPermission(PERMISSIONS.INVENTORY_ADJUST) && (
              <Button onClick={() => setAdjustOpen(true)}>
                <SlidersHorizontal className="h-4 w-4" /> Adjust stock
              </Button>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All warehouses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={lowStockOnly} onCheckedChange={(v) => setLowStockOnly(!!v)} />
            Low stock only
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={Boxes} title="No stock records" description="Stock appears here once products are purchased or received." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Reorder level</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.product.name}</TableCell>
                  <TableCell className="font-mono text-xs">{row.product.sku}</TableCell>
                  <TableCell>{row.warehouse.name}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(row.quantity)} {row.product.unit}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(row.reserved)}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{row.product.reorderLevel}</TableCell>
                  <TableCell>
                    {row.isOutOfStock ? (
                      <Badge variant="destructive"><XCircle className="h-3 w-3" /> Out of stock</Badge>
                    ) : row.isLowStock ? (
                      <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Low stock</Badge>
                    ) : (
                      <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Healthy</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AdjustStockDialog open={adjustOpen} onOpenChange={setAdjustOpen} onSaved={invalidate} />
      <TransferStockDialog open={transferOpen} onOpenChange={setTransferOpen} onSaved={invalidate} />
    </div>
  );
}
