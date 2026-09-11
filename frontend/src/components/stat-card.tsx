import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'destructive';
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight truncate">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            tone === 'default' && 'bg-primary/10 text-primary',
            tone === 'success' && 'bg-success/10 text-success',
            tone === 'warning' && 'bg-warning/15 text-warning-foreground',
            tone === 'destructive' && 'bg-destructive/10 text-destructive',
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
