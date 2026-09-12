import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, UserCog, KeyRound } from 'lucide-react';
import { usersApi } from '@/api/users';
import { rolesApi } from '@/api/roles';
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
import { getErrorMessage } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import type { AppUser } from '@/api/types';

const createSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Must be at least 8 characters'),
  roleId: z.string().min(1, 'Select a role'),
});
const editSchema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().optional(),
  roleId: z.string().min(1, 'Select a role'),
  status: z.enum(['ACTIVE', 'DISABLED']),
});
type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [editing, setEditing] = useState<AppUser | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['users', page, search], queryFn: () => usersApi.list({ page, pageSize: 20, search: search || undefined }) });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  const openCreate = () => {
    setEditing(null);
    createForm.reset({ name: '', email: '', phone: '', password: '', roleId: '' });
    setDialogOpen(true);
  };
  const openEdit = (u: AppUser) => {
    setEditing(u);
    editForm.reset({ name: u.name, email: u.email, phone: u.phone ?? '', roleId: u.roleId, status: u.status });
    setDialogOpen(true);
  };

  const onCreateSubmit = async (values: CreateValues) => {
    try {
      await usersApi.create(values);
      toast({ title: 'User created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Could not create user', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const onEditSubmit = async (values: EditValues) => {
    if (!editing) return;
    try {
      await usersApi.update(editing.id, values);
      toast({ title: 'User updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDialogOpen(false);
    } catch (err) {
      toast({ title: 'Could not update user', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast({ title: 'User deactivated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast({ title: 'Could not deactivate user', description: getErrorMessage(err), variant: 'error' }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => usersApi.resetPassword(resetOpen!.id, newPassword),
    onSuccess: () => {
      toast({ title: 'Password reset', variant: 'success' });
      setResetOpen(null);
      setNewPassword('');
    },
    onError: (err) => toast({ title: 'Could not reset password', description: getErrorMessage(err), variant: 'error' }),
  });

  return (
    <div>
      <PageHeader title="Users" description="Manage staff accounts and roles" actions={<Button onClick={openCreate}><Plus className="h-4 w-4" /> New user</Button>} />

      <Card>
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-8" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={UserCog} title="No users found" description={search ? 'Try a different search term.' : 'Create a user to give staff access to StockFlow.'} />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role.name}</Badge></TableCell>
                    <TableCell><Badge variant={u.status === 'ACTIVE' ? 'success' : 'secondary'}>{u.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Never'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setResetOpen(u)} aria-label="Reset password"><KeyRound className="h-4 w-4" /></Button>
                        <Button
                          variant="ghost" size="icon" aria-label="Deactivate" disabled={u.id === currentUser?.id}
                          onClick={() => confirm({ title: 'Deactivate user?', description: `${u.name} will immediately lose access, even with an active session.`, destructive: true, onConfirm: () => removeMutation.mutate(u.id) })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit user' : 'New user'}</DialogTitle></DialogHeader>
          {editing ? (
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <Field label="Name" error={editForm.formState.errors.name?.message} required><Input {...editForm.register('name')} /></Field>
              <Field label="Email" error={editForm.formState.errors.email?.message} required><Input {...editForm.register('email')} /></Field>
              <Field label="Phone"><Input {...editForm.register('phone')} /></Field>
              <Field label="Role" error={editForm.formState.errors.roleId?.message} required>
                <Select value={editForm.watch('roleId')} onValueChange={(v) => editForm.setValue('roleId', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{roles?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={editForm.watch('status')} onValueChange={(v) => editForm.setValue('status', v as EditValues['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={editForm.formState.isSubmitting}>Save changes</Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <Field label="Name" error={createForm.formState.errors.name?.message} required><Input {...createForm.register('name')} /></Field>
              <Field label="Email" error={createForm.formState.errors.email?.message} required><Input {...createForm.register('email')} /></Field>
              <Field label="Phone"><Input {...createForm.register('phone')} /></Field>
              <Field label="Temporary password" error={createForm.formState.errors.password?.message} required>
                <Input type="password" {...createForm.register('password')} />
              </Field>
              <Field label="Role" error={createForm.formState.errors.roleId?.message} required>
                <Select onValueChange={(v) => createForm.setValue('roleId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{roles?.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" loading={createForm.formState.isSubmitting}>Create user</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetOpen} onOpenChange={(open) => !open && setResetOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password for {resetOpen?.name}</DialogTitle></DialogHeader>
          <Field label="New password" required>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(null)}>Cancel</Button>
            <Button
              onClick={() => resetPasswordMutation.mutate()}
              loading={resetPasswordMutation.isPending}
              disabled={newPassword.length < 8}
            >
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
