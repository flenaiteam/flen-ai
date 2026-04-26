'use client';

import { useState } from 'react';
import { ChevronDown, Plus, TrendingDown, TrendingUp } from 'lucide-react';
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
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/60 px-1.5 py-0.5 text-[10px] font-medium text-blue-300 ring-1 ring-blue-700/50">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
        First
      </span>
    );
  }
  if (kind === 'unchanged' || value == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
        —
      </span>
    );
  }
  if (kind === 'improved') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-700/50">
        <TrendingUp className="h-3 w-3" aria-hidden />
        {Math.abs(Number(value)).toFixed(1)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 ring-1 ring-rose-700/50">
      <TrendingDown className="h-3 w-3" aria-hidden />
      {Math.abs(Number(value)).toFixed(1)}
    </span>
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
      <Label className={cn('text-xs text-zinc-400', labelClassName)}>Scan</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'inline-flex h-9 w-[min(100%,340px)] max-w-full items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-normal text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100',
            triggerClassName
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(480px,calc(100vw-2rem))] border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-xl"
        >
          <div className="border-b border-zinc-800 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Scan history</p>
          </div>
          <div className="max-h-[min(320px,50vh)] overflow-y-auto">
            {scans.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">No scans yet.</div>
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
                      'flex w-full items-center justify-between gap-3 border-b border-zinc-800/60 px-3 py-2.5 text-left last:border-b-0',
                      isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/80'
                    )}
                    onClick={() => {
                      onSelectScan(scan.public_id);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-100">{formatScanDate(scan)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-400">{formatScanConfig(scan)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {scan.summary?.avg_rank != null ? (
                        <span className="text-sm font-semibold tabular-nums text-zinc-200">
                          #{Number(scan.summary.avg_rank).toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm tabular-nums text-zinc-500">—</span>
                      )}
                      <DeltaChip kind={deltaKind} value={deltaValue} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="border-t border-zinc-800">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
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
