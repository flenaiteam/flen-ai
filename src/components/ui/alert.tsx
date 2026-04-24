import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-soft-default-bg border border-soft-default-border border-l-4 border-l-soft-default-accent text-soft-default-text [&>svg]:text-soft-default-accent",
        success:
          "bg-soft-success-bg border border-soft-success-border border-l-4 border-l-soft-success-accent text-soft-success-text [&>svg]:text-soft-success-accent",
        warning:
          "bg-soft-warning-bg border border-soft-warning-border border-l-4 border-l-soft-warning-accent text-soft-warning-text [&>svg]:text-soft-warning-accent",
        error:
          "bg-soft-error-bg border border-soft-error-border border-l-4 border-l-soft-error-accent text-soft-error-text [&>svg]:text-soft-error-accent",
        info:
          "bg-soft-info-bg border border-soft-info-border border-l-4 border-l-soft-info-accent text-soft-info-text [&>svg]:text-soft-info-accent",
        "success-solid":
          "bg-solid-success-bg border-0 text-solid-success-text [&>svg]:text-solid-success-text",
        "warning-solid":
          "bg-solid-warning-bg border-0 text-solid-warning-text [&>svg]:text-solid-warning-text",
        "error-solid":
          "bg-solid-error-bg border-0 text-solid-error-text [&>svg]:text-solid-error-text",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  )
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-display mb-1 font-semibold leading-none tracking-tight", className)} {...props} />
  )
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };

