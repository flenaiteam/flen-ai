'use client';

import { useMemo, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, LayoutGrid, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RankingGridScanDetailOut, RankingGridScanSummary } from '@/types/rankingGrid';

const TOP_10_BUCKETS = ['1-3', '4-6', '7-10'] as const;

function bucketCountSum(dist: Record<string, number> | undefined, keys: readonly string[]): number {
  if (!dist) return 0;
  return keys.reduce((acc, key) => acc + (Number(dist[key]) || 0), 0);
}

type Health = 'good' | 'fair' | 'poor' | 'neutral';

function KpiHint({ title, description }: { title: string; description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-strong)]"
        aria-label={`What is ${title}?`}
      >
        <Info className="h-3 w-3" />
      </TooltipTrigger>
      <TooltipContent
        className="z-[1200] w-80 max-w-[22rem] border border-[var(--border-default)] bg-[var(--bg-page)] p-4 text-[var(--text-primary)] shadow-xl"
        align="start"
        side="top"
      >
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function HealthStrip({ tone, label }: { tone: Health; label: string }) {
  if (tone === 'neutral') {
    return (
      <Badge variant="default" className="mt-1 max-w-full items-center justify-start text-[10px] px-1.5 py-0 gap-1 font-medium min-w-0">
        <Minus className="h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 truncate">{label}</span>
      </Badge>
    );
  }
  const variant = tone === 'good' ? 'success' : tone === 'fair' ? 'warning' : 'error';
  return (
    <Badge
      variant={variant}
      className="mt-1 max-w-full items-center justify-start text-[10px] px-1.5 py-0 gap-1 font-semibold min-w-0"
    >
      {tone === 'good' ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
      ) : (
        <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 truncate">{label}</span>
    </Badge>
  );
}

function DeltaBadge({ delta, lowerIsBetter = false }: { delta: number | null; lowerIsBetter?: boolean }) {
  if (delta == null || Math.abs(delta) < 0.05) {
    return <span className="text-[10px] tabular-nums text-[var(--text-muted)]">—</span>;
  }
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? '+' : '';
  return (
    <span
      className={cn(
        'text-[10px] font-semibold tabular-nums',
        improved ? 'text-emerald-400' : 'text-rose-400'
      )}
    >
      {sign}{delta.toFixed(1)}
    </span>
  );
}

function GridKpiCell({
  label,
  infoTitle,
  infoDescription,
  children,
  tone,
  toneLabel,
  delta,
  lowerIsBetter,
}: {
  label: string;
  infoTitle: string;
  infoDescription: string;
  children: ReactNode;
  tone?: Health;
  toneLabel?: string;
  delta?: number | null;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="min-w-0 bg-[var(--bg-surface)]/95 px-2 py-2 text-[var(--text-primary)] sm:px-2.5 sm:py-2">
      <div className="flex items-start justify-between gap-1">
        <p className="line-clamp-2 text-[10px] font-medium leading-tight text-[var(--text-secondary)]">{label}</p>
        <KpiHint title={infoTitle} description={infoDescription} />
      </div>
      <div className="mt-0.5">{children}</div>
      {delta !== undefined ? (
        <DeltaBadge delta={delta ?? null} lowerIsBetter={lowerIsBetter} />
      ) : null}
      {tone && toneLabel ? <HealthStrip tone={tone} label={toneLabel} /> : null}
    </div>
  );
}

function visibilityHealth(pct: number): Health {
  if (pct >= 45) return 'good';
  if (pct >= 20) return 'fair';
  return 'poor';
}

function avgMapRankHealth(rank: number): Health {
  if (rank <= 8) return 'good';
  if (rank <= 16) return 'fair';
  return 'poor';
}

function shareHealth(pct: number, inverted = false): Health {
  if (inverted) {
    if (pct <= 15) return 'good';
    if (pct <= 40) return 'fair';
    return 'poor';
  }
  if (pct >= 55) return 'good';
  if (pct >= 25) return 'fair';
  return 'poor';
}

export interface RankingGridScanKpisProps {
  summary: RankingGridScanSummary | null;
  points: RankingGridScanDetailOut['points'];
  previousSummary?: RankingGridScanSummary | null;
}

export function RankingGridScanKpis({ summary, points, previousSummary }: RankingGridScanKpisProps) {
  const extras = useMemo(() => {
    const total = summary?.total_grid_points ?? 0;
    const dist = summary?.ranking_distribution;
    if (!summary || total <= 0 || !dist) {
      return { top10Pct: null as number | null, notInMapPct: null as number | null, bestPinRank: null as number | null };
    }

    const top10 = bucketCountSum(dist, TOP_10_BUCKETS);
    const notFound = Number(dist.not_found) || 0;
    const numericRanks = points
      .map((point) => (point.rank != null ? Number(point.rank) : Number.NaN))
      .filter((rank) => Number.isFinite(rank) && rank > 0);
    const bestPinRank = numericRanks.length ? Math.min(...numericRanks) : null;

    return {
      top10Pct: Math.round((top10 / total) * 100),
      notInMapPct: Math.round((notFound / total) * 100),
      bestPinRank,
    };
  }, [summary, points]);

  if (!summary || summary.total_grid_points <= 0) return null;

  const rankedPct = Math.round((Number(summary.points_with_rank) / Number(summary.total_grid_points)) * 100);
  const prevRankedPct =
    previousSummary && previousSummary.total_grid_points > 0
      ? Math.round((Number(previousSummary.points_with_rank) / Number(previousSummary.total_grid_points)) * 100)
      : null;

  const prevTop10Pct =
    previousSummary && previousSummary.total_grid_points > 0
      ? Math.round(
          (bucketCountSum(previousSummary.ranking_distribution, TOP_10_BUCKETS) /
            previousSummary.total_grid_points) *
            100
        )
      : null;

  const prevNotInMapPct =
    previousSummary && previousSummary.total_grid_points > 0
      ? Math.round(
          ((Number(previousSummary.ranking_distribution?.not_found) || 0) /
            previousSummary.total_grid_points) *
            100
        )
      : null;

  const valueClass = 'text-xl font-bold tabular-nums leading-none tracking-tight text-[var(--text-primary)] sm:text-2xl';

  return (
    <div
      className={cn(
        'grid min-w-0 grid-cols-3 gap-px overflow-x-auto overflow-y-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)]',
        'sm:grid-cols-6'
      )}
      role="list"
      aria-label="How your business shows up on the map"
    >
      {summary.visibility_score != null ? (
        <GridKpiCell
          label="Top 3 pins"
          infoTitle="Top 3 results"
          infoDescription="How often you appear in the top three when someone searches your keyword from different spots on the map."
          tone={visibilityHealth(Number(summary.visibility_score))}
          toneLabel={
            visibilityHealth(Number(summary.visibility_score)) === 'good'
              ? 'Strong near you'
              : visibilityHealth(Number(summary.visibility_score)) === 'fair'
                ? 'Mixed across the map'
                : 'Few top spots'
          }
          delta={
            previousSummary?.visibility_score != null
              ? Number(summary.visibility_score) - Number(previousSummary.visibility_score)
              : null
          }
        >
          <p className={valueClass}>{Math.round(Number(summary.visibility_score))}%</p>
        </GridKpiCell>
      ) : null}
      {extras.top10Pct != null ? (
        <GridKpiCell
          label="Top 10 pins"
          infoTitle="First page of results"
          infoDescription="How often you show up in the first ten map results from each checked location."
          tone={shareHealth(extras.top10Pct)}
          toneLabel={
            shareHealth(extras.top10Pct) === 'good'
              ? 'Wide reach'
              : shareHealth(extras.top10Pct) === 'fair'
                ? 'Room to grow'
                : 'Narrow reach'
          }
          delta={prevTop10Pct != null ? extras.top10Pct - prevTop10Pct : null}
        >
          <p className={valueClass}>{extras.top10Pct}%</p>
        </GridKpiCell>
      ) : null}
      {summary.avg_rank != null ? (
        <GridKpiCell
          label="Avg. map rank"
          infoTitle="Typical ranking"
          infoDescription="Roughly where you rank on average across the whole map."
          tone={avgMapRankHealth(Number(summary.avg_rank))}
          toneLabel={
            avgMapRankHealth(Number(summary.avg_rank)) === 'good'
              ? 'Strong overall'
              : avgMapRankHealth(Number(summary.avg_rank)) === 'fair'
                ? 'Middle of the pack'
                : 'Needs improvement'
          }
          delta={
            previousSummary?.avg_rank != null
              ? Number(summary.avg_rank) - Number(previousSummary.avg_rank)
              : null
          }
          lowerIsBetter
        >
          <p className={valueClass}>{Number(summary.avg_rank).toFixed(1)}</p>
        </GridKpiCell>
      ) : null}
      {summary.points_with_rank != null ? (
        <GridKpiCell
          label="Pins with rank"
          infoTitle="How often you show up"
          infoDescription="Out of every place checked on the map, how often your business appeared in the results."
          tone={shareHealth(rankedPct)}
          toneLabel={
            shareHealth(rankedPct) === 'good'
              ? 'Seen in most areas'
              : shareHealth(rankedPct) === 'fair'
                ? 'On and off'
                : 'Often missing'
          }
          delta={prevRankedPct != null ? rankedPct - prevRankedPct : null}
        >
          <p className={valueClass}>{rankedPct}%</p>
        </GridKpiCell>
      ) : null}
      {extras.notInMapPct != null ? (
        <GridKpiCell
          label="Not in map"
          infoTitle="Where you do not appear"
          infoDescription="Share of map locations where your business did not show up."
          tone={shareHealth(extras.notInMapPct, true)}
          toneLabel={
            shareHealth(extras.notInMapPct, true) === 'good'
              ? 'Few blank spots'
              : shareHealth(extras.notInMapPct, true) === 'fair'
                ? 'Some blank spots'
                : 'Many blank spots'
          }
          delta={prevNotInMapPct != null ? extras.notInMapPct - prevNotInMapPct : null}
          lowerIsBetter
        >
          <p className={valueClass}>{extras.notInMapPct}%</p>
        </GridKpiCell>
      ) : null}
      {extras.bestPinRank != null ? (
        <GridKpiCell
          label="Best pin rank"
          infoTitle="Your best location"
          infoDescription="Your strongest single point on the map."
          tone={extras.bestPinRank <= 3 ? 'good' : extras.bestPinRank <= 10 ? 'fair' : 'poor'}
          toneLabel={
            extras.bestPinRank <= 3
              ? 'Standout spot'
              : extras.bestPinRank <= 10
                ? 'Solid high point'
                : 'Modest high point'
          }
        >
          <p className={valueClass}>#{extras.bestPinRank}</p>
        </GridKpiCell>
      ) : (
        <GridKpiCell
          label="Best pin rank"
          infoTitle="Your best location"
          infoDescription="Shown once your map data is loaded."
          tone="neutral"
          toneLabel="Loading..."
        >
          <p className="text-xl font-bold tabular-nums text-[var(--text-muted)] sm:text-2xl">-</p>
        </GridKpiCell>
      )}
    </div>
  );
}

export function RankingGridScanSetupRow({
  gridConfig,
  summary,
  pointsLength,
}: {
  gridConfig: RankingGridScanDetailOut['grid_config'];
  summary: RankingGridScanSummary | null;
  pointsLength: number;
}) {
  const radius =
    gridConfig?.radius_km != null ? (
      <>
        {gridConfig.radius_km} km
        {gridConfig.radius_mi != null ? <span className="text-[var(--text-muted)]"> ({gridConfig.radius_mi} mi)</span> : null}
      </>
    ) : (
      '-'
    );
  const points = (gridConfig?.points_with_data ?? summary?.total_grid_points ?? pointsLength) || '-';

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
      <span className="inline-flex shrink-0 items-center gap-1.5">
        <LayoutGrid className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden />
        <span className="text-[var(--text-muted)]">Setup</span>
        <span className="font-medium text-[var(--text-secondary)]">{gridConfig?.grid_label ?? '-'}</span>
      </span>
      <span className="text-[var(--text-muted)]">·</span>
      <span className="shrink-0">
        <span className="text-[var(--text-muted)]">Radius </span>
        <span className="font-medium text-[var(--text-secondary)]">{radius}</span>
      </span>
      <span className="text-[var(--text-muted)]">·</span>
      <span className="shrink-0">
        <span className="text-[var(--text-muted)]">Points </span>
        <span className="font-medium text-[var(--text-secondary)]">{points}</span>
      </span>
      <span className="text-[var(--text-muted)]">·</span>
      <span className="shrink-0">
        <span className="text-[var(--text-muted)]">Keywords </span>
        <span className="font-medium text-[var(--text-secondary)]">1</span>
      </span>
    </div>
  );
}

export function RankingGridMetricsStrip({
  gridConfig,
  summary,
  points,
  previousSummary,
}: {
  gridConfig: RankingGridScanDetailOut['grid_config'];
  summary: RankingGridScanSummary | null;
  points: RankingGridScanDetailOut['points'];
  previousSummary?: RankingGridScanSummary | null;
}) {
  const showKpis = summary != null && summary.total_grid_points > 0;
  return (
    <div className="shrink-0 border-b border-[var(--border-default)] bg-[var(--bg-page)] px-3 py-2">
      <RankingGridScanSetupRow gridConfig={gridConfig} summary={summary} pointsLength={points.length} />
      {showKpis ? (
        <div className="mt-2 min-w-0">
          <RankingGridScanKpis summary={summary} points={points} previousSummary={previousSummary} />
        </div>
      ) : null}
    </div>
  );
}
