import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { auditLogsApi } from '@/api/audit-logs';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { formatDateTime } from '@/lib/utils';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entity, action],
    queryFn: () => auditLogsApi.list({ page, pageSize: 25, entity: entity || undefined, action: action || undefined }),
  });

  return (
    <div>
      <PageHeader title="Audit Logs" description="Complete history of administrative and business actions" />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
          <Input placeholder="Filter by entity (e.g. Product)" className="w-56" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} />
          <Input placeholder="Filter by action (e.g. CREATE)" className="w-56" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState icon={History} title="No audit log entries found" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="font-medium">{log.user?.name ?? 'System'}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">{log.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} pageSize={25} total={data.total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
