"use client";

import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, Image as ImageIcon, Megaphone } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useGetGBPPostTimeseriesQuery } from "@/lib/api/baseApi";
import { GbpTimeseriesFilters, defaultTimeseriesFilters } from "@/components/gbp/gbp-timeseries-filters";
import { chartSurface } from "@/components/gbp/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type GBPPostTimeSeriesPoint = {
  period_start: string;
  post_count: number;
  with_media_count: number;
  with_media_pct: number;
  with_cta_count: number;
  with_cta_pct: number;
  offer_count: number;
  event_count: number;
  update_count: number;
  whats_new_count: number;
  other_count: number;
};

function labelForDate(value: string, granularity: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (granularity === "month") return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Dashboard-aligned chart area height */
const CHART_PX = 240;

// ── Post mix (stacked counts → multi-series areas, same colors as previous ECharts) ──
const POST_MIX_METRICS = ["offer_count", "event_count", "update_count", "whats_new_count", "other_count"] as const;
type PostMixKey = (typeof POST_MIX_METRICS)[number];

const POST_MIX_COLORS: Record<PostMixKey, string> = {
  offer_count: "#16a34a",
  event_count: "#0d9488",
  update_count: "#0284c7",
  whats_new_count: "#4f46e5",
  other_count: "#64748b",
};

const POST_MIX_LABELS: Record<PostMixKey, string> = {
  offer_count: "Offer",
  event_count: "Event",
  update_count: "Update",
  whats_new_count: "What's new",
  other_count: "Other",
};

// ── Media / CTA coverage (counts on left, % on right — like prior dual-axis ECharts) ──
const COVERAGE_METRICS = ["post_count", "with_media_pct", "with_cta_pct"] as const;
type CoverageKey = (typeof COVERAGE_METRICS)[number];

const COVERAGE_COLORS: Record<CoverageKey, string> = {
  post_count: "rgb(22, 163, 74)",
  with_media_pct: "#16a34a",
  with_cta_pct: "#15803d",
};

const COVERAGE_LABELS: Record<CoverageKey, string> = {
  post_count: "Post count",
  with_media_pct: "Media %",
  with_cta_pct: "CTA %",
};

type ChartStateShellProps = {
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyText: string;
  errorText: string;
  children: ReactNode;
};

function ChartStateShell({ loading, error, empty, emptyText, errorText, children }: ChartStateShellProps) {
  if (loading) {
    return <Skeleton className="w-full rounded-md" style={{ height: CHART_PX }} />;
  }
  if (error) {
    return (
      <Card className="rounded-xl border border-destructive/40 p-6 text-sm text-muted-foreground">{errorText}</Card>
    );
  }
  if (empty) {
    return (
      <div
        className="flex items-center justify-center text-sm text-[var(--text-muted)]"
        style={{ height: CHART_PX }}
      >
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
}

export function GBPPostTrends({ locationPublicId }: { locationPublicId?: string }) {
  const [filters, setFilters] = useState(defaultTimeseriesFilters());
  const { data, isLoading, error } = useGetGBPPostTimeseriesQuery(
    {
      locationPublicId: locationPublicId || "",
      date_from: filters.dateFrom,
      date_to: filters.dateTo,
      granularity: filters.granularity,
    },
    { skip: !locationPublicId }
  );

  const chartData = useMemo(
    () =>
      (data?.data ?? []).map((point: GBPPostTimeSeriesPoint) => ({
        ...point,
        label: labelForDate(point.period_start, filters.granularity),
      })),
    [data, filters.granularity]
  );

  const showLoading = isLoading;
  const showError = !!error;
  const showEmpty = !isLoading && !error && chartData.length === 0;

  return (
    <div className={`mt-6 ${chartSurface.sectionGap}`}>
      <div>
        <p className={chartSurface.title}>Trends</p>
        <p className={chartSurface.subtitle}>Publishing cadence, content mix, and rich-content coverage over time.</p>
      </div>
      <GbpTimeseriesFilters value={filters} onChange={setFilters} />
      <div className="grid grid-cols-1 gap-5">
        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Megaphone className={`h-4 w-4 shrink-0 ${chartSurface.postAccent}`} />
                <CardTitle className="text-base font-semibold">Post volume and content mix</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {POST_MIX_METRICS.map((m) => (
                  <span key={m} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: POST_MIX_COLORS[m] }}
                    />
                    {POST_MIX_LABELS[m]}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartStateShell
              loading={showLoading}
              error={showError}
              empty={showEmpty}
              emptyText="No post trend data in this range. Sync posts or widen the date range."
              errorText="Unable to load post trends for the selected range."
            >
              <div className="h-[240px] w-full" style={{ minHeight: CHART_PX }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 4 }}>
                    <defs>
                      {POST_MIX_METRICS.map((m) => (
                        <linearGradient key={m} id={`grad-mix-${m}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={POST_MIX_COLORS[m]} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={POST_MIX_COLORS[m]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}
                      itemStyle={{ color: "var(--text-secondary)" }}
                      formatter={(value: number, name: string) => [
                        typeof value === "number" ? value.toLocaleString() : String(value),
                        POST_MIX_LABELS[name as PostMixKey] ?? name,
                      ]}
                    />
                    {POST_MIX_METRICS.map((m) => (
                      <Area
                        key={m}
                        type="monotone"
                        dataKey={m}
                        name={m}
                        stroke={POST_MIX_COLORS[m]}
                        strokeWidth={2}
                        fill={`url(#grad-mix-${m})`}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartStateShell>
          </CardContent>
        </Card>

        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ImageIcon className={`h-4 w-4 shrink-0 ${chartSurface.postAccent}`} />
                <CardTitle className="text-base font-semibold">Media and CTA coverage</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                {COVERAGE_METRICS.map((m) => (
                  <span key={m} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COVERAGE_COLORS[m] }}
                    />
                    {COVERAGE_LABELS[m]}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartStateShell
              loading={showLoading}
              error={showError}
              empty={showEmpty}
              emptyText="No coverage trend data in this range."
              errorText="Unable to load media and CTA coverage trends."
            >
              <div className="h-[240px] w-full" style={{ minHeight: CHART_PX }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <defs>
                      {COVERAGE_METRICS.map((m) => (
                        <linearGradient key={m} id={`grad-cov-${m}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COVERAGE_COLORS[m]} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={COVERAGE_COLORS[m]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 4 }}
                      itemStyle={{ color: "var(--text-secondary)" }}
                      formatter={(value: number, name: string) => {
                        const key = name as CoverageKey;
                        if (key === "with_media_pct" || key === "with_cta_pct") {
                          return [`${Number(value).toFixed(0)}%`, COVERAGE_LABELS[key] ?? name];
                        }
                        return [Number(value).toLocaleString(), COVERAGE_LABELS[key] ?? name];
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="post_count"
                      name="post_count"
                      stroke={COVERAGE_COLORS.post_count}
                      strokeWidth={2}
                      fill="url(#grad-cov-post_count)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="with_media_pct"
                      name="with_media_pct"
                      stroke={COVERAGE_COLORS.with_media_pct}
                      strokeWidth={2}
                      fill="url(#grad-cov-with_media_pct)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="with_cta_pct"
                      name="with_cta_pct"
                      stroke={COVERAGE_COLORS.with_cta_pct}
                      strokeWidth={2}
                      fill="url(#grad-cov-with_cta_pct)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartStateShell>
          </CardContent>
        </Card>
      </div>
      <div className={`flex items-center gap-2 ${chartSurface.helper}`}>
        <BarChart3 className="h-3.5 w-3.5" />
        Percent overlays show how many posts in each bucket include media and CTA links.
      </div>
    </div>
  );
}
