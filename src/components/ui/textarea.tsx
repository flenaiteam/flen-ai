import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm font-sans shadow-xs transition-colors resize-none",
        "bg-[var(--bg-page)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
        "border-[var(--border-default)] hover:border-[var(--border-strong)]",
        "focus-visible:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-base-100",
        error && "border-error-400 hover:border-error-500 focus-visible:border-error-500 focus-visible:ring-error-500/20",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
