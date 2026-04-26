'use client';

import { Loader2, Plus, ScanSearch, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MergedRankingGridScanRow } from '@/types/rankingGrid';

type DeltaKind = 'improved' | 'declined' | 'unchanged' | 'first_scan';

function computeDelta(
  current: MergedRankingGridScanRow,
  previous: MergedRankingGridScanRow | undefined
): DeltaKind {
  if (!previous) return 'first_scan';
  const curr = current.summary?.avg_rank;
  const prev = previous.summary?.avg_rank;
  if (curr == null || prev == null) return 'unchanged';
  const diff = Number(curr) - Number(prev);
  if (diff < -0.05) return 'improved';
  if (diff > 0.05) return 'declined';
  return 'unchanged';
}

function DeltaChip({
  kind,
  value,
}: {
  kind: DeltaKind;
  value: number | null | undefined;
}) {
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

function formatScanDate(scan: MergedRankingGridScanRow): string {
  const raw = scan.summary?.scan_date ?? scan.created_at;
  if (!raw) return scan.public_id.slice(0, 8);
  return new Date(raw).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatScanConfig(scan: MergedRankingGridScanRow): string {
  const size = scan.grid_size;
  const radius = scan.radius_km != null ? `${scan.radius_km} km` : null;
  const points = scan.summary?.total_grid_points ?? size * size;
  return [`${size}×${size}`, radius, `${points} points`].filter(Boolean).join(' · ');
}

export interface RankingGridScanHistoryPanelProps {
  keywordText: string;
  scans: MergedRankingGridScanRow[];
  selectedScanId: string | null;
  isLoading: boolean;
  onSelectScan: (id: string) => void;
  onOpenScan: () => void;
  onRunNewScan: () => void;
}

export function RankingGridScanHistoryPanel({
  keywordText,
  scans,
  selectedScanId,
  isLoading,
  onSelectScan,
  onOpenScan,
  onRunNewScan,
}: RankingGridScanHistoryPanelProps) {
  const selectedScan = selectedScanId
    ? scans.find((s) => s.public_id === selectedScanId)
    : scans[0] ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 flex justify-between items-center border-b border-zinc-800 px-4 py-2 h-[38px]" >
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
          Scan history
        </p>
        {keywordText ? (
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-200">{keywordText}</p>
        ) : null}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-zinc-500 p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading scans…
        </div>
      ) : scans.length === 0 ? (
        /* No scans empty state */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/60">
            <ScanSearch className="h-6 w-6 text-zinc-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">No scans yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Run a scan to start tracking map rankings for this keyword.
            </p>
          </div>
          <Button
            onClick={onRunNewScan}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Run first scan
          </Button>
        </div>
      ) : (
        /* Scan history list */
        <>
          <div className="max-h-[calc(100vh-330px)] min-h-0 flex-1 overflow-y-auto">
            {scans.map((scan, idx) => {
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
                    'flex w-full items-center justify-between gap-3 border-b border-zinc-800/60 px-4 py-3 text-left transition-colors last:border-b-0',
                    isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/60'
                  )}
                  onClick={() => {
                    onSelectScan(scan.public_id);
                    onOpenScan();
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {formatScanDate(scan)}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                      {formatScanConfig(scan)}
                    </p>
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
            })}
          </div>

          {/* CTA: open selected scan in full sheet */}
          {selectedScan && (
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 p-3">
              <Button
                onClick={onOpenScan}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                View on map
              </Button>
            </div>
          )}
        </>
      )}

      {/* Footer: run new scan */}
      <div className="shrink-0 border-t border-zinc-800">
        <button
          type="button"
          onClick={onRunNewScan}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Run new scan
        </button>
      </div>
    </div>
  );
}
