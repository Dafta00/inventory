import { NavLink } from 'react-router-dom';
import { Boxes, X } from 'lucide-react';
import { NAV_GROUPS } from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { hasPermission } = useAuth();

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Boxes className="h-4.5 w-4.5" />
        </div>
        <span className="font-semibold tracking-tight">StockFlow</span>
        <button className="ml-auto lg:hidden" onClick={onCloseMobile} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((item) => !item.permission || hasPermission(item.permission));
          if (items.length === 0) return null;
          return (
            <div key={gi} className="mb-4">
              {group.label && (
                <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-white'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 border-r border-sidebar-border">{content}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full w-64 animate-slide-in">{content}</div>
        </div>
      )}
    </>
  );
}
