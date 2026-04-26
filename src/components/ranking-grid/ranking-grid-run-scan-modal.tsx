'use client';

import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const GRID_SIZE_OPTIONS = [3, 5, 7, 9] as const;
const RADIUS_KM_OPTIONS = [0.5, 1, 2, 3] as const;

type GridSize = (typeof GRID_SIZE_OPTIONS)[number];
type RadiusKm = (typeof RADIUS_KM_OPTIONS)[number];

function SegmentedControl<T extends number>({
  options,
  value,
  onChange,
  formatLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  formatLabel: (v: T) => string;
}) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-md border border-zinc-700">
      {options.map((opt, i) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'flex-1 border-r border-zinc-700 px-3 py-2 text-sm font-medium transition-colors last:border-r-0',
            i === 0 && 'rounded-l-[5px]',
            i === options.length - 1 && 'rounded-r-[5px]',
            value === opt
              ? 'bg-primary text-primary-foreground'
              : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
          )}
        >
          {formatLabel(opt)}
        </button>
      ))}
    </div>
  );
}

export interface RunNewScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keywordText: string;
  onConfirm: (gridSize: number, radiusKm: number) => Promise<void>;
  isRunning: boolean;
}

export function RunNewScanModal({
  open,
  onOpenChange,
  keywordText,
  onConfirm,
  isRunning,
}: RunNewScanModalProps) {
  const [gridSize, setGridSize] = useState<GridSize>(5);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(0.5);

  const creditCost = gridSize * gridSize * 1; // multiply by keywordCount when multi-keyword scans are supported

  async function handleConfirm() {
    await onConfirm(gridSize, radiusKm);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-zinc-50">Run new scan</DialogTitle>
          {keywordText ? (
            <p className="mt-0.5 truncate text-sm text-zinc-400">
              Keyword: <span className="font-medium text-zinc-200">{keywordText}</span>
            </p>
          ) : null}
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-5">
          {/* Grid size */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-zinc-200">Grid size</span>
              <span className="text-xs text-zinc-500">
                {gridSize}×{gridSize} = {gridSize * gridSize} points
              </span>
            </div>
            <SegmentedControl
              options={GRID_SIZE_OPTIONS}
              value={gridSize}
              onChange={setGridSize}
              formatLabel={(v) => `${v}×${v}`}
            />
          </div>

          {/* Radius */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-zinc-200">Search radius</span>
              <span className="text-xs text-zinc-500">{radiusKm} km between points</span>
            </div>
            <SegmentedControl
              options={RADIUS_KM_OPTIONS}
              value={radiusKm}
              onChange={setRadiusKm}
              formatLabel={(v) => `${v} km`}
            />
          </div>

          {/* Credit cost card */}
          <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3">
            <Zap className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-300">
                This scan will use{' '}
                <span className="font-semibold text-zinc-50">{creditCost} credits</span>
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {gridSize}×{gridSize} grid · 1 keyword
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="base-ghost"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
            className="text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isRunning}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              `Start scan — ${creditCost} credits`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
