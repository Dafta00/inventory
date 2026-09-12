import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Truck, Eye } from 'lucide-react';
import { suppliersApi } from '@/api/suppliers';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import type { Supplier } from '@/api/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  taxId: z.string().optional(),
  contactPerson: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function SuppliersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.SUPPLIERS_MANAGE);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', page, search],
    queryFn: () => suppliersApi.list({ page, pageSize: 20, search: search || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', company: '', phone: '', email: '', address: '', taxId: '', contactPerson: '', paymentTerms: '', notes: '' });
    setDialogOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    reset({
      name: s.name, company: s.company ?? '', phone: s.phone ?? '', email: s.email ?? '',
      address: s.address ?? '', taxId: s.taxId ?? '', contactPerson: s.contactPerson ?? '',
      paymentTerms: s.paymentTerms ?? '', notes: s.notes ?? '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await suppliersApi.update(editing.id, values);
        toast({ title: 'Supplier updated', variant: 'success' });
      } else {
        await suppliersApi.create(values);
        toast({ title: 'Supplier created', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Something went wrong', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Supplier archived', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (err) => toast({ title: 'Could not archive supplier', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier relationships"
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New supplier</Button>}
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search suppliers..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Truck}
            title="No suppliers yet"
            description="Add a supplier to start creating purchase orders and tracking deliveries."
            action={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New supplier</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Payment terms</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.company ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.phone ?? s.email ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.paymentTerms ?? '-'}</TableCell>
                    <TableCell><Badge variant={s.status === 'ACTIVE' ? 'success' : 'secondary'}>{s.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/suppliers/${s.id}`)} aria-label="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" aria-label="Archive"
                              onClick={() => confirm({
                                title: 'Archive supplier?', destructive: true,
                                onConfirm: () => removeMutation.mutate(s.id),
                              })}
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
            <Pagination page={page} pageSize={20} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit supplier' : 'New supplier'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" error={errors.name?.message} required><Input {...register('name')} /></Field>
              <Field label="Company"><Input {...register('company')} /></Field>
              <Field label="Phone"><Input {...register('phone')} /></Field>
              <Field label="Email" error={errors.email?.message}><Input {...register('email')} /></Field>
              <Field label="Tax ID"><Input {...register('taxId')} /></Field>
              <Field label="Contact person"><Input {...register('contactPerson')} /></Field>
              <Field label="Payment terms" className="col-span-2"><Input placeholder="e.g. Net 30" {...register('paymentTerms')} /></Field>
              <Field label="Address" className="col-span-2"><Input {...register('address')} /></Field>
              <Field label="Notes" className="col-span-2"><Textarea rows={2} {...register('notes')} /></Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Save changes' : 'Create supplier'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
