import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Boxes, CheckCircle2 } from 'lucide-react';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form-field';

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
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Set a new password</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {done ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm">Password updated. Redirecting to login...</p>
            </div>
          ) : !token ? (
            <p className="text-sm text-destructive">Missing or invalid reset token. Please request a new link.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
              <Field label="New password" error={errors.password?.message} required>
                <Input type="password" {...register('password')} />
              </Field>
              <Field label="Confirm password" error={errors.confirmPassword?.message} required>
                <Input type="password" {...register('confirmPassword')} />
              </Field>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Reset password
              </Button>
            </form>
          )}
          <Link to="/login" className="mt-4 block text-sm text-muted-foreground hover:text-foreground">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
