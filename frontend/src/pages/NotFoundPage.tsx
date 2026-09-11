import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <p className="font-medium">Page not found</p>
      <Button onClick={() => navigate('/')}>Go to dashboard</Button>
    </div>
  );
}
