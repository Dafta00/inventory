import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Receipt, Eye } from 'lucide-react';
import { salesApi } from '@/api/sales';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function SalesPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({ queryKey: ['sales', page], queryFn: () => salesApi.list({ page, pageSize: 20 }) });

  return (
    <div>
      <PageHeader
        title="Sales"
        description="All completed sales transactions"
        actions={
          hasPermission(PERMISSIONS.SALES_CREATE) && (
            <Button onClick={() => navigate('/sales/new')}><Plus className="h-4 w-4" /> New sale</Button>
          )
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={Receipt} title="No sales yet" description="Record your first sale to see it here." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{s.customer?.name ?? 'Walk-in'}</TableCell>
                    <TableCell className="text-muted-foreground">{s.warehouse.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.staff.name}</TableCell>
                    <TableCell>{formatCurrency(s.total)}</TableCell>
                    <TableCell><Badge variant={s.paymentStatus === 'PAID' ? 'success' : 'warning'}>{s.paymentStatus}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/sales/${s.id}`)} aria-label="View">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={20} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
