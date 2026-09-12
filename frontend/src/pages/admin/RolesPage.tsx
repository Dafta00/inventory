import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ShieldCheck, Shield, Trash2, Users } from 'lucide-react';
import { rolesApi } from '@/api/roles';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Field } from '@/components/form-field';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { Permission, Role } from '@/api/types';

const schema = z.object({ name: z.string().min(1, 'Required'), description: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function RolesPage() {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [pendingPermissions, setPendingPermissions] = useState<Set<string>>(new Set());

  const { data: roles, isLoading } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const { data: permissions } = useQuery({ queryKey: ['roles', 'permissions'], queryFn: rolesApi.listPermissions });

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions ?? []) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return Array.from(map.entries());
  }, [permissions]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onCreateSubmit = async (values: FormValues) => {
    try {
      await rolesApi.create(values);
      toast({ title: 'Role created', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast({ title: 'Could not create role', description: getErrorMessage(err), variant: 'error' });
    }
  };

  const openPermissions = (role: Role) => {
    setSelectedRole(role);
    setPendingPermissions(new Set(role.permissions));
  };

  const savePermissionsMutation = useMutation({
    mutationFn: () => rolesApi.setPermissions(selectedRole!.id, Array.from(pendingPermissions)),
    onSuccess: () => {
      toast({ title: 'Permissions updated', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRole(null);
    },
    onError: (err) => toast({ title: 'Could not update permissions', description: getErrorMessage(err), variant: 'error' }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      toast({ title: 'Role deleted', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => toast({ title: 'Could not delete role', description: getErrorMessage(err), variant: 'error' }),
  });

  const togglePermission = (key: string) => {
    setPendingPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (perms: Permission[], enable: boolean) => {
    setPendingPermissions((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (enable) next.add(p.key);
        else next.delete(p.key);
      }
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Configure granular access control"
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New role</Button>}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !roles?.length ? (
        <EmptyState icon={ShieldCheck} title="No roles yet" description="Create a role to start assigning granular permissions to staff." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className={cn(role.name === 'Super Admin' && 'border-primary/30')}>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-2.5">
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      role.name === 'Super Admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {role.name === 'Super Admin' ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </div>
                  <div>
                    <CardTitle className="text-foreground text-base">{role.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                  </div>
                </div>
                {role.isSystem && <Badge variant="outline">System</Badge>}
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-0">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {role.userCount ?? 0}</span>
                  <span>·</span>
                  <span>{role.permissions.length} permission(s)</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openPermissions(role)}>Permissions</Button>
                  {!role.isSystem && (
                    <Button
                      variant="ghost" size="icon" aria-label="Delete role"
                      onClick={() => confirm({ title: 'Delete role?', description: `${role.userCount ?? 0} user(s) currently have this role.`, destructive: true, onConfirm: () => removeMutation.mutate(role.id) })}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New role</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <Field label="Name" error={errors.name?.message} required><Input {...register('name')} /></Field>
            <Field label="Description"><Textarea rows={2} {...register('description')} /></Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create role</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRole} onOpenChange={(open) => !open && setSelectedRole(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Permissions for {selectedRole?.name}</DialogTitle>
            {selectedRole?.name !== 'Super Admin' && (
              <DialogDescription>Grant only what each role needs — changes apply the moment you save.</DialogDescription>
            )}
          </DialogHeader>
          {selectedRole?.name === 'Super Admin' ? (
            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              Super Admin always has full access to every module and cannot be restricted.
            </div>
          ) : (
            <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
              {grouped.map(([module, perms]) => {
                const allOn = perms.every((p) => pendingPermissions.has(p.key));
                return (
                  <div key={module} className="rounded-lg border border-border">
                    <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{module}</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => toggleModule(perms, !allOn)}
                      >
                        {allOn ? 'Clear all' : 'Select all'}
                      </button>
                    </div>
                    <div className="divide-y divide-border">
                      {perms.map((p) => {
                        const isDestructiveAction = /delete|remove|manage|refund/i.test(p.key);
                        return (
                          <label key={p.key} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30">
                            <Checkbox checked={pendingPermissions.has(p.key)} onCheckedChange={() => togglePermission(p.key)} />
                            <span className="flex-1">{p.description}</span>
                            {isDestructiveAction && pendingPermissions.has(p.key) && (
                              <Badge variant="warning" className="shrink-0">Sensitive</Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRole(null)}>Cancel</Button>
            {selectedRole?.name !== 'Super Admin' && (
              <Button onClick={() => savePermissionsMutation.mutate()} loading={savePermissionsMutation.isPending}>
                Save permissions
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dialog}
    </div>
  );
}
