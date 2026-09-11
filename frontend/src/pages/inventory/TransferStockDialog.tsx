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

const schema = z
  .object({
    productId: z.string().min(1, 'Select a product'),
    fromWarehouseId: z.string().min(1, 'Select a source warehouse'),
    toWarehouseId: z.string().min(1, 'Select a destination warehouse'),
    quantity: z.coerce.number().int().positive('Must be greater than 0'),
    notes: z.string().optional(),
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: 'Source and destination must differ',
    path: ['toWarehouseId'],
  });
type FormValues = z.infer<typeof schema>;

export function TransferStockDialog({
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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await inventoryApi.transfer(values);
      toast({ title: 'Stock transferred', variant: 'success' });
      onSaved();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast({ title: 'Could not transfer stock', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer stock between warehouses</DialogTitle>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="From warehouse" error={errors.fromWarehouseId?.message} required>
              <Select onValueChange={(v) => setValue('fromWarehouseId', v)}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="To warehouse" error={errors.toWarehouseId?.message} required>
              <Select onValueChange={(v) => setValue('toWarehouseId', v)}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>
                  {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Quantity" error={errors.quantity?.message} required>
            <Input type="number" min={1} {...register('quantity')} />
          </Field>
          <Field label="Notes" error={errors.notes?.message}>
            <Textarea rows={2} {...register('notes')} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Transfer stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
