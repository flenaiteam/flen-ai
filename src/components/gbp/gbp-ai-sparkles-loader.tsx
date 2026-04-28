"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

const SPARKLES_SRC = "/images/gbp-ai-sparkles-loader.svg";

export type GbpAiSparklesLoaderProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

export function GbpAiSparklesLoader({
  label = "AI is working…",
  className,
  compact,
}: GbpAiSparklesLoaderProps) {
  const size = compact ? 56 : 96;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-4" : "py-10",
        className
      )}
    >
      <div className={cn("relative animate-pulse", compact ? "size-14" : "size-24")}>
        <Image
          src={SPARKLES_SRC}
          alt=""
          width={size}
          height={size}
          className="size-full object-contain drop-shadow-md"
          unoptimized
        />
      </div>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}
