import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, Undo2 } from 'lucide-react';
import { purchaseReturnsApi, purchasesApi } from '@/api/purchasing';
import { invalidateInventoryRelated } from '@/lib/query-invalidation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import { formatCurrency, formatDate } from '@/lib/utils';

const REASONS = ['DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'EXPIRED', 'OTHER'];

export function PurchaseReturnsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [params] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(!!params.get('purchaseId'));
  const [purchaseId, setPurchaseId] = useState(params.get('purchaseId') ?? '');
  const [returnItems, setReturnItems] = useState<Record<string, { checked: boolean; quantity: number; reason: string }>>({});
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-returns', page],
    queryFn: () => purchaseReturnsApi.list({ page, pageSize: 20 }),
  });

  const { data: recentPurchases } = useQuery({
    queryKey: ['purchases', 'select'],
    queryFn: () => purchasesApi.list({ page: 1, pageSize: 50 }),
    enabled: dialogOpen,
  });

  const { data: purchase } = useQuery({
    queryKey: ['purchases', purchaseId],
    queryFn: () => purchasesApi.get(purchaseId),
    enabled: !!purchaseId,
  });

  useEffect(() => {
    if (purchase) {
      const initial: Record<string, { checked: boolean; quantity: number; reason: string }> = {};
      for (const item of purchase.items) {
        initial[item.productId] = { checked: false, quantity: item.quantity, reason: 'DAMAGED' };
      }
      setReturnItems(initial);
    }
  }, [purchase]);

  const createMutation = useMutation({
    mutationFn: () =>
      purchaseReturnsApi.create({
        purchaseId,
        notes,
        items: Object.entries(returnItems)
          .filter(([, v]) => v.checked && v.quantity > 0)
          .map(([productId, v]) => ({
            productId,
            quantity: v.quantity,
            unitCost: purchase.items.find((i: any) => i.productId === productId)?.unitCost,
            reason: v.reason,
          })),
      }),
    onSuccess: () => {
      toast({ title: 'Purchase return created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      invalidateInventoryRelated(queryClient);
      setDialogOpen(false);
      setPurchaseId('');
    },
    onError: (err) => toast({ title: 'Could not create return', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Purchase Returns"
        description="Return products back to suppliers"
        actions={
          hasPermission(PERMISSIONS.PURCHASES_RETURN) && (
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New return</Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Undo2}
            title="No purchase returns yet"
            description="Return damaged, defective, or incorrect items back to a supplier — stock is deducted and a refund total is recorded."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Original purchase</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Refund total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.returnNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{r.purchase.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{r.supplier.name}</TableCell>
                    <TableCell className="tabular-nums font-medium">{formatCurrency(r.refundTotal)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={20} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New purchase return</DialogTitle>
            <DialogDescription>Checked items are deducted from warehouse stock and refunded at their original unit cost.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Purchase" required>
              <Select value={purchaseId} onValueChange={setPurchaseId}>
                <SelectTrigger><SelectValue placeholder="Select a purchase" /></SelectTrigger>
                <SelectContent>
                  {recentPurchases?.items.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.invoiceNumber} - {p.supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {purchase && (
              <div className="rounded-md border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">{purchase.supplier.name}</span>
                  <span className="text-muted-foreground">{purchase.warehouse.name} · {formatDate(purchase.createdAt)}</span>
                </div>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Product</TableHead>
                    <TableHead>Purchased qty</TableHead>
                    <TableHead>Return qty</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Checkbox
                          checked={returnItems[item.productId]?.checked ?? false}
                          onCheckedChange={(v) =>
                            setReturnItems((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], checked: !!v } }))
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{item.product.name}</TableCell>
                      <TableCell className="tabular-nums">{item.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={item.quantity}
                          className="w-20"
                          value={returnItems[item.productId]?.quantity ?? item.quantity}
                          onChange={(e) =>
                            setReturnItems((prev) => ({
                              ...prev,
                              [item.productId]: { ...prev[item.productId], quantity: parseInt(e.target.value, 10) || 0 },
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={returnItems[item.productId]?.reason ?? 'DAMAGED'}
                          onValueChange={(v) =>
                            setReturnItems((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], reason: v } }))
                          }
                        >
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REASONS.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            )}

            <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!purchaseId}>
              Create return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
