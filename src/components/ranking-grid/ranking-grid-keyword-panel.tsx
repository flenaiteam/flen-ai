'use client';

import { useMemo, useState } from 'react';
import { CheckCircle, ChevronDown, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { RankingGridOut } from '@/types/rankingGrid';

type GBPKeyword = {
  id: number;
  keyword: string;
  search_volume: number;
};

export interface RankingGridKeywordPanelProps {
  keywords: GBPKeyword[];
  gridsList: RankingGridOut[];
  keywordId: number | null;
  onSelectKeyword: (id: number) => void;
  triggerClassName?: string;
  labelClassName?: string;
}

function hasGridForKeyword(gridsList: RankingGridOut[], keywordId: number): boolean {
  return gridsList.some((g) => g.keyword_id === keywordId);
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function RankingGridKeywordPanel({
  keywords,
  gridsList,
  keywordId,
  onSelectKeyword,
  triggerClassName,
  labelClassName,
}: RankingGridKeywordPanelProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => [...keywords].sort((a, b) => b.search_volume - a.search_volume), [keywords]);
  const selected = keywordId != null ? keywords.find((k) => k.id === keywordId) : null;
  const selectedHasGrid = keywordId != null && hasGridForKeyword(gridsList, keywordId);

  const triggerSummary = selected ? (
    <span className="truncate text-left">
      <span className="font-medium text-zinc-100">{selected.keyword}</span>
      <span className="font-normal text-zinc-500"> · {formatNumber(selected.search_volume)}/mo</span>
      <span className="font-normal text-zinc-500"> · {selectedHasGrid ? 'Has grid' : 'No grid yet'}</span>
    </span>
  ) : (
    <span className="text-zinc-500">Select keyword...</span>
  );

  return (
    <div className="flex flex-col gap-1">
      <Label className={cn('text-xs text-zinc-400', labelClassName)}>Keyword</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'inline-flex h-9 w-[min(100%,380px)] max-w-full items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm font-normal text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100',
            triggerClassName
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{triggerSummary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(560px,calc(100vw-2rem))] border-zinc-700 bg-zinc-950 p-0 text-zinc-100 shadow-xl"
        >
          <div className="border-b border-zinc-800 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Keywords by volume
            </p>
          </div>
          <div className="h-[min(360px,50vh)] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="h-9 text-zinc-400">Keyword</TableHead>
                  <TableHead className="h-9 w-[100px] text-right text-zinc-400">Volume</TableHead>
                  <TableHead className="h-9 w-[140px] text-zinc-400">Grid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-zinc-500">
                      No keywords for this location.
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((kw) => {
                    const hasGrid = hasGridForKeyword(gridsList, kw.id);
                    const isSelected = kw.id === keywordId;
                    return (
                      <TableRow
                        key={kw.id}
                        className={cn(
                          'cursor-pointer border-zinc-800',
                          isSelected ? 'bg-zinc-800/60' : 'hover:bg-zinc-900'
                        )}
                        onClick={() => {
                          onSelectKeyword(kw.id);
                          setOpen(false);
                        }}
                      >
                        <TableCell className="max-w-[220px] py-2 font-medium text-zinc-100">
                          <span className="line-clamp-2">{kw.keyword}</span>
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums text-zinc-300">
                          {formatNumber(kw.search_volume)}
                        </TableCell>
                        <TableCell className="py-2">
                          {hasGrid ? (
                            <Badge
                              variant="base-outline"
                              className="inline-flex items-center gap-1 border-emerald-800/80 bg-emerald-950/40 text-[10px] font-medium text-emerald-200"
                            >
                              <CheckCircle className="h-3 w-3" aria-hidden />
                              Has grid
                            </Badge>
                          ) : (
                            <Badge
                              variant="base-outline"
                              className="inline-flex items-center gap-1 border-amber-700/60 bg-amber-950/30 text-[10px] font-medium text-amber-200"
                            >
                              <Clock className="h-3 w-3" aria-hidden />
                              No grid yet
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
