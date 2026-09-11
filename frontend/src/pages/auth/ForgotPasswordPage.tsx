import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Boxes, ArrowLeft } from 'lucide-react';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form-field';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const res = await apiClient.post('/auth/forgot-password', values);
      setDevToken(res.data.devResetToken ?? null);
      setSent(true);
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
          <h1 className="text-lg font-semibold">Reset your password</h1>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {sent ? (
            <div className="space-y-3 text-sm">
              <p>If an account exists for that email, a reset link has been sent.</p>
              {devToken && (
                <div className="rounded-md bg-muted p-3 text-xs">
                  <p className="mb-1 font-medium">Development mode - no email provider configured:</p>
                  <Link to={`/reset-password?token=${devToken}`} className="text-primary underline break-all">
                    Reset password with this token
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
              <Field label="Email" error={errors.email?.message} required>
                <Input type="email" placeholder="you@company.com" {...register('email')} />
              </Field>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Send reset link
              </Button>
            </form>
          )}
          <Link to="/login" className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
