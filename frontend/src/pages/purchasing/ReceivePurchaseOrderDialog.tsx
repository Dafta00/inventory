import { useEffect, useState } from 'react';
import { purchaseOrdersApi } from '@/api/purchasing';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';

export function ReceivePurchaseOrderDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: any;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && purchaseOrder) {
      const initial: Record<string, number> = {};
      for (const item of purchaseOrder.items) {
        initial[item.productId] = Math.max(0, item.quantity - item.receivedQty);
      }
      setQuantities(initial);
    }
  }, [open, purchaseOrder]);

  const handleSubmit = async () => {
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantityReceived]) => ({ productId, quantityReceived }));

    if (items.length === 0) {
      toast({ title: 'Enter at least one quantity to receive', variant: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await purchaseOrdersApi.receive(purchaseOrder.id, { items });
      toast({ title: 'Items received into stock', variant: 'success' });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Could not receive items', description: getErrorMessage(err), variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!purchaseOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Receive items for {purchaseOrder.poNumber}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Ordered</TableHead>
              <TableHead>Already received</TableHead>
              <TableHead>Receive now</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrder.items.map((item: any) => {
              const remaining = item.quantity - item.receivedQty;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.receivedQty}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={remaining}
                      disabled={remaining <= 0}
                      className="w-24"
                      value={quantities[item.productId] ?? 0}
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [item.productId]: Math.min(remaining, Math.max(0, parseInt(e.target.value, 10) || 0)),
                        }))
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting}>Confirm receipt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
