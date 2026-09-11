import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Plus, RotateCcw } from 'lucide-react';
import { salesApi, salesReturnsApi } from '@/api/sales';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { invalidateInventoryRelated } from '@/lib/query-invalidation';

const REASONS = ['DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'EXPIRED', 'CUSTOMER_CHANGE_OF_MIND', 'OTHER'];

export function SalesReturnsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [params] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(!!params.get('saleId'));
  const [saleId, setSaleId] = useState(params.get('saleId') ?? '');
  const [returnItems, setReturnItems] = useState<Record<string, { checked: boolean; quantity: number; reason: string; restock: boolean }>>({});
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['sales-returns', page], queryFn: () => salesReturnsApi.list({ page, pageSize: 20 }) });
  const { data: recentSales } = useQuery({ queryKey: ['sales', 'select'], queryFn: () => salesApi.list({ page: 1, pageSize: 50 }), enabled: dialogOpen });
  const { data: sale } = useQuery({ queryKey: ['sales', saleId], queryFn: () => salesApi.get(saleId), enabled: !!saleId });

  useEffect(() => {
    if (sale) {
      const initial: Record<string, { checked: boolean; quantity: number; reason: string; restock: boolean }> = {};
      for (const item of sale.items) {
        initial[item.productId] = { checked: false, quantity: item.quantity, reason: 'CUSTOMER_CHANGE_OF_MIND', restock: true };
      }
      setReturnItems(initial);
    }
  }, [sale]);

  const createMutation = useMutation({
    mutationFn: () =>
      salesReturnsApi.create({
        saleId,
        notes,
        items: Object.entries(returnItems)
          .filter(([, v]) => v.checked && v.quantity > 0)
          .map(([productId, v]) => ({
            productId,
            quantity: v.quantity,
            unitPrice: sale.items.find((i: any) => i.productId === productId)?.unitPrice,
            reason: v.reason,
            restock: v.restock,
          })),
      }),
    onSuccess: () => {
      toast({ title: 'Sales return created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['sales-returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      invalidateInventoryRelated(queryClient);
      setDialogOpen(false);
      setSaleId('');
    },
    onError: (err) => toast({ title: 'Could not create return', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Sales Returns"
        description="Process customer returns and refunds"
        actions={
          hasPermission(PERMISSIONS.SALES_REFUND) && (
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New return</Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={RotateCcw} title="No sales returns yet" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Refund total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.returnNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{r.sale.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{r.customer?.name ?? 'Walk-in'}</TableCell>
                    <TableCell>{formatCurrency(r.refundTotal)}</TableCell>
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
          <DialogHeader><DialogTitle>New sales return</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Field label="Sale" required>
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger><SelectValue placeholder="Select a sale" /></SelectTrigger>
                <SelectContent>
                  {recentSales?.items.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.invoiceNumber} - {s.customer?.name ?? 'Walk-in'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {sale && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Product</TableHead>
                    <TableHead>Sold qty</TableHead>
                    <TableHead>Return qty</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Restock?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map((item: any) => (
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
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number" min={1} max={item.quantity} className="w-20"
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
                          value={returnItems[item.productId]?.reason ?? 'CUSTOMER_CHANGE_OF_MIND'}
                          onValueChange={(v) => setReturnItems((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], reason: v } }))}
                        >
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {REASONS.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={returnItems[item.productId]?.restock ?? true}
                          onCheckedChange={(v) =>
                            setReturnItems((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], restock: !!v } }))
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!saleId}>
              Create return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
