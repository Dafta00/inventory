import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Undo2 } from 'lucide-react';
import { salesApi } from '@/api/sales';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export function SaleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: sale, isLoading } = useQuery({ queryKey: ['sales', id], queryFn: () => salesApi.get(id) });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!sale) return <EmptyState title="Sale not found" />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/sales')}>
          <ArrowLeft className="h-4 w-4" /> Back to sales
        </Button>
        <div className="flex gap-2">
          {hasPermission(PERMISSIONS.SALES_REFUND) && (
            <Button variant="outline" onClick={() => navigate(`/sales-returns?saleId=${sale.id}`)}>
              <Undo2 className="h-4 w-4" /> Create return
            </Button>
          )}
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print invoice
          </Button>
        </div>
      </div>

      <Card className="mx-auto max-w-3xl print:border-none print:shadow-none">
        <CardContent className="p-8">
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              <h2 className="text-lg font-bold">StockFlow Inventory</h2>
              <p className="text-sm text-muted-foreground">123 Industrial Ave, Springfield</p>
              <p className="text-sm text-muted-foreground">contact@stockflow.example</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice</p>
              <p className="font-mono text-sm">{sale.invoiceNumber}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
              <Badge variant={sale.paymentStatus === 'PAID' ? 'success' : 'warning'} className="mt-1">{sale.paymentStatus}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Bill to</p>
              <p className="font-medium">{sale.customer?.name ?? 'Walk-in customer'}</p>
              {sale.customer?.email && <p className="text-muted-foreground">{sale.customer.email}</p>}
              {sale.customer?.phone && <p className="text-muted-foreground">{sale.customer.phone}</p>}
            </div>
            <div className="text-right">
              <p className="font-medium text-muted-foreground">Sold at</p>
              <p>{sale.warehouse.name}</p>
              <p className="text-muted-foreground">Served by {sale.staff.name}</p>
              <p className="text-muted-foreground">Payment: {sale.paymentMethod.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="tabular-nums">{item.quantity}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(item.discount)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-6 flex justify-end">
            <div className="w-56 space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(sale.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(sale.discountTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(sale.taxTotal)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><span>Total</span><span>{formatCurrency(sale.total)}</span></div>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-6 border-t border-border pt-4 text-sm">
              <p className="font-medium text-muted-foreground">Notes</p>
              <p>{sale.notes}</p>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">Thank you for your business!</p>
        </CardContent>
      </Card>
    </div>
  );
}
