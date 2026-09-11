import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Package, Archive } from 'lucide-react';
import { productsApi, type ProductQuery } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { brandsApi } from '@/api/brands';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { invalidateInventoryRelated } from '@/lib/query-invalidation';
import type { Product } from '@/api/types';
import { ProductFormDialog } from './ProductFormDialog';

export function ProductsPage() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission(PERMISSIONS.PRODUCTS_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRODUCTS_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PRODUCTS_DELETE);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [brandId, setBrandId] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const query: ProductQuery = {
    page,
    pageSize: 20,
    search: search || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId,
    brandId: brandId === 'all' ? undefined : brandId,
    lowStockOnly: lowStockOnly || undefined,
  };

  const { data, isLoading } = useQuery({ queryKey: ['products', query], queryFn: () => productsApi.list(query) });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });

  const removeMutation = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Product archived', variant: 'success' });
      invalidateInventoryRelated(queryClient);
    },
    onError: (err) => toast({ title: 'Could not archive product', description: getErrorMessage(err), variant: 'error' }),
  });

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => productsApi.bulkArchive(ids),
    onSuccess: (res) => {
      toast({ title: `Archived ${res.archived} product(s)`, variant: 'success' });
      setSelected(new Set());
      invalidateInventoryRelated(queryClient);
    },
    onError: (err) => toast({ title: 'Bulk archive failed', description: getErrorMessage(err), variant: 'error' }),
  });

  const allSelected = useMemo(
    () => (data?.items.length ?? 0) > 0 && data!.items.every((p) => selected.has(p.id)),
    [data, selected],
  );

  const toggleAll = () => {
    if (!data) return;
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(data.items.map((p) => p.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        actions={
          <>
            {canDelete && selected.size > 0 && (
              <Button
                variant="outline"
                onClick={() =>
                  confirm({
                    title: `Archive ${selected.size} product(s)?`,
                    destructive: true,
                    onConfirm: () => bulkArchiveMutation.mutate(Array.from(selected)),
                  })
                }
              >
                <Archive className="h-4 w-4" /> Archive selected ({selected.size})
              </Button>
            )}
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New product
              </Button>
            )}
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, SKU, barcode..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandId} onValueChange={(v) => { setBrandId(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={lowStockOnly} onCheckedChange={(v) => { setLowStockOnly(!!v); setPage(1); }} />
            Low stock only
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState icon={Package} title="No products found" description="Try adjusting your filters, or add a new product." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {canDelete && (
                    <TableHead className="w-8">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
                    </TableHead>
                  )}
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((product) => (
                  <TableRow key={product.id}>
                    {canDelete && (
                      <TableCell>
                        <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleOne(product.id)} />
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.category?.name ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{product.brand?.name ?? '-'}</TableCell>
                    <TableCell>{formatCurrency(product.costPrice)}</TableCell>
                    <TableCell>{formatCurrency(product.sellingPrice)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {formatNumber(product.totalStock ?? 0)}
                        {product.isOutOfStock && <Badge variant="destructive">Out</Badge>}
                        {!product.isOutOfStock && product.isLowStock && <Badge variant="warning">Low</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>{product.status}</Badge>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(product)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Archive"
                              onClick={() =>
                                confirm({
                                  title: 'Archive product?',
                                  description: `"${product.name}" will no longer appear in sales or purchasing.`,
                                  destructive: true,
                                  onConfirm: () => removeMutation.mutate(product.id),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={20} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        categories={categories ?? []}
        brands={brands ?? []}
        onSaved={() => invalidateInventoryRelated(queryClient)}
      />

      {dialog}
    </div>
  );
}
