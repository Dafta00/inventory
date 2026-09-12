import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { warehousesApi } from '@/api/warehouses';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/stat-card';
import { Boxes, DollarSign, Tag } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

export function WarehouseDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: warehouse, isLoading } = useQuery({ queryKey: ['warehouses', id], queryFn: () => warehousesApi.get(id) });
  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['warehouses', id, 'inventory'],
    queryFn: () => warehousesApi.inventory(id),
  });
  const { data: valuation } = useQuery({ queryKey: ['warehouses', id, 'valuation'], queryFn: () => warehousesApi.valuation(id) });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!warehouse) return <EmptyState title="Warehouse not found" />;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate('/warehouses')}>
        <ArrowLeft className="h-4 w-4" /> Back to warehouses
      </Button>
      <PageHeader title={warehouse.name} description={`Code: ${warehouse.code}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <StatCard label="SKUs in stock" value={formatNumber(valuation?.skuCount ?? 0)} icon={Tag} />
        <StatCard label="Total units" value={formatNumber(valuation?.totalUnits ?? 0)} icon={Boxes} />
        <StatCard label="Stock value (cost)" value={formatCurrency(valuation?.totalCostValue ?? 0)} icon={DollarSign} />
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            {invLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !inventory?.length ? (
              <EmptyState title="No stock in this warehouse" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Cost value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.product.name}</TableCell>
                      <TableCell className="font-mono text-xs">{row.product.sku}</TableCell>
                      <TableCell className="tabular-nums">{formatNumber(row.quantity)} {row.product.unit}</TableCell>
                      <TableCell className="tabular-nums">{formatCurrency(row.quantity * Number(row.product.costPrice))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 text-sm">
              <div><p className="text-muted-foreground">Address</p><p>{warehouse.address ?? '-'}</p></div>
              <div><p className="text-muted-foreground">Manager</p><p>{warehouse.manager?.name ?? '-'}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p>{warehouse.phone ?? '-'}</p></div>
              <div><p className="text-muted-foreground">Email</p><p>{warehouse.email ?? '-'}</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
