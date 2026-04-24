import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-sans text-xs font-medium transition-colors rounded-sm px-2.5 py-0.5 border",
  {
    variants: {
      variant: {
        default:
          "bg-soft-default-bg text-soft-default-text border-soft-default-border",
        brand:
          "bg-soft-brand-bg text-soft-brand-text border-soft-brand-border",
        "base-soft":
          "bg-soft-default-bg text-soft-default-text border-soft-default-border",
        "base-solid":
          "bg-solid-default-bg text-solid-default-text border-solid-default-bg",
        "base-outline":
          "bg-transparent text-outline-default-text border-outline-default-border",
        success:
          "bg-soft-success-bg text-soft-success-text border-soft-success-border",
        warning:
          "bg-soft-warning-bg text-soft-warning-text border-soft-warning-border",
        error:
          "bg-soft-error-bg text-soft-error-text border-soft-error-border",
        info:
          "bg-soft-info-bg text-soft-info-text border-soft-info-border",
        "brand-solid":
          "bg-solid-brand-bg text-solid-brand-text border-solid-brand-bg",
        "success-solid":
          "bg-solid-success-bg text-solid-success-text border-solid-success-bg",
        "warning-solid":
          "bg-solid-warning-bg text-solid-warning-text border-solid-warning-bg",
        "error-solid":
          "bg-solid-error-bg text-solid-error-text border-solid-error-bg",
        "info-solid":
          "bg-solid-info-bg text-solid-info-text border-solid-info-bg",
        "brand-outline":
          "bg-transparent text-outline-brand-text border-outline-brand-border",
        "success-outline":
          "bg-transparent text-outline-success-text border-outline-success-border",
        "warning-outline":
          "bg-transparent text-outline-warning-text border-outline-warning-border",
        "error-outline":
          "bg-transparent text-outline-error-text border-outline-error-border",
        "info-outline":
          "bg-transparent text-outline-info-text border-outline-info-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
