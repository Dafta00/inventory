import { useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', onConfirm: () => {} });

  const confirm = (opts: { title: string; description?: string; destructive?: boolean; onConfirm: () => void }) => {
    setState({ open: true, ...opts });
  };

  const dialog: ReactNode = (
    <AlertDialog open={state.open} onOpenChange={(open) => setState((s) => ({ ...s, open }))}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description && <AlertDialogDescription>{state.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={state.destructive ? 'destructive' : 'default'}
            onClick={() => {
              state.onConfirm();
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
