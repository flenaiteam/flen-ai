"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const THINKING_STEPS = [
  "Scanning your listing context…",
  "Cross-checking fields and tone…",
  "Drafting the next version…",
];

const STEP_INTERVAL_MS = 2800;

export function ThinkingBubble({ className }: { className?: string }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i: number) => (i < THINKING_STEPS.length - 1 ? i + 1 : i));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl rounded-bl-sm border border-violet-200/40 bg-gradient-to-r from-violet-500/[0.08] to-transparent px-4 py-3 text-sm text-muted-foreground dark:border-violet-900/30",
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0 animate-pulse text-violet-600 dark:text-violet-400" />
      <span className="text-foreground/90">{THINKING_STEPS[stepIndex]}</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
      </span>
    </div>
  );
}
