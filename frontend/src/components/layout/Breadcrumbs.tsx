import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

function toTitleCase(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-sm font-semibold">Dashboard</span>;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <Link to="/" className="text-muted-foreground hover:text-foreground">
        Home
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        const looksLikeId = seg.length > 16;
        return (
          <span key={path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {isLast ? (
              <span className="font-medium text-foreground">{looksLikeId ? 'Details' : toTitleCase(seg)}</span>
            ) : (
              <Link to={path} className="text-muted-foreground hover:text-foreground">
                {toTitleCase(seg)}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
