import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { suppliersApi } from '@/api/suppliers';
import { warehousesApi } from '@/api/warehouses';
import { productsApi } from '@/api/products';
import { purchaseOrdersApi } from '@/api/purchasing';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/form-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';

const itemSchema = z.object({
  productId: z.string().min(1, 'Required'),
  quantity: z.coerce.number().int().positive('Must be > 0'),
  unitCost: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
});

const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});
type FormValues = z.infer<typeof schema>;

export function PurchaseOrderNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({ queryKey: ['suppliers', 'all'], queryFn: () => suppliersApi.list({ pageSize: 100 }) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });
  const { data: products } = useQuery({ queryKey: ['products', 'select'], queryFn: () => productsApi.list({ pageSize: 200 }) });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ productId: '', quantity: 1, unitCost: 0, taxRate: 0, discount: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const total = items.reduce((sum, item) => {
    const sub = (item.quantity || 0) * (item.unitCost || 0);
    const disc = item.discount || 0;
    const tax = ((sub - disc) * (item.taxRate || 0)) / 100;
    return sum + sub - disc + tax;
  }, 0);

  const onSubmit = async (values: FormValues) => {
    try {
      // A native <input type="date"> left blank submits "" rather than
      // omitting the field entirely; the backend's optional-date validator
      // only skips undefined/null, so an empty string must be stripped here.
      const payload = { ...values, expectedDate: values.expectedDate || undefined };
      const po = await purchaseOrdersApi.create(payload);
      toast({ title: `Purchase order ${po.poNumber} created`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      navigate(`/purchase-orders/${po.id}`);
    } catch (err) {
      toast({ title: 'Could not create purchase order', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/purchase-orders')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader title="New purchase order" description="Order products from a supplier" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
            <Field label="Supplier" error={errors.supplierId?.message} required>
              <Select onValueChange={(v) => setValue('supplierId', v)}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers?.items.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
            <Field label="Expected delivery date">
              <Input type="date" {...register('expectedDate')} />
            </Field>
            <Field label="Notes" className="sm:col-span-3">
              <Textarea rows={2} {...register('notes')} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            {errors.items?.message && <p className="mb-2 text-sm text-destructive">{errors.items.message}</p>}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-64">Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit cost</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Line total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const item = items[index];
                  const sub = (item?.quantity || 0) * (item?.unitCost || 0);
                  const disc = item?.discount || 0;
                  const tax = ((sub - disc) * (item?.taxRate || 0)) / 100;
                  const lineTotal = sub - disc + tax;
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Select onValueChange={(v) => setValue(`items.${index}.productId`, v)}>
                          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products?.items.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" min={1} className="w-20" {...register(`items.${index}.quantity`)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-24" {...register(`items.${index}.unitCost`)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-20" {...register(`items.${index}.taxRate`)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-24" {...register(`items.${index}.discount`)} /></TableCell>
                      <TableCell className="tabular-nums font-medium">{formatCurrency(lineTotal)}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} aria-label="Remove item">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => append({ productId: '', quantity: 1, unitCost: 0, taxRate: 0, discount: 0 })}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>

            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated total</p>
                <p className="tabular-nums text-xl font-semibold">{formatCurrency(total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Create purchase order</Button>
        </div>
      </form>
    </div>
  );
}
