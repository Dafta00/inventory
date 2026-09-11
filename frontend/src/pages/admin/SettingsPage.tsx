import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/lib/api-client';

export function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getAll });

  const [form, setForm] = useState({
    business_name: '', business_address: '', business_phone: '', business_email: '',
    currency: 'USD', tax_rate_default: 0, allow_negative_stock: false, low_stock_threshold_default: 10,
  });

  useEffect(() => {
    if (data) setForm({ ...form, ...data } as typeof form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(form)) {
        await settingsApi.upsert(key, value);
      }
    },
    onSuccess: () => {
      toast({ title: 'Settings saved', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast({ title: 'Could not save settings', description: getErrorMessage(err), variant: 'error' }),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="System-wide configuration" />

      <Card>
        <CardHeader><CardTitle>Business profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Business name">
            <Input value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} />
          </Field>
          <Field label="Address">
            <Input value={form.business_address} onChange={(e) => setForm((f) => ({ ...f, business_address: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={form.business_phone} onChange={(e) => setForm((f) => ({ ...f, business_phone: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input value={form.business_email} onChange={(e) => setForm((f) => ({ ...f, business_email: e.target.value }))} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader><CardTitle>Inventory rules</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Currency">
              <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} />
            </Field>
            <Field label="Default tax rate (%)">
              <Input type="number" value={form.tax_rate_default} onChange={(e) => setForm((f) => ({ ...f, tax_rate_default: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Default reorder threshold" hint="Used as a suggestion when creating new products">
            <Input type="number" value={form.low_stock_threshold_default} onChange={(e) => setForm((f) => ({ ...f, low_stock_threshold_default: Number(e.target.value) }))} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Allow negative stock</p>
              <p className="text-xs text-muted-foreground">If disabled, sales are blocked when stock would go below zero</p>
            </div>
            <Switch checked={form.allow_negative_stock} onCheckedChange={(v) => setForm((f) => ({ ...f, allow_negative_stock: v }))} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Save settings</Button>
      </div>
    </div>
  );
}
