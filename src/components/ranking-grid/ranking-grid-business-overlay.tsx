'use client';

import { cn } from '@/lib/utils';
import { RankingGridCompetitorDetail } from '@/components/ranking-grid/ranking-grid-competitor-detail';
import type { RankingGridListingOut } from '@/types/rankingGrid';

export interface RankingGridLeftPanelProps {
  listing: RankingGridListingOut;
  className?: string;
}

export function RankingGridLeftPanel({ listing, className }: RankingGridLeftPanelProps) {
  return (
    <div
      className={cn(
        'pointer-events-auto max-h-[calc(100vh-7rem)] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-page)]/90 shadow-xl backdrop-blur-md',
        className
      )}
    >
      <div className="max-h-[calc(100vh-7rem)] overflow-y-auto">
        <div className="p-3">
          <RankingGridCompetitorDetail listing={listing} className="border-[var(--border-default)] bg-[var(--bg-surface)]/50 shadow-none" />
        </div>
      </div>
    </div>
  );
}
