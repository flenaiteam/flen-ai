'use client';

import { useMemo } from 'react';
import { CheckCircle, Clock, LayoutGrid, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RankingGridOut } from '@/types/rankingGrid';

type GBPKeyword = { id: number; keyword: string; search_volume: number };

function formatNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

export interface RankingGridKeywordListProps {
  keywords: GBPKeyword[];
  gridsList: RankingGridOut[];
  selectedKeywordId: number | null;
  onSelectKeyword: (id: number) => void;
}

export function RankingGridKeywordList({
  keywords,
  gridsList,
  selectedKeywordId,
  onSelectKeyword,
}: RankingGridKeywordListProps) {
  const sorted = useMemo(
    () => [...keywords].sort((a, b) => b.search_volume - a.search_volume),
    [keywords]
  );

  const gridsMap = useMemo(() => {
    const m = new Map<number, boolean>();
    gridsList.forEach((g) => m.set(g.keyword_id, true));
    return m;
  }, [gridsList]);

  if (keywords.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <Search className="h-8 w-8 text-[var(--text-muted)]" aria-hidden />
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">No keywords yet</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Add keywords in the Keywords section to start tracking rankings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-default)] px-4 py-2.5 h-[38px]">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] ">
          Keywords ({keywords.length})
        </p>
      </div>
      <div className="max-h-[calc(100vh-262px)] flex-1 overflow-y-auto">
        {sorted.map((kw) => {
          const hasGrid = gridsMap.get(kw.id) ?? false;
          const isSelected = kw.id === selectedKeywordId;

          return (
            <button
              key={kw.id}
              type="button"
              onClick={() => onSelectKeyword(kw.id)}
              className={cn(
                'flex w-full items-center justify-between gap-3 border-b border-[var(--border-default)]/60 px-4 py-3 text-left transition-colors last:border-b-0',
                isSelected
                  ? 'bg-[var(--bg-subtle)]/80 '
                  : 'hover:bg-[var(--bg-surface)]/60'
              )}
            >
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-medium', isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
                  {kw.keyword}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {formatNumber(kw.search_volume)}/mo
                </p>
              </div>
              <div className="shrink-0">
                {hasGrid ? (
                  <Badge variant="success" className="text-[10px] px-2 py-0 shrink-0 gap-1 font-medium">
                    <CheckCircle className="h-3 w-3" aria-hidden />
                    Has grid
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-[10px] px-2 py-0 shrink-0 gap-1 font-medium">
                    <Clock className="h-3 w-3" aria-hidden />
                    No grid
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="shrink-0 border-t border-[var(--border-default)] px-4 py-2">
        <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
          {gridsMap.size} of {keywords.length} tracked
        </p>
      </div>
    </div>
  );
}
