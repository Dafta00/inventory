import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/api/products';
import { warehousesApi } from '@/api/warehouses';
import { inventoryApi } from '@/api/inventory';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';

const MOVEMENT_TYPES = ['ADJUSTMENT', 'DAMAGE', 'EXPIRY', 'INITIAL_STOCK'] as const;

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  type: z.enum(MOVEMENT_TYPES),
  direction: z.enum(['increase', 'decrease']),
  quantity: z.coerce.number().int().positive('Must be greater than 0'),
  reason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function AdjustStockDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: products } = useQuery({
    queryKey: ['products', 'select'],
    queryFn: () => productsApi.list({ page: 1, pageSize: 200 }),
    enabled: open,
  });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list, enabled: open });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ADJUSTMENT', direction: 'increase' },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const quantityDelta = values.direction === 'increase' ? values.quantity : -values.quantity;
      await inventoryApi.adjust({
        productId: values.productId,
        warehouseId: values.warehouseId,
        quantityDelta,
        type: values.type,
        reason: values.reason,
      });
      toast({ title: 'Stock adjusted', variant: 'success' });
      onSaved();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast({ title: 'Could not adjust stock', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Product" error={errors.productId?.message} required>
            <Select onValueChange={(v) => setValue('productId', v)}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products?.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Warehouse" error={errors.warehouseId?.message} required>
            <Select onValueChange={(v) => setValue('warehouseId', v)}>
              <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
              <SelectContent>
                {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Movement type" error={errors.type?.message}>
              <Select value={watch('type')} onValueChange={(v) => setValue('type', v as FormValues['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Direction">
              <Select value={watch('direction')} onValueChange={(v) => setValue('direction', v as FormValues['direction'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase (stock in)</SelectItem>
                  <SelectItem value="decrease">Decrease (stock out)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Quantity" error={errors.quantity?.message} required>
            <Input type="number" min={1} {...register('quantity')} />
          </Field>
          <Field label="Reason / notes" error={errors.reason?.message}>
            <Textarea rows={2} {...register('reason')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Apply adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
