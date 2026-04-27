'use client';

import { useState } from 'react';
import { ChevronDown, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MergedRankingGridScanRow } from '@/types/rankingGrid';

type DeltaKind = 'improved' | 'declined' | 'unchanged' | 'first_scan';

function computeDelta(current: MergedRankingGridScanRow, previous: MergedRankingGridScanRow | undefined): DeltaKind {
  if (!previous) return 'first_scan';
  const curr = current.summary?.avg_rank;
  const prev = previous.summary?.avg_rank;
  if (curr == null || prev == null) return 'unchanged';
  const diff = Number(curr) - Number(prev);
  if (diff < -0.05) return 'improved';
  if (diff > 0.05) return 'declined';
  return 'unchanged';
}

function DeltaChip({ kind, value }: { kind: DeltaKind; value: number | null | undefined }) {
  if (kind === 'first_scan') {
    return (
      <Badge variant="info" className="text-[10px] px-1.5 py-0 shrink-0 gap-1 font-medium">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--soft-info-accent)]" aria-hidden />
        First
      </Badge>
    );
  }
  if (kind === 'unchanged' || value == null) {
    return (
      <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0 font-medium tabular-nums">
        —
      </Badge>
    );
  }
  if (kind === 'improved') {
    return (
      <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0 gap-0.5 font-semibold tabular-nums">
        <TrendingUp className="h-3 w-3" aria-hidden />
        {Math.abs(Number(value)).toFixed(1)}
      </Badge>
    );
  }
  return (
    <Badge variant="error" className="text-[10px] px-1.5 py-0 shrink-0 gap-0.5 font-semibold tabular-nums">
      <TrendingDown className="h-3 w-3" aria-hidden />
      {Math.abs(Number(value)).toFixed(1)}
    </Badge>
  );
}

export interface RankingGridScanSelectorProps {
  scans: MergedRankingGridScanRow[];
  selectedScanId: string | null;
  onSelectScan: (id: string) => void;
  onRunNewScan: () => void;
  triggerClassName?: string;
  labelClassName?: string;
}

export function RankingGridScanSelector({
  scans,
  selectedScanId,
  onSelectScan,
  onRunNewScan,
  triggerClassName,
  labelClassName,
}: RankingGridScanSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedScan = selectedScanId ? scans.find((s) => s.public_id === selectedScanId) : scans[0] ?? null;
  const selectedIndex = selectedScan ? scans.indexOf(selectedScan) : -1;

  function formatScanDate(scan: MergedRankingGridScanRow): string {
    const raw = scan.summary?.scan_date ?? scan.created_at;
    if (!raw) return scan.public_id.slice(0, 8);
    return new Date(raw).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatScanConfig(scan: MergedRankingGridScanRow): string {
    const size = scan.grid_size;
    const radius = scan.radius_km != null ? `${scan.radius_km} km` : null;
    const points = scan.summary?.total_grid_points ?? size * size;
    return [
      `${size}×${size}`,
      radius,
      `${points} points`,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  const triggerLabel = selectedScan ? formatScanDate(selectedScan) : 'Select scan...';

  return (
    <div className="flex flex-col gap-1">
      <Label className={cn('text-xs text-[var(--text-secondary)]', labelClassName)}>Scan</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'inline-flex h-9 w-[min(100%,340px)] max-w-full items-center justify-between gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-sm font-normal text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]',
            triggerClassName
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(480px,calc(100vw-2rem))] border-[var(--border-default)] bg-[var(--bg-page)] p-0 text-[var(--text-primary)] shadow-xl"
        >
          <div className="border-b border-[var(--border-default)] px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">Scan history</p>
          </div>
          <div className="max-h-[min(320px,50vh)] overflow-y-auto">
            {scans.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-muted)]">No scans yet.</div>
            ) : (
              scans.map((scan, idx) => {
                const isSelected = scan.public_id === (selectedScan?.public_id ?? null);
                const previous = scans[idx + 1];
                const deltaKind = computeDelta(scan, previous);
                const deltaValue =
                  previous?.summary?.avg_rank != null && scan.summary?.avg_rank != null
                    ? Number(scan.summary.avg_rank) - Number(previous.summary.avg_rank)
                    : null;

                return (
                  <button
                    key={scan.public_id}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-3 border-b border-[var(--border-default)]/60 px-3 py-2.5 text-left last:border-b-0',
                      isSelected ? 'bg-[var(--bg-subtle)]/60' : 'hover:bg-[var(--bg-surface)]/80'
                    )}
                    onClick={() => {
                      onSelectScan(scan.public_id);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{formatScanDate(scan)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">{formatScanConfig(scan)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {scan.summary?.avg_rank != null ? (
                        <span className="text-sm font-semibold tabular-nums text-[var(--text-secondary)]">
                          #{Number(scan.summary.avg_rank).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm tabular-nums text-[var(--text-muted)]">—</span>
                      )}
                      <DeltaChip kind={deltaKind} value={deltaValue} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-[var(--border-default)]">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              onClick={() => {
                setOpen(false);
                onRunNewScan();
              }}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Run new scan
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
