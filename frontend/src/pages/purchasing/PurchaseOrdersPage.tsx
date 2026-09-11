import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, Eye } from 'lucide-react';
import { purchaseOrdersApi } from '@/api/purchasing';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUSES = ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'COMPLETED', 'CANCELLED'];

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  SENT: 'default',
  CONFIRMED: 'default',
  PARTIALLY_RECEIVED: 'warning',
  RECEIVED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

export function PurchaseOrdersPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, status],
    queryFn: () => purchaseOrdersApi.list({ page, pageSize: 20, status: status === 'all' ? undefined : status }),
  });

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Track orders placed with suppliers"
        actions={
          hasPermission(PERMISSIONS.PURCHASES_CREATE) && (
            <Button onClick={() => navigate('/purchase-orders/new')}>
              <Plus className="h-4 w-4" /> New purchase order
            </Button>
          )
        }
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={ClipboardList} title="No purchase orders yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                    <TableCell className="font-medium">{po.supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{po.warehouse.name}</TableCell>
                    <TableCell>{po.items.length}</TableCell>
                    <TableCell>{formatCurrency(po.total)}</TableCell>
                    <TableCell><Badge variant={STATUS_TONE[po.status]}>{po.status.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(po.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/purchase-orders/${po.id}`)} aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
