import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Tags } from 'lucide-react';
import { categoriesApi } from '@/api/categories';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import type { Category } from '@/api/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CategoriesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CATEGORIES_MANAGE);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => categoriesApi.list(search || undefined),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '', parentId: undefined });
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    reset({ name: category.name, description: category.description ?? '', parentId: category.parentId ?? undefined });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await categoriesApi.update(editing.id, values);
        toast({ title: 'Category updated', variant: 'success' });
      } else {
        await categoriesApi.create(values);
        toast({ title: 'Category created', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Something went wrong', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Category archived', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => toast({ title: 'Could not archive category', description: getErrorMessage(err), variant: 'error' }),
  });

  const parentOptions = (data ?? []).filter((c) => c.id !== editing?.id);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your products into categories"
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New category
            </Button>
          )
        }
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search categories..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={Tags} title="No categories yet" description="Create your first category to organize products." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(category as any).parent?.name ?? '-'}
                  </TableCell>
                  <TableCell>{category.productCount ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={category.isActive ? 'success' : 'secondary'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(category)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Archive"
                          onClick={() =>
                            confirm({
                              title: 'Archive category?',
                              description: `"${category.name}" will be hidden from new product forms.`,
                              destructive: true,
                              onConfirm: () => removeMutation.mutate(category.id),
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Name" error={errors.name?.message} required>
              <Input {...register('name')} />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <Textarea rows={2} {...register('description')} />
            </Field>
            <Field label="Parent category" error={errors.parentId?.message}>
              <Select value={watch('parentId') ?? 'none'} onValueChange={(v) => setValue('parentId', v === 'none' ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? 'Save changes' : 'Create category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
