"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const GBP_AI_LOADING_LINES = [
  "Pulling your live Google Business Profile snapshot…",
  "Reconciling Maps, Search, and synced fields…",
  "Preparing insights and health signals…",
] as const;

export const GBP_AI_ANALYSIS_LINES = [
  "Running your data through the analysis engine…",
  "Comparing signals from your ranking grids…",
  "Scoring opportunities and gaps…",
] as const;

export function useGbpAiRotatingLine(
  active: boolean,
  lines: readonly string[],
  intervalMs = 2400
): string {
  const [i, setI] = useState(0);
  const len = lines.length;
  useEffect(() => {
    if (!active || len <= 1) return;
    const t = setInterval(() => setI((n) => (n + 1) % len), intervalMs);
    return () => clearInterval(t);
  }, [active, len, intervalMs]);
  useEffect(() => {
    if (active) setI(0);
  }, [active]);
  if (len === 0) return "";
  return lines[Math.min(i, len - 1)] ?? lines[0];
}

export function GbpAiLoadingShell({
  headline,
  children,
  lines = GBP_AI_LOADING_LINES,
  className,
}: {
  headline: string;
  children: ReactNode;
  lines?: readonly string[];
  className?: string;
}) {
  const line = useGbpAiRotatingLine(true, lines, 2600);
  return (
    <div className={cn("space-y-6", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-500/[0.07] via-fuchsia-500/[0.06] to-cyan-500/[0.05] p-4 shadow-sm dark:border-violet-900/40 dark:from-violet-500/10 dark:via-fuchsia-500/[0.08]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-500/20 blur-2xl dark:bg-violet-400/10" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-40 rounded-full bg-fuchsia-500/15 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-600/30">
            <Sparkles className="h-6 w-6 animate-pulse text-white" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
              Intelligence layer active
            </p>
            <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{headline}</h3>
            <p
              key={line}
              className="animate-in fade-in slide-in-from-bottom-1 text-sm text-muted-foreground duration-500"
            >
              {line}
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

type StripVariant = "sync" | "analysis";

const STRIP_LINES: Record<StripVariant, readonly string[]> = {
  sync: GBP_AI_LOADING_LINES,
  analysis: GBP_AI_ANALYSIS_LINES,
};

export function GbpAiWorkingStrip({
  active,
  variant = "analysis",
  className,
}: {
  active: boolean;
  variant?: StripVariant;
  className?: string;
}) {
  const lines = STRIP_LINES[variant];
  const line = useGbpAiRotatingLine(active, lines, 2200);
  if (!active) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-violet-200/50 bg-gradient-to-r from-violet-500/[0.08] to-transparent px-3 py-2.5 dark:border-violet-900/35",
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-violet-600 dark:text-violet-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-300">
          {variant === "analysis" ? "Analysis engine" : "Sync engine"}
        </p>
        <p key={line} className="animate-in fade-in text-xs text-foreground duration-300">
          {line}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500/80 dark:bg-violet-400/80"
            style={{ animationDelay: `${d * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function GbpAiSuiteBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-violet-500/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-800 dark:border-violet-800/60 dark:bg-violet-500/15 dark:text-violet-200",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-violet-600 dark:text-violet-400" />
      AI-assisted
    </span>
  );
}
