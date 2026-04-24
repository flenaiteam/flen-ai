import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  /** Lighter border, no shadow — for prominent search and analytics-style bars */
  subtle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, subtle, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border px-3 py-2 text-sm font-sans transition-colors",
        subtle
          ? "bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          : "shadow-xs bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border-[var(--border-default)] hover:border-[var(--border-strong)]",
        "focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-base-100",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        error && "border-error-400 hover:border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500/20",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
