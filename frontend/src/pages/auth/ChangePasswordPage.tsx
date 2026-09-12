import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { apiClient, getErrorMessage } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/form-field';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { useToast } from '@/contexts/ToastContext';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({ title: 'Password changed', variant: 'success' });
      reset();
    } catch (err) {
      toast({ title: 'Could not change password', description: getErrorMessage(err), variant: 'error' });
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Change password" description="Update the password for your account" />
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KeyRound className="h-4 w-4" />
            You'll stay signed in after changing your password.
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="Current password" error={errors.currentPassword?.message} required>
              <Input type="password" {...register('currentPassword')} />
            </Field>
            <Field label="New password" error={errors.newPassword?.message} required>
              <Input type="password" {...register('newPassword')} />
            </Field>
            <Field label="Confirm new password" error={errors.confirmPassword?.message} required>
              <Input type="password" {...register('confirmPassword')} />
            </Field>
            <Button type="submit" loading={isSubmitting}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
