import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Warehouse as WarehouseIcon, Eye } from 'lucide-react';
import { warehousesApi } from '@/api/warehouses';
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
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import type { Warehouse } from '@/api/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

export function WarehousesPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.WAREHOUSES_MANAGE);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', code: '', address: '', phone: '', email: '' });
    setDialogOpen(true);
  };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    reset({ name: w.name, code: w.code, address: w.address ?? '', phone: w.phone ?? '', email: w.email ?? '' });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await warehousesApi.update(editing.id, values);
        toast({ title: 'Warehouse updated', variant: 'success' });
      } else {
        await warehousesApi.create(values);
        toast({ title: 'Warehouse created', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Something went wrong', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Warehouse deactivated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
    },
    onError: (err) => toast({ title: 'Could not deactivate warehouse', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Warehouses"
        description="Manage your storage locations"
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New warehouse</Button>}
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState icon={WarehouseIcon} title="No warehouses yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="font-mono text-xs">{w.code}</TableCell>
                  <TableCell className="text-muted-foreground">{w.manager?.name ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{w.phone ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={w.status === 'ACTIVE' ? 'success' : 'secondary'}>{w.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/warehouses/${w.id}`)} aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(w)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Deactivate"
                            onClick={() =>
                              confirm({
                                title: 'Deactivate warehouse?',
                                description: `"${w.name}" must have zero stock to be deactivated.`,
                                destructive: true,
                                onConfirm: () => removeMutation.mutate(w.id),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit warehouse' : 'New warehouse'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" error={errors.name?.message} required>
                <Input {...register('name')} />
              </Field>
              <Field label="Code" error={errors.code?.message} required>
                <Input {...register('code')} />
              </Field>
            </div>
            <Field label="Address" error={errors.address?.message}>
              <Input {...register('address')} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Phone" error={errors.phone?.message}>
                <Input {...register('phone')} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input {...register('email')} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Save changes' : 'Create warehouse'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
