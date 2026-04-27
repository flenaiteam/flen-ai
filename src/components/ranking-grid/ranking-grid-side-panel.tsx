'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RankingGridListingOut, RankingGridPointResultOut } from '@/types/rankingGrid';
import { RankingGridCompetitorDetail } from '@/components/ranking-grid/ranking-grid-competitor-detail';

export type RankingGridSelectedPointMeta = Pick<
  RankingGridPointResultOut,
  'point_index' | 'latitude' | 'longitude' | 'rank'
>;

interface RankingGridSidePanelProps {
  selectedPoint: RankingGridSelectedPointMeta | null;
  competitors: RankingGridListingOut[];
  selectedListingIndex: number | null;
  onSelectListing: (index: number) => void;
}

function coordToNum(v: string | number): number {
  return typeof v === 'number' ? v : parseFloat(v);
}

function formatCoordPair(lat: string | number, lng: string | number): string {
  return `${coordToNum(lat).toFixed(5)}, ${coordToNum(lng).toFixed(5)}`;
}

function mapsUrl(lat: string | number, lng: string | number): string {
  return `https://www.google.com/maps?q=${coordToNum(lat)},${coordToNum(lng)}`;
}

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
        'w-full border-b border-[var(--border-default)]/80 px-3 py-2.5 text-left transition-colors last:border-b-0',
        'hover:bg-[var(--bg-surface)]/70',
        isActive ? 'bg-[var(--bg-surface)]/75 ring-1 ring-inset ring-brand-500/30' : ''
      )}
    >
      <div className="flex gap-2">
        <span className="w-8 shrink-0 pt-0.5 text-xs tabular-nums text-[var(--text-muted)]">{rankLabel}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {listing.url ? (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {listing.title}
              </a>
            ) : (
              <span className="text-sm font-semibold text-[var(--text-primary)]">{listing.title}</span>
            )}
            {listing.is_own_business ? (
              <Badge variant="brand" className="px-1 py-px text-[10px] font-medium">
                You
              </Badge>
            ) : null}
          </div>
          {listing.address ? <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">{listing.address}</p> : null}
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {rating != null ? (
              <span className="inline-flex items-center gap-0.5 text-[var(--text-secondary)]">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
                {votes > 0 ? ` (${votes})` : ''}
              </span>
            ) : null}
            {rating != null && listing.category ? <span className="text-[var(--text-muted)]"> · </span> : null}
            {listing.category ? <span className="text-[var(--text-muted)]">{listing.category}</span> : null}
          </p>
        </div>
      </div>
    </button>
  );
}

export function RankingGridSidePanel({
  selectedPoint,
  competitors,
  selectedListingIndex,
  onSelectListing,
}: RankingGridSidePanelProps) {
  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const coordLine = useMemo(
    () =>
      selectedPoint
        ? formatCoordPair(selectedPoint.latitude, selectedPoint.longitude)
        : null,
    [selectedPoint]
  );

  const copyCoords = useCallback(async () => {
    if (!selectedPoint) return;
    try {
      await navigator.clipboard.writeText(formatCoordPair(selectedPoint.latitude, selectedPoint.longitude));
      setCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [selectedPoint]);

  useEffect(
    () => () => {
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    },
    []
  );

  const selectedCompetitor =
    selectedListingIndex != null && competitors[selectedListingIndex]
      ? competitors[selectedListingIndex]
      : null;

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[var(--bg-page)]">
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]/40 px-3 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Competitors</h2>
        {selectedPoint ? (
          <div className="mt-1 space-y-1">
            <p className="text-[11px] text-[var(--text-secondary)]">
              Point #{selectedPoint.point_index}
              {selectedPoint.rank != null ? ` · Rank ${selectedPoint.rank}` : ''}
            </p>
            <p className="font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">{coordLine}</p>
            <div className="flex gap-1 pt-0.5">
              <Button
                type="button"
                variant="base-ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => void copyCoords()}
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button type="button" variant="base-ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" asChild>
                <a
                  href={mapsUrl(selectedPoint.latitude, selectedPoint.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                  Maps
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-xs text-[var(--text-muted)]">Click a grid point to explore competitors.</p>
        )}
      </div>

      {!selectedPoint ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-[var(--text-muted)]">
          Select a pin on the map to load nearby competitors.
        </div>
      ) : (
        <>
          <div className="border-b border-[var(--border-default)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">
            Competitors ({competitors.length})
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {competitors.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
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
          {selectedCompetitor ? (
            <div className="max-h-[40%] shrink-0 overflow-y-auto border-t border-[var(--border-default)] bg-[var(--bg-surface)]/30 p-3">
              <RankingGridCompetitorDetail
                listing={selectedCompetitor}
                className="border-[var(--border-default)] bg-[var(--bg-surface)]/70 shadow-none"
              />
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
