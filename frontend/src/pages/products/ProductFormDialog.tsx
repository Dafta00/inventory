import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { suppliersApi } from '@/api/suppliers';
import { warehousesApi } from '@/api/warehouses';
import { productsApi } from '@/api/products';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';
import type { Brand, Category, Product } from '@/api/types';

const schema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  primarySupplierId: z.string().optional(),
  costPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  sellingPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  discount: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  minStockLevel: z.coerce.number().int().min(0).optional(),
  reorderLevel: z.coerce.number().int().min(0).optional(),
  maxStockLevel: z.coerce.number().int().min(0).optional(),
  imageUrl: z.string().optional(),
  warehouseId: z.string().optional(),
  initialQuantity: z.coerce.number().int().min(0).optional(),
});
type FormValues = z.infer<typeof schema>;

const NONE = '__none__';

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  brands,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  brands: Brand[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { data: suppliers } = useQuery({ queryKey: ['suppliers', 'all'], queryFn: () => suppliersApi.list({ pageSize: 100 }) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list, enabled: !product });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        sku: product.sku,
        barcode: product.barcode ?? '',
        name: product.name,
        description: product.description ?? '',
        categoryId: product.categoryId ?? undefined,
        brandId: product.brandId ?? undefined,
        primarySupplierId: product.primarySupplierId ?? undefined,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        discount: Number(product.discount),
        taxRate: Number(product.taxRate),
        unit: product.unit,
        minStockLevel: product.minStockLevel,
        reorderLevel: product.reorderLevel,
        maxStockLevel: product.maxStockLevel ?? undefined,
        imageUrl: product.imageUrl ?? '',
      });
    } else {
      reset({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        costPrice: 0,
        sellingPrice: 0,
        discount: 0,
        taxRate: 0,
        unit: 'pcs',
        minStockLevel: 0,
        reorderLevel: 0,
        initialQuantity: 0,
      });
    }
  }, [open, product, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: Record<string, unknown> = { ...values };
    if (!payload.sku) delete payload.sku;
    if (!payload.barcode) delete payload.barcode;
    if (!payload.initialQuantity) {
      delete payload.initialQuantity;
      delete payload.warehouseId;
    }

    try {
      if (product) {
        await productsApi.update(product.id, payload);
        toast({ title: 'Product updated', variant: 'success' });
      } else {
        await productsApi.create(payload);
        toast({ title: 'Product created', variant: 'success' });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Could not save product', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Product name" error={errors.name?.message} required className="sm:col-span-2">
                <Input {...register('name')} />
              </Field>
              <Field label="SKU" error={errors.sku?.message} hint={product ? undefined : 'Leave blank to auto-generate'}>
                <Input {...register('sku')} disabled={!!product} />
              </Field>
              <Field label="Barcode" error={errors.barcode?.message}>
                <Input {...register('barcode')} />
              </Field>
              <Field label="Description" className="sm:col-span-2">
                <Textarea rows={2} {...register('description')} />
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classification</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={watch('categoryId') ?? NONE} onValueChange={(v) => setValue('categoryId', v === NONE ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Brand">
                <Select value={watch('brandId') ?? NONE} onValueChange={(v) => setValue('brandId', v === NONE ? undefined : v)}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary supplier" className="sm:col-span-2">
                <Select
                  value={watch('primarySupplierId') ?? NONE}
                  onValueChange={(v) => setValue('primarySupplierId', v === NONE ? undefined : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {suppliers?.items.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Cost price" error={errors.costPrice?.message} required>
                <Input type="number" step="0.01" {...register('costPrice')} />
              </Field>
              <Field label="Selling price" error={errors.sellingPrice?.message} required>
                <Input type="number" step="0.01" {...register('sellingPrice')} />
              </Field>
              <Field label="Discount" error={errors.discount?.message}>
                <Input type="number" step="0.01" {...register('discount')} />
              </Field>
              <Field label="Tax rate (%)" error={errors.taxRate?.message}>
                <Input type="number" step="0.01" {...register('taxRate')} />
              </Field>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inventory</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Unit">
                <Input placeholder="pcs, kg, box..." {...register('unit')} />
              </Field>
              <Field label="Image URL">
                <Input {...register('imageUrl')} />
              </Field>

              <Field label="Minimum stock level" error={errors.minStockLevel?.message}>
                <Input type="number" {...register('minStockLevel')} />
              </Field>
              <Field label="Reorder level" error={errors.reorderLevel?.message} hint="Alerts trigger at or below this">
                <Input type="number" {...register('reorderLevel')} />
              </Field>
              <Field label="Maximum stock level" error={errors.maxStockLevel?.message}>
                <Input type="number" {...register('maxStockLevel')} />
              </Field>

              {!product && (
                <>
                  <Field label="Initial stock warehouse">
                    <Select value={watch('warehouseId') ?? NONE} onValueChange={(v) => setValue('warehouseId', v === NONE ? undefined : v)}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {warehouses?.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Initial quantity">
                    <Input type="number" {...register('initialQuantity')} />
                  </Field>
                </>
              )}
            </div>
          </section>

          <DialogFooter className="border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {product ? 'Save changes' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
