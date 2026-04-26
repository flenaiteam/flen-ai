'use client';

import dynamic from 'next/dynamic';
import { Loader2, ScanSearch, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { RankingGridScanKpis } from '@/components/ranking-grid/ranking-grid-scan-kpis';
import type {
  RankingGridListingOut,
  RankingGridPointResultOut,
  RankingGridScanDetailOut,
  RankingGridScanSummary,
} from '@/types/rankingGrid';

const RankingGridMap = dynamic(
  () => import('@/components/ranking-grid/ranking-grid-map').then((m) => m.RankingGridMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900/50 text-sm text-zinc-500">
        Loading map...
      </div>
    ),
  }
);

function CompetitorRow({
  listing,
  isActive,
  onActivate,
}: {
  listing: RankingGridListingOut;
  isActive: boolean;
  onActivate: () => void;
}) {
  const rating = listing.rating_value != null ? parseFloat(listing.rating_value) : null;
  const votes = listing.rating_votes_count ?? 0;
  const rank = listing.rank_absolute ?? listing.rank_group;
  const rankLabel = rank != null ? `#${rank}` : '-';

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        'w-full border-b border-zinc-800/70 px-3 py-2.5 text-left transition-colors last:border-b-0',
        isActive ? 'bg-zinc-900/70' : 'hover:bg-zinc-900/40'
      )}
    >
      <div className="flex gap-2">
        <span className="w-8 shrink-0 pt-0.5 text-xs tabular-nums text-zinc-500">{rankLabel}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{listing.title}</p>
          {listing.address ? <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{listing.address}</p> : null}
          <p className="mt-0.5 text-xs text-zinc-500">
            {rating != null ? (
              <span className="inline-flex items-center gap-0.5 text-zinc-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
                {votes > 0 ? ` (${votes})` : ''}
              </span>
            ) : (
              'No rating'
            )}
          </p>
        </div>
      </div>
    </button>
  );
}

export interface RankingGridViewerSheetProps {
  open: boolean;
  onClose: () => void;
  keywordText: string;
  currentDetail: RankingGridScanDetailOut | undefined;
  showDetailLoader: boolean;
  isScanInProgress: boolean;
  scanIdForDetail: string | null;
  previousSummary: RankingGridScanSummary | null;
  points: RankingGridPointResultOut[];
  selectedPointIndex: number | null;
  onSelectPoint: (idx: number) => void;
  competitors: RankingGridListingOut[];
  selectedListingIndex: number | null;
  onSelectListing: (idx: number) => void;
}

export function RankingGridViewerSheet({
  open,
  onClose,
  keywordText,
  currentDetail,
  showDetailLoader,
  isScanInProgress,
  scanIdForDetail,
  previousSummary,
  points,
  selectedPointIndex,
  onSelectPoint,
  competitors,
  selectedListingIndex,
  onSelectListing,
}: RankingGridViewerSheetProps) {
  const summary = currentDetail?.summary ?? null;
  const selectedPoint =
    selectedPointIndex != null ? points.find((p) => p.point_index === selectedPointIndex) : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-0 p-0',
          'inset-x-0 bottom-0 h-[95vh] w-full rounded-t-xl border-t border-zinc-800',
          'bg-zinc-950 text-zinc-100',
          'data-[side=bottom]:max-w-none'
        )}
      >
        <SheetTitle className="sr-only">Ranking Grid Viewer</SheetTitle>

        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_18rem] border-b border-zinc-800 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0 border-r border-zinc-800 p-2">
            {currentDetail ? (
              <RankingGridScanKpis summary={summary} points={points} previousSummary={previousSummary} />
            ) : (
              <div className="px-2 py-3 text-sm text-zinc-500">
                {keywordText ? `Keyword: ${keywordText}` : 'Ranking Grid'}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Competition list
              </p>
              {selectedPoint ? (
                <p className="truncate text-[11px] text-zinc-500">
                  Point #{selectedPoint.point_index}
                  {selectedPoint.rank != null ? ` · Rank ${selectedPoint.rank}` : ''}
                </p>
              ) : (
                <p className="truncate text-[11px] text-zinc-500">Select a map pin</p>
              )}
            </div>
            <Button
              variant="base-ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="relative min-h-0 flex-1 bg-zinc-950">
            {!currentDetail && !showDetailLoader ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800/60">
                  <ScanSearch className="h-7 w-7 text-zinc-500" aria-hidden />
                </div>
                <p className="text-sm text-zinc-500">
                  {scanIdForDetail ? 'Loading scan data...' : 'Select a scan to view the map.'}
                </p>
              </div>
            ) : (
              <RankingGridMap
                className="absolute inset-0 z-0"
                mapKey={scanIdForDetail ?? undefined}
                points={points}
                selectedPointIndex={selectedPointIndex}
                onSelectPoint={onSelectPoint}
              />
            )}
            {showDetailLoader && (
              <div className="absolute inset-0 z-[1010] flex flex-col items-center justify-center gap-2 bg-zinc-950/85 text-sm text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
                <span>Loading scan...</span>
              </div>
            )}
            {isScanInProgress ? (
              <div className="absolute left-3 top-3 z-[1011] rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-xs text-amber-200">
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                  Scan in progress
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex h-[calc(100vh-105px)] min-h-0 flex-col border-l border-zinc-800 bg-zinc-950">
            <div className="shrink-0 border-b border-zinc-800 px-3 py-2 text-[11px] text-zinc-400">
              Competitors ({competitors.length})
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!selectedPoint ? (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                  Select a pin on the map to load nearby competitors.
                </div>
              ) : competitors.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">
                  No listings returned for this pin.
                </div>
              ) : (
                competitors.map((listing, idx) => (
                  <CompetitorRow
                    key={`${listing.place_id ?? idx}-${listing.title}`}
                    listing={listing}
                    isActive={selectedListingIndex === idx}
                    onActivate={() => onSelectListing(idx)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
