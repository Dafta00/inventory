import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { inventoryApi } from '@/api/inventory';
import { warehousesApi } from '@/api/warehouses';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime, formatNumber } from '@/lib/utils';

const TYPES = [
  'PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'DAMAGE', 'EXPIRY', 'INITIAL_STOCK',
];

const TYPE_TONE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PURCHASE: 'success',
  SALE: 'default',
  SALE_RETURN: 'warning',
  PURCHASE_RETURN: 'warning',
  ADJUSTMENT: 'secondary',
  TRANSFER_IN: 'success',
  TRANSFER_OUT: 'destructive',
  DAMAGE: 'destructive',
  EXPIRY: 'destructive',
  INITIAL_STOCK: 'secondary',
};

export function MovementsPage() {
  const [page, setPage] = useState(1);
  const [warehouseId, setWarehouseId] = useState('all');
  const [type, setType] = useState('all');

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'movements', page, warehouseId, type],
    queryFn: () =>
      inventoryApi.movements({
        page,
        pageSize: 20,
        warehouseId: warehouseId === 'all' ? undefined : warehouseId,
        type: type === 'all' ? undefined : type,
      }),
  });

  return (
    <div>
      <PageHeader title="Stock Movements" description="Complete audit trail of every inventory change" />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Select value={warehouseId} onValueChange={(v) => { setWarehouseId(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All warehouses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={(v) => { setType(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={ArrowLeftRight} title="No stock movements yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Before → After</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className="font-medium">{m.product.name}</TableCell>
                    <TableCell>
                      {m.warehouse.name}
                      {m.transferTo && <span className="text-muted-foreground"> → {m.transferTo.name}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_TONE[m.type] ?? 'default'}>{m.type}</Badge>
                    </TableCell>
                    <TableCell>{formatNumber(m.quantity)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.previousQuantity} → {m.newQuantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.reference ?? m.reason ?? '-'}</TableCell>
                    <TableCell>{m.user.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={20} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
