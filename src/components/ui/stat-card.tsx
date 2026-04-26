import * as React from "react";
import { TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  footer?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  infoDescription?: string;
  badgeLabel?: string;
  badgeVariant?: React.ComponentProps<typeof Badge>["variant"];
  className?: string;
  valueClassName?: string;
  subValueClassName?: string;
  footerClassName?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  footer,
  trend,
  trendValue,
  icon,
  infoDescription,
  badgeLabel,
  badgeVariant = "default",
  className,
  valueClassName,
  subValueClassName,
  footerClassName,
}: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-[var(--border-default)]  p-6", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
        <div className="flex items-center gap-2">
          {badgeLabel ? (
            <Badge variant={badgeVariant} className="w-fit">
              {badgeLabel}
            </Badge>
          ) : null}
          {infoDescription ? (
            <Tooltip>
              <TooltipTrigger>
                <button
                  type="button"
                  className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                  aria-label={`More info about ${label}`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{infoDescription}</TooltipContent>
            </Tooltip>
          ) : null}
          {icon && <span className="text-[var(--text-muted)]">{icon}</span>}
        </div>
      </div>
      <p className={cn("mt-2 font-display text-3xl font-bold text-[var(--text-primary)]", valueClassName)}>{value}</p>
      {subValue ? (
        <div className={cn("mt-1 text-sm text-[var(--text-secondary)]", subValueClassName)}>
          {subValue}
        </div>
      ) : null}
      {trend && trendValue && (
        <div className={cn("mt-2 flex items-center gap-1 text-xs font-medium",
          trend === "up" && "text-success-600",
          trend === "down" && "text-error-600",
          trend === "neutral" && "text-[var(--text-muted)]"
        )}>
          {trend === "up"      && <TrendingUp className="h-3.5 w-3.5" />}
          {trend === "down"    && <TrendingDown className="h-3.5 w-3.5" />}
          {trend === "neutral" && <Minus className="h-3.5 w-3.5" />}
          <span>{trendValue}</span>
        </div>
      )}
      {footer ? (
        <div className={cn("mt-2 text-sm text-[var(--text-secondary)]", footerClassName)}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
