import { forwardRef, useRef, type FocusEvent, type InputHTMLAttributes, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onFocus, onMouseUp, ...props }, ref) => {
    // Number inputs default to "0" — selecting it on focus lets the user
    // immediately overwrite it by typing, instead of inserting next to it
    // (e.g. typing "5.50" into a "0" field producing "05.50").
    const justFocused = useRef(false);

    const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
      if (type === 'number') {
        justFocused.current = true;
        e.target.select();
      }
      onFocus?.(e);
    };

    const handleMouseUp = (e: MouseEvent<HTMLInputElement>) => {
      // A click that focuses the input fires focus (above) then mouseup;
      // the browser's default mouseup handling would otherwise collapse
      // the selection we just made to the click position. Suppress that
      // once, right after focus, so the select-all survives a plain click.
      // Later clicks (already focused) are untouched, so users can still
      // reposition the caret or drag-select part of the value.
      if (type === 'number' && justFocused.current) {
        justFocused.current = false;
        e.preventDefault();
      }
      onMouseUp?.(e);
    };

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        onFocus={handleFocus}
        onMouseUp={handleMouseUp}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
