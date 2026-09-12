import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
} as const;

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  size = 'default',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: keyof typeof TONE_STYLES;
  hint?: string;
  size?: 'default' | 'featured';
}) {
  const isFeatured = size === 'featured';

  return (
    <Card className={cn('transition-shadow hover:shadow-sm', isFeatured && 'border-l-2 border-l-primary')}>
      <CardContent className={cn('flex items-start justify-between gap-3', isFeatured ? 'p-5' : 'p-4')}>
        <div className="min-w-0">
          <p className={cn('font-medium uppercase tracking-wide text-muted-foreground', isFeatured ? 'text-xs' : 'text-[11px]')}>
            {label}
          </p>
          <p className={cn('mt-1.5 truncate font-semibold tabular-nums tracking-tight', isFeatured ? 'text-3xl' : 'text-2xl')}>
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-lg',
            isFeatured ? 'h-11 w-11' : 'h-9 w-9',
            TONE_STYLES[tone],
          )}
        >
          <Icon className={isFeatured ? 'h-5 w-5' : 'h-4.5 w-4.5'} />
        </div>
      </CardContent>
    </Card>
  );
}
