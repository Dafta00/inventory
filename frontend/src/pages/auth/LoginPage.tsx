import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form-field';
import { getErrorMessage } from '@/lib/api-client';
import { AuthCard } from './AuthCard';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!isLoading && user) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <AuthCard title="StockFlow" subtitle="Sign in to manage your business">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        )}

        <Field label="Email" error={errors.email?.message} required>
          <Input type="email" autoComplete="email" placeholder="you@company.com" {...register('email')} />
        </Field>

        <Field label="Password" error={errors.password?.message} required>
          <Input type="password" autoComplete="current-password" placeholder="••••••••" {...register('password')} />
        </Field>

        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div>
          <p className="mb-1 font-medium text-foreground">Demo credentials</p>
          <p>Super Admin: admin@inventory.local / Admin@12345</p>
          <p>Sales Staff: sales@inventory.local / Sales@12345</p>
        </div>
      </div>
    </AuthCard>
  );
}
