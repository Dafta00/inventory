import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SENT', label: 'Sent' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'RECEIVED', label: 'Received' },
] as const;

// PARTIALLY_RECEIVED and COMPLETED both map onto the final "Received" node —
// the former shown as in-progress, the latter as done.
const STEP_INDEX: Record<string, number> = {
  DRAFT: 0,
  SENT: 1,
  CONFIRMED: 2,
  PARTIALLY_RECEIVED: 3,
  RECEIVED: 3,
  COMPLETED: 3,
};

export function PurchaseOrderStatusStepper({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
        This purchase order was cancelled.
      </div>
    );
  }

  const currentIndex = STEP_INDEX[status] ?? 0;
  const isFinal = status === 'RECEIVED' || status === 'COMPLETED';
  const isPartial = status === 'PARTIALLY_RECEIVED';

  return (
    <ol className="flex items-center" aria-label="Purchase order progress">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex || (i === currentIndex && isFinal);
        const isCurrent = i === currentIndex && !isFinal;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  isDone && 'border-success bg-success text-success-foreground',
                  isCurrent && !isPartial && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && isPartial && 'border-warning bg-warning/15 text-warning',
                  !isDone && !isCurrent && 'border-border bg-background text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('whitespace-nowrap text-xs font-medium', isDone || isCurrent ? 'text-foreground' : 'text-muted-foreground')}>
                {isCurrent && isPartial ? 'Partially received' : step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('mx-2 h-0.5 flex-1', i < currentIndex ? 'bg-success' : 'bg-border')} />}
          </li>
        );
      })}
    </ol>
  );
}
