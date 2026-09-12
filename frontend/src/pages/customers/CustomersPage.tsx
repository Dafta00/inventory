import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, Users2, Eye } from 'lucide-react';
import { customersApi } from '@/api/customers';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getErrorMessage } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import type { Customer } from '@/api/types';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  type: z.enum(['RETAIL', 'WHOLESALE', 'CORPORATE']),
  creditLimit: z.coerce.number().min(0).optional(),
});
type FormValues = z.infer<typeof schema>;

export function CustomersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.CUSTOMERS_MANAGE);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersApi.list({ page, pageSize: 20, search: search || undefined }),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { type: 'RETAIL' } });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', company: '', phone: '', email: '', address: '', type: 'RETAIL', creditLimit: 0 });
    setDialogOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    reset({
      name: c.name, company: c.company ?? '', phone: c.phone ?? '', email: c.email ?? '',
      address: c.address ?? '', type: c.type, creditLimit: Number(c.creditLimit),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await customersApi.update(editing.id, values);
        toast({ title: 'Customer updated', variant: 'success' });
      } else {
        await customersApi.create(values);
        toast({ title: 'Customer created', variant: 'success' });
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Something went wrong', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Customer archived', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err) => toast({ title: 'Could not archive customer', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer relationships"
        actions={canManage && <Button onClick={openCreate}><Plus className="h-4 w-4" /> New customer</Button>}
      />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={Users2}
            title="No customers yet"
            description="Add a customer to start tracking their purchase history, credit limit, and outstanding balance."
            action={canManage && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> New customer</Button>}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Credit limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? c.email ?? '-'}</TableCell>
                    <TableCell className="tabular-nums">{Number(c.creditLimit) > 0 ? formatCurrency(c.creditLimit) : '-'}</TableCell>
                    <TableCell><Badge variant={c.status === 'ACTIVE' ? 'success' : 'secondary'}>{c.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/customers/${c.id}`)} aria-label="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" aria-label="Archive"
                              onClick={() => confirm({ title: 'Archive customer?', destructive: true, onConfirm: () => removeMutation.mutate(c.id) })}
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
          <DialogHeader><DialogTitle>{editing ? 'Edit customer' : 'New customer'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name" error={errors.name?.message} required><Input {...register('name')} /></Field>
              <Field label="Company"><Input {...register('company')} /></Field>
              <Field label="Phone"><Input {...register('phone')} /></Field>
              <Field label="Email" error={errors.email?.message}><Input {...register('email')} /></Field>
              <Field label="Customer type">
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v as FormValues['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETAIL">Retail</SelectItem>
                    <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                    <SelectItem value="CORPORATE">Corporate</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Credit limit"><Input type="number" step="0.01" {...register('creditLimit')} /></Field>
              <Field label="Address" className="col-span-2"><Input {...register('address')} /></Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Save changes' : 'Create customer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
