import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PackageCheck } from 'lucide-react';
import { purchaseOrdersApi } from '@/api/purchasing';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { invalidateInventoryRelated } from '@/lib/query-invalidation';
import { ReceivePurchaseOrderDialog } from './ReceivePurchaseOrderDialog';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary', SENT: 'default', CONFIRMED: 'default',
  PARTIALLY_RECEIVED: 'warning', RECEIVED: 'success', COMPLETED: 'success', CANCELLED: 'destructive',
};

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data: po, isLoading } = useQuery({ queryKey: ['purchase-orders', id], queryFn: () => purchaseOrdersApi.get(id) });

  const statusMutation = useMutation({
    mutationFn: (status: string) => purchaseOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      toast({ title: 'Status updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
    },
    onError: (err) => toast({ title: 'Could not update status', description: getErrorMessage(err), variant: 'error' }),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!po) return <EmptyState title="Purchase order not found" />;

  const canReceive = hasPermission(PERMISSIONS.PURCHASES_RECEIVE) && ['SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED'].includes(po.status);

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/purchase-orders')}>
        <ArrowLeft className="h-4 w-4" /> Back to purchase orders
      </Button>
      <PageHeader
        title={po.poNumber}
        description={`${po.supplier.name} · ${po.warehouse.name}`}
        actions={
          <>
            <Badge variant={STATUS_TONE[po.status]} className="text-sm px-3 py-1">{po.status.replace(/_/g, ' ')}</Badge>
            {hasPermission(PERMISSIONS.PURCHASES_CREATE) && po.status === 'DRAFT' && (
              <Button variant="outline" onClick={() => statusMutation.mutate('SENT')}>Mark as sent</Button>
            )}
            {hasPermission(PERMISSIONS.PURCHASES_CREATE) && po.status === 'SENT' && (
              <Button variant="outline" onClick={() => statusMutation.mutate('CONFIRMED')}>Mark as confirmed</Button>
            )}
            {hasPermission(PERMISSIONS.PURCHASES_CREATE) && ['DRAFT', 'SENT', 'CONFIRMED'].includes(po.status) && (
              <Button variant="outline" onClick={() => statusMutation.mutate('CANCELLED')}>Cancel</Button>
            )}
            {canReceive && (
              <Button onClick={() => setReceiveOpen(true)}>
                <PackageCheck className="h-4 w-4" /> Receive items
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Unit cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    {item.receivedQty} / {item.quantity}
                    {item.receivedQty >= item.quantity && <Badge variant="success" className="ml-2">Complete</Badge>}
                  </TableCell>
                  <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(po.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(po.discountTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(po.taxTotal)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{formatCurrency(po.total)}</span></div>
            <div className="flex justify-between pt-2"><span className="text-muted-foreground">Expected date</span><span>{po.expectedDate ? formatDate(po.expectedDate) : '-'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(po.createdAt)}</span></div>
          </CardContent>
        </Card>
      </div>

      {po.purchases?.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>Receiving history</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {po.purchases.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs cursor-pointer text-primary" onClick={() => navigate(`/purchases/${p.id}`)}>
                    {p.invoiceNumber}
                  </TableCell>
                  <TableCell>{formatDate(p.createdAt)}</TableCell>
                  <TableCell>{formatCurrency(p.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReceivePurchaseOrderDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        purchaseOrder={po}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
          queryClient.invalidateQueries({ queryKey: ['purchases'] });
          invalidateInventoryRelated(queryClient);
        }}
      />
    </div>
  );
}
