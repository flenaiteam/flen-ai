import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        brand:
          "bg-solid-brand-bg text-solid-brand-text hover:opacity-90 active:opacity-95",
        "brand-soft":
          "bg-soft-brand-bg text-soft-brand-text border border-soft-brand-border hover:bg-soft-brand-bg-hover active:bg-soft-brand-bg-active",
        "brand-outline":
          "bg-transparent text-outline-brand-text border border-outline-brand-border hover:bg-soft-brand-bg active:bg-soft-brand-bg-hover",
        "brand-ghost":
          "bg-transparent text-ghost-brand-text hover:bg-ghost-brand-bg-hover",
        base:
          "bg-solid-default-bg text-solid-default-text hover:opacity-90 active:opacity-95",
        "base-soft":
          "bg-soft-default-bg text-soft-default-text border border-soft-default-border hover:bg-soft-default-bg-hover active:bg-soft-default-bg-active",
        "base-outline":
          "bg-transparent text-outline-default-text border border-outline-default-border hover:bg-soft-default-bg active:bg-soft-default-bg-hover",
        "base-ghost":
          "bg-transparent text-ghost-default-text hover:bg-ghost-default-bg-hover",
        success:
          "bg-solid-success-bg text-solid-success-text hover:opacity-90 active:opacity-95",
        warning:
          "bg-solid-warning-bg text-solid-warning-text hover:opacity-90 active:opacity-95",
        error:
          "bg-solid-error-bg text-solid-error-text hover:opacity-90 active:opacity-95",
        "success-soft":
          "bg-soft-success-bg text-soft-success-text border border-soft-success-border hover:bg-soft-success-bg-hover active:bg-soft-success-bg-active",
        "warning-soft":
          "bg-soft-warning-bg text-soft-warning-text border border-soft-warning-border hover:bg-soft-warning-bg-hover active:bg-soft-warning-bg-active",
        "error-soft":
          "bg-soft-error-bg text-soft-error-text border border-soft-error-border hover:bg-soft-error-bg-hover active:bg-soft-error-bg-active",
      },
      size: {
        sm:   "h-8 px-3 text-xs rounded-md",
        md:   "h-9 px-4 text-sm rounded-md",
        lg:   "h-11 px-6 text-base rounded-lg",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: { variant: "brand", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
