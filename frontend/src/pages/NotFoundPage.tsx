import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Compass className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-3xl font-bold tracking-tight">404</p>
      <div className="space-y-1">
        <p className="font-medium">Page not found</p>
        <p className="text-sm text-muted-foreground">The page you're looking for doesn't exist or may have moved.</p>
      </div>
      <Button className="mt-2" onClick={() => navigate('/')}>Go to dashboard</Button>
    </div>
  );
}
