import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { customersApi } from '@/api/customers';
import { warehousesApi } from '@/api/warehouses';
import { productsApi } from '@/api/products';
import { inventoryApi } from '@/api/inventory';
import { salesApi } from '@/api/sales';
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
import { invalidateInventoryRelated } from '@/lib/query-invalidation';
import { formatCurrency } from '@/lib/utils';

const itemSchema = z.object({
  productId: z.string().min(1, 'Required'),
  quantity: z.coerce.number().int().positive('Must be > 0'),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
});

const schema = z.object({
  customerId: z.string().optional(),
  warehouseId: z.string().min(1, 'Select a warehouse'),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CREDIT']),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
});
type FormValues = z.infer<typeof schema>;

const NONE = '__walkin__';

export function SaleNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({ queryKey: ['customers', 'all'], queryFn: () => customersApi.list({ pageSize: 100 }) });
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
    defaultValues: { paymentMethod: 'CASH', items: [{ productId: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const warehouseId = watch('warehouseId');

  // Stock shown in the product picker must reflect the selected warehouse,
  // not the sum across all warehouses - otherwise a product can look
  // available here while the chosen warehouse actually has none of it.
  const { data: warehouseStock } = useQuery({
    queryKey: ['inventory', 'stock', warehouseId],
    queryFn: () => inventoryApi.stock({ warehouseId }),
    enabled: !!warehouseId,
  });
  const stockByProductId = new Map((warehouseStock ?? []).map((s) => [s.productId, s.quantity]));

  const total = items.reduce((sum, item) => {
    const sub = (item.quantity || 0) * (item.unitPrice || 0);
    const disc = item.discount || 0;
    const tax = ((sub - disc) * (item.taxRate || 0)) / 100;
    return sum + sub - disc + tax;
  }, 0);

  const selectProduct = (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId);
    const product = products?.items.find((p) => p.id === productId);
    if (product) setValue(`items.${index}.unitPrice`, Number(product.sellingPrice));
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { ...values, customerId: values.customerId === NONE ? undefined : values.customerId };
      const sale = await salesApi.create(payload);
      toast({ title: `Sale ${sale.invoiceNumber} completed`, variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      invalidateInventoryRelated(queryClient);
      navigate(`/sales/${sale.id}`);
    } catch (err) {
      toast({ title: 'Could not complete sale', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/sales')}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <PageHeader title="New sale" description="Record a new sale and reduce inventory automatically" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
            <Field label="Customer">
              <Select onValueChange={(v) => setValue('customerId', v)}>
                <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Walk-in customer</SelectItem>
                  {customers?.items.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Warehouse" error={errors.warehouseId?.message} required>
              <Select onValueChange={(v) => setValue('warehouseId', v)}>
                <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                <SelectContent>{warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Payment method">
              <Select value={watch('paymentMethod')} onValueChange={(v) => setValue('paymentMethod', v as FormValues['paymentMethod'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile money</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead>Unit price</TableHead>
                  <TableHead>Tax %</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Line total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const item = items[index];
                  const sub = (item?.quantity || 0) * (item?.unitPrice || 0);
                  const disc = item?.discount || 0;
                  const tax = ((sub - disc) * (item?.taxRate || 0)) / 100;
                  const lineTotal = sub - disc + tax;
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Select onValueChange={(v) => selectProduct(index, v)}>
                          <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                          <SelectContent>
                            {products?.items.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} (stock here: {warehouseId ? (stockByProductId.get(p.id) ?? 0) : p.totalStock ?? 0})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" min={1} className="w-20" {...register(`items.${index}.quantity`)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-24" {...register(`items.${index}.unitPrice`)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-20" {...register(`items.${index}.taxRate`)} /></TableCell>
                      <TableCell><Input type="number" step="0.01" className="w-24" {...register(`items.${index}.discount`)} /></TableCell>
                      <TableCell className="font-medium">{formatCurrency(lineTotal)}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Button
              type="button" variant="outline" size="sm" className="mt-3"
              onClick={() => append({ productId: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0 })}
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>

            <div className="mt-4 flex justify-end border-t border-border pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{formatCurrency(total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card><CardContent className="pt-5"><Field label="Notes"><Textarea rows={2} {...register('notes')} /></Field></CardContent></Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/sales')}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>Complete sale</Button>
        </div>
      </form>
    </div>
  );
}
