"use client";

import type { ComponentProps } from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

function ConfirmAction({
  children,
  variant = "error",
  onClick,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Close> &
  Pick<ComponentProps<typeof Button>, "variant"> & {
    onClick?: () => void | Promise<void>;
  }) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-confirm"
      render={<Button variant={variant} />}
      onClick={() => {
        void Promise.resolve(onClick?.());
      }}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Close>
  );
}

export type ConfirmAlertDialogProps = {
  title: string;
  description: React.ReactNode;
  cancelLabel?: string;
  confirmLabel: string;
  confirmVariant?: ComponentProps<typeof Button>["variant"];
  onConfirm: () => void | Promise<void>;
  /** Uncontrolled: opening control via trigger. Ignored when `open` is set. */
  trigger?: React.ReactElement;
  /** Controlled: omit `trigger` and toggle from a menu or other parent. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Opinionated confirmation alert (title, description, cancel / confirm) matching the design-system showcase.
 * Use for exit auth, destructive actions, or any case where the user should explicitly confirm.
 */
export function ConfirmAlertDialog({
  title,
  description,
  cancelLabel = "Cancel",
  confirmLabel,
  confirmVariant = "error",
  onConfirm,
  trigger,
  open,
  onOpenChange,
}: ConfirmAlertDialogProps) {
  const controlled = open !== undefined;

  return (
    <AlertDialog
      open={controlled ? open : undefined}
      onOpenChange={
        controlled
          ? (next, _details) => {
              onOpenChange?.(next);
            }
          : undefined
      }
    >
      {!controlled && trigger ? (
        <AlertDialogTrigger render={trigger} />
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <ConfirmAction variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </ConfirmAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
