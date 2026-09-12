import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form-field';
import { AuthCard } from './AuthCard';

const schema = z
  .object({
    password: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: values.password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <AuthCard title="Set a new password">
      {done ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-sm">Password updated. Redirecting to login...</p>
        </div>
      ) : !token ? (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Missing or invalid reset token. Please request a new link.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Field label="New password" error={errors.password?.message} required>
            <Input type="password" {...register('password')} />
          </Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message} required>
            <Input type="password" {...register('confirmPassword')} />
          </Field>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Reset password
          </Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-sm text-muted-foreground hover:text-foreground">
        Back to login
      </Link>
    </AuthCard>
  );
}
