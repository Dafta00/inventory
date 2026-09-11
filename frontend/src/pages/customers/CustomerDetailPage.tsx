import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, DollarSign, Receipt, AlertCircle } from 'lucide-react';
import { customersApi } from '@/api/customers';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export function CustomerDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['customers', id], queryFn: () => customersApi.get(id) });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data) return <EmptyState title="Customer not found" />;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/customers')}>
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Button>
      <PageHeader title={data.name} description={data.company ?? undefined} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="Total spent" value={formatCurrency(data.totalSpent)} icon={DollarSign} />
        <StatCard label="Total orders" value={String(data.totalOrders)} icon={Receipt} />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(data.outstandingBalance)}
          icon={AlertCircle}
          tone={Number(data.outstandingBalance) > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contact information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted-foreground">Phone</p><p>{data.phone ?? '-'}</p></div>
            <div><p className="text-muted-foreground">Email</p><p>{data.email ?? '-'}</p></div>
            <div><p className="text-muted-foreground">Type</p><p><Badge variant="outline">{data.type}</Badge></p></div>
            <div><p className="text-muted-foreground">Credit limit</p><p>{formatCurrency(data.creditLimit)}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Address</p><p>{data.address ?? '-'}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent sales</CardTitle></CardHeader>
          {data.recentSales?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(s.total)}</TableCell>
                    <TableCell><Badge variant="outline">{s.paymentStatus}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <CardContent><EmptyState title="No sales yet" /></CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
