import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Eye } from 'lucide-react';
import { purchasesApi } from '@/api/purchasing';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { invalidateInventoryRelated } from '@/lib/query-invalidation';
import { QuickPurchaseDialog } from './QuickPurchaseDialog';

export function PurchasesPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn: () => purchasesApi.list({ page, pageSize: 20 }),
  });

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Received goods, from purchase orders or direct restocks"
        actions={
          hasPermission(PERMISSIONS.PURCHASES_CREATE) && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Record direct purchase
            </Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={ShoppingCart} title="No purchases recorded yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Received by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{p.supplier.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.warehouse.name}</TableCell>
                    <TableCell>{p.items.length}</TableCell>
                    <TableCell>{formatCurrency(p.total)}</TableCell>
                    <TableCell className="text-muted-foreground">{p.receivedBy?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/purchases/${p.id}`)} aria-label="View">
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

      <QuickPurchaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(id) => {
          queryClient.invalidateQueries({ queryKey: ['purchases'] });
          invalidateInventoryRelated(queryClient);
          navigate(`/purchases/${id}`);
        }}
      />
    </div>
  );
}
