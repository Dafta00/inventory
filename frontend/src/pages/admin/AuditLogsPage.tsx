import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search } from 'lucide-react';
import { auditLogsApi } from '@/api/audit-logs';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { formatDateTime } from '@/lib/utils';

function actionBadgeVariant(action: string): BadgeProps['variant'] {
  const a = action.toUpperCase();
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('DEACTIVATE')) return 'destructive';
  if (a.includes('CREATE')) return 'success';
  if (a.includes('UPDATE') || a.includes('EDIT')) return 'info';
  return 'outline';
}

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
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter by entity (e.g. Product)" className="w-56 pl-8" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter by action (e.g. CREATE)" className="w-56 pl-8" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={History}
            title="No audit log entries found"
            description={entity || action ? 'Try clearing your filters.' : 'Actions taken across the system will be recorded here.'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="font-medium">{log.user?.name ?? 'System'}</TableCell>
                    <TableCell><Badge variant={actionBadgeVariant(log.action)}>{log.action}</Badge></TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">{log.description}</TableCell>
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
