import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { suppliersApi } from '@/api/suppliers';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/stat-card';
import { DollarSign, ClipboardList, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export function SupplierDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['suppliers', id], queryFn: () => suppliersApi.get(id) });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <EmptyState title="Supplier not found" />;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/suppliers')}>
        <ArrowLeft className="h-4 w-4" /> Back to suppliers
      </Button>
      <PageHeader title={data.name} description={data.company ?? undefined} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total purchases" value={formatCurrency(data.totalPurchases)} icon={DollarSign} />
        <StatCard label="Purchase orders" value={String(data.totalPurchaseOrders)} icon={ClipboardList} />
        <StatCard label="Products supplied" value={String(data.productsSupplied?.length ?? 0)} icon={Package} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contact information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground">Phone</p><p>{data.phone ?? '-'}</p></div>
            <div><p className="text-muted-foreground">Email</p><p>{data.email ?? '-'}</p></div>
            <div><p className="text-muted-foreground">Contact person</p><p>{data.contactPerson ?? '-'}</p></div>
            <div><p className="text-muted-foreground">Tax ID</p><p>{data.taxId ?? '-'}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Address</p><p>{data.address ?? '-'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent purchases</CardTitle></CardHeader>
          {data.recentPurchases?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentPurchases.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(p.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(p.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent><EmptyState title="No purchases yet" /></CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
