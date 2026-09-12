import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { suppliersApi } from '@/api/suppliers';
import { warehousesApi } from '@/api/warehouses';
import { productsApi } from '@/api/products';
import { purchasesApi } from '@/api/purchasing';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';

const itemSchema = z.object({
  productId: z.string().min(1, 'Required'),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0),
});
const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});
type FormValues = z.infer<typeof schema>;

export function QuickPurchaseDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: string) => void;
}) {
  const { toast } = useToast();
  const { data: suppliers } = useQuery({ queryKey: ['suppliers', 'all'], queryFn: () => suppliersApi.list({ pageSize: 100 }), enabled: open });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list, enabled: open });
  const { data: products } = useQuery({ queryKey: ['products', 'select'], queryFn: () => productsApi.list({ pageSize: 200 }), enabled: open });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ productId: '', quantity: 1, unitCost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const onSubmit = async (values: FormValues) => {
    try {
      const purchase = await purchasesApi.create(values);
      toast({ title: `Purchase ${purchase.invoiceNumber} recorded`, variant: 'success' });
      onSaved(purchase.id);
      onOpenChange(false);
      reset({ items: [{ productId: '', quantity: 1, unitCost: 0 }] });
    } catch (err) {
      toast({ title: 'Could not record purchase', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Record a direct purchase</DialogTitle>
          <DialogDescription>For stock received without a formal purchase order — added to inventory immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Supplier" error={errors.supplierId?.message} required>
              <Select onValueChange={(v) => setValue('supplierId', v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>{suppliers?.items.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Warehouse" error={errors.warehouseId?.message} required>
              <Select onValueChange={(v) => setValue('warehouseId', v)}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>{warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <Select onValueChange={(v) => setValue(`items.${index}.productId`, v)}>
                    <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                    <SelectContent>{products?.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input type="number" min={1} placeholder="Qty" className="w-24" {...register(`items.${index}.quantity`)} />
                <Input type="number" step="0.01" placeholder="Unit cost" className="w-28" {...register(`items.${index}.unitCost`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Remove item">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitCost: 0 })}>
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          <Field label="Notes"><Textarea rows={2} {...register('notes')} /></Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Record purchase</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
