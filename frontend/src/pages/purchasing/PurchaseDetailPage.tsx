import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Undo2 } from 'lucide-react';
import { purchasesApi } from '@/api/purchasing';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSIONS } from '@/lib/permissions';
import { formatCurrency, formatDate } from '@/lib/utils';

export function PurchaseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { data: purchase, isLoading } = useQuery({ queryKey: ['purchases', id], queryFn: () => purchasesApi.get(id) });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!purchase) return <EmptyState title="Purchase not found" />;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/purchases')}>
        <ArrowLeft className="h-4 w-4" /> Back to purchases
      </Button>
      <PageHeader
        title={purchase.invoiceNumber}
        description={`${purchase.supplier.name} · ${purchase.warehouse.name}`}
        actions={
          hasPermission(PERMISSIONS.PURCHASES_RETURN) && (
            <Button variant="outline" onClick={() => navigate(`/purchase-returns?purchaseId=${purchase.id}`)}>
              <Undo2 className="h-4 w-4" /> Create return
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Items received</CardTitle></CardHeader>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Unit cost</TableHead><TableHead>Line total</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                  <TableCell>{formatCurrency(item.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(purchase.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(purchase.discountTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(purchase.taxTotal)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Total</span><span>{formatCurrency(purchase.total)}</span></div>
            <div className="flex justify-between pt-2"><span className="text-muted-foreground">Received by</span><span>{purchase.receivedBy?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(purchase.createdAt)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
