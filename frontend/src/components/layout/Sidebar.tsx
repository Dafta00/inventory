import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Boxes, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_GROUPS } from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const COLLAPSE_KEY = 'stockflow.sidebar.collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore storage failures (private mode, etc.) */
      }
      return next;
    });
  };

  function content(isCollapsed: boolean) {
    return (
      <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
        <div className={cn('flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border', isCollapsed ? 'justify-center px-2' : 'px-4')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-success text-success-foreground">
            <Boxes className="h-4.5 w-4.5" />
          </div>
          {!isCollapsed && <span className="font-semibold tracking-tight text-white">StockFlow</span>}
          <button className="ml-auto text-sidebar-foreground/70 hover:text-white lg:hidden" onClick={onCloseMobile} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className={cn('flex-1 overflow-y-auto py-4 no-scrollbar', isCollapsed ? 'px-2' : 'px-3')}>
          {NAV_GROUPS.map((group, gi) => {
            const items = group.items.filter((item) => !item.permission || hasPermission(item.permission));
            if (items.length === 0) return null;
            return (
              <div key={gi} className="mb-4">
                {group.label && !isCollapsed && (
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const link = (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-2.5 rounded-md py-2 text-sm font-medium transition-colors duration-150',
                            isCollapsed ? 'justify-center px-2' : 'px-2.5',
                            isActive
                              ? 'bg-sidebar-accent text-white'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-success" aria-hidden />
                            )}
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                    );

                    if (!isCollapsed) return link;

                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={cn('hidden shrink-0 border-t border-sidebar-border py-2 lg:flex', isCollapsed ? 'justify-center px-2' : 'justify-end px-3')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCollapsed}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
              >
                {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className={cn('hidden shrink-0 border-r border-sidebar-border transition-[width] duration-150 lg:block', collapsed ? 'w-[4.5rem]' : 'w-64')}>
        {content(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full w-64 animate-slide-in">{content(false)}</div>
        </div>
      )}
    </>
  );
}
