import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Award } from 'lucide-react';
import { brandsApi } from '@/api/brands';
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
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import type { Brand } from '@/api/types';

const schema = z.object({ name: z.string().min(1, 'Name is required'), description: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function BrandsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.BRANDS_MANAGE);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['brands', search], queryFn: () => brandsApi.list(search || undefined) });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    reset({ name: brand.name, description: brand.description ?? '' });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await brandsApi.update(editing.id, values);
        toast({ title: 'Brand updated', variant: 'success' });
      } else {
        await brandsApi.create(values);
        toast({ title: 'Brand created', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Something went wrong', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => brandsApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Brand archived', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (err) => toast({ title: 'Could not archive brand', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Brands"
        description="Manage product brands"
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New brand
            </Button>
          )
        }
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search brands..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={Award} title="No brands yet" description="Create your first brand." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>{brand.productCount ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={brand.isActive ? 'success' : 'secondary'}>{brand.isActive ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(brand)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Archive"
                          onClick={() =>
                            confirm({
                              title: 'Archive brand?',
                              description: `"${brand.name}" will be hidden from new product forms.`,
                              destructive: true,
                              onConfirm: () => removeMutation.mutate(brand.id),
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
            <DialogTitle>{editing ? 'Edit brand' : 'New brand'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Name" error={errors.name?.message} required>
              <Input {...register('name')} />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <Textarea rows={2} {...register('description')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {editing ? 'Save changes' : 'Create brand'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
