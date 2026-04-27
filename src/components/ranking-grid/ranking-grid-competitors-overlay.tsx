'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronDown, ChevronUp, Copy, ExternalLink, GripVertical, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RankingGridListingOut, RankingGridPointResultOut } from '@/types/rankingGrid';

export type RankingGridSelectedPointMeta = Pick<
  RankingGridPointResultOut,
  'point_index' | 'latitude' | 'longitude' | 'rank'
>;

function coordToNum(v: string | number): number {
  return typeof v === 'number' ? v : parseFloat(v);
}

function formatCoordPair(lat: string | number, lng: string | number): string {
  return `${coordToNum(lat).toFixed(5)}, ${coordToNum(lng).toFixed(5)}`;
}

function mapsUrl(lat: string | number, lng: string | number): string {
  return `https://www.google.com/maps?q=${coordToNum(lat)},${coordToNum(lng)}`;
}

export interface RankingGridCompetitorsOverlayProps {
  competitors: RankingGridListingOut[];
  selectedPoint: RankingGridSelectedPointMeta | null;
  selectedListingIndex: number | null;
  onSelectListing?: (index: number) => void;
  className?: string;
}

const VIEW_MARGIN = 8;

function CompetitorRowCompact({
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

  const titleEl = listing.url ? (
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
    <span className="text-sm font-semibold text-slate-100">{listing.title}</span>
  );

  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        'w-full border-b border-[var(--border-default)]/80 px-2 py-2.5 text-left transition-colors last:border-b-0',
        'hover:bg-[var(--bg-surface)]/80',
        isActive ? 'border-l-2 border-l-indigo-500 bg-[var(--bg-surface)]/50 pl-[6px]' : 'border-l-2 border-l-transparent'
      )}
    >
      <div className="flex gap-2">
        <span className="w-7 shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">{rankLabel}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {titleEl}
            {listing.is_own_business ? (
              <Badge variant="brand" className="px-1 py-px text-[10px] font-medium">
                You
              </Badge>
            ) : null}
          </div>
          {listing.address ? <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{listing.address}</p> : null}
          <p className="mt-0.5 text-xs text-slate-500">
            {rating != null ? (
              <span className="inline-flex items-center gap-0.5 text-slate-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
                {votes > 0 ? ` (${votes})` : ''}
              </span>
            ) : null}
            {rating != null && listing.category ? <span className="text-slate-600"> · </span> : null}
            {listing.category ? <span className="text-slate-500">{listing.category}</span> : null}
          </p>
        </div>
      </div>
    </button>
  );
}

type DragSession = {
  pointerId: number;
  clientX: number;
  clientY: number;
  rect: DOMRect;
  offsetX: number;
  offsetY: number;
};

export function RankingGridCompetitorsOverlay({
  competitors,
  selectedPoint,
  selectedListingIndex,
  onSelectListing,
  className,
}: RankingGridCompetitorsOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [copied, setCopied] = useState(false);
  const dragSessionRef = useRef<DragSession | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coordLine = selectedPoint ? formatCoordPair(selectedPoint.latitude, selectedPoint.longitude) : null;

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

  const onPointerMove = useCallback((e: PointerEvent) => {
    const session = dragSessionRef.current;
    const panel = panelRef.current;
    if (!session || !panel) return;

    const w = session.rect.width;
    const h = session.rect.height;
    const rawLeft = session.rect.left + (e.clientX - session.clientX);
    const rawTop = session.rect.top + (e.clientY - session.clientY);
    const maxLeft = window.innerWidth - VIEW_MARGIN - w;
    const maxTop = window.innerHeight - VIEW_MARGIN - h;
    const clampedLeft = Math.min(Math.max(VIEW_MARGIN, rawLeft), maxLeft);
    const clampedTop = Math.min(Math.max(VIEW_MARGIN, rawTop), maxTop);

    setOffset({
      x: session.offsetX + (clampedLeft - session.rect.left),
      y: session.offsetY + (clampedTop - session.rect.top),
    });
  }, []);

  const endDrag = useCallback(() => {
    const session = dragSessionRef.current;
    const panel = panelRef.current;
    if (session && panel?.hasPointerCapture(session.pointerId)) {
      panel.releasePointerCapture(session.pointerId);
    }
    dragSessionRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  }, [onPointerMove]);

  const onHeaderPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const panel = panelRef.current;
      if (!panel) return;
      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      dragSessionRef.current = {
        pointerId: e.pointerId,
        clientX: e.clientX,
        clientY: e.clientY,
        rect,
        offsetX: offset.x,
        offsetY: offset.y,
      };
      panel.setPointerCapture(e.pointerId);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    },
    [endDrag, onPointerMove, offset.x, offset.y]
  );

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    },
    [endDrag, onPointerMove]
  );

  return (
    <div
      ref={panelRef}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className={cn(
        'pointer-events-auto flex min-h-0 w-[min(300px,92vw)] max-h-[min(72vh,calc(100dvh-6.5rem))] flex-col overflow-hidden rounded-2xl border border-amber-200/25 bg-[var(--bg-page)]/92 shadow-xl shadow-amber-900/10 ring-1 ring-amber-400/10 backdrop-blur-md',
        className
      )}
    >
      <div
        role="toolbar"
        aria-label="Competitors panel"
        className="flex shrink-0 cursor-grab touch-none items-start gap-1 border-b border-amber-200/15 bg-gradient-to-r from-amber-500/5 to-transparent px-2 py-2 active:cursor-grabbing"
        onPointerDown={onHeaderPointerDown}
      >
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/50" />
        <div className="min-w-0 flex-1 select-none">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-100/90">Competitors</h2>
          {!minimized ? (
            <div className="mt-1 space-y-1">
              {selectedPoint ? (
                <>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Point #{selectedPoint.point_index}
                    {selectedPoint.rank != null ? ` · Rank ${selectedPoint.rank}` : ''} · drag header to move
                  </p>
                  <p className="font-mono text-[11px] tabular-nums tracking-tight text-amber-50/95">{coordLine}</p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <Button
                      type="button"
                      variant="base-ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15 hover:text-amber-50"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyCoords();
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      type="button"
                      variant="base-ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px] text-amber-200 hover:bg-amber-500/15 hover:text-amber-50"
                      asChild
                    >
                      <a
                        href={mapsUrl(selectedPoint.latitude, selectedPoint.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Maps
                      </a>
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[10px] text-[var(--text-muted)]">Select a grid point on the map · drag header to move</p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-muted)]">
              {competitors.length > 0 ? `${competitors.length} listed` : 'None'}
              {coordLine ? <span className="ml-1 font-mono tabular-nums text-[var(--text-muted)]">{coordLine}</span> : null}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="base-ghost"
          size="icon"
          className="mt-0.5 h-8 w-8 shrink-0 text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]/80 hover:text-[var(--text-primary)]"
          aria-label={minimized ? 'Expand competitors list' : 'Minimize competitors list'}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setMinimized((m) => !m);
          }}
        >
          {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {!minimized ? (
        <div className="min-h-0 overflow-y-auto overscroll-contain [max-height:min(56vh,calc(100dvh-9rem))]">
          {competitors.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
              {selectedPoint
                ? 'No listings returned for this pin. Coordinates are shown above.'
                : 'Select a grid point on the map to see competitors.'}
            </div>
          ) : (
            <div className="py-0.5">
              {competitors.map((listing, idx) => (
                <CompetitorRowCompact
                  key={`${listing.place_id ?? idx}-${listing.title}`}
                  listing={listing}
                  isActive={selectedListingIndex === idx}
                  onActivate={() => onSelectListing?.(idx)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
