import { type ReactNode } from 'react';
import { Boxes } from 'lucide-react';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success text-success-foreground">
            <Boxes className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
