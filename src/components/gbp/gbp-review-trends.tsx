"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, BarChart3, MessageSquareReply, Star, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Label,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useGetGBPReviewTimeseriesQuery, useGetGBPReviewsQuery } from "@/lib/api/baseApi";
import { GbpTimeseriesFilters, defaultTimeseriesFilters } from "@/components/gbp/gbp-timeseries-filters";
import { chartSurface } from "@/components/gbp/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type GBPReviewTimeSeriesPoint = {
  period_start: string;
  review_count: number;
  avg_rating: number | null;
  replied_count: number;
  reply_rate_pct: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
};

const CHART_PX = 240;

const VOL_COUNT_COLOR = "#e11d48";
const AVG_RATING_COLOR = "#be123c";

const SENT_POS = "#10b981";
const SENT_NEU = "#f59e0b";
const SENT_NEG = "#ef4444";
const REPLY_LINE = "#ea580c";

/** Recharts tooltip values are `ValueType` (number | string | array), not `number` only. */
function tooltipToOptionalNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(value) && value.length > 0) {
    const n = Number(value[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

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

function labelForDate(value: string, granularity: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (granularity === "month") return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GBPReviewTrends({ locationPublicId }: { locationPublicId?: string }) {
  const [filters, setFilters] = useState(defaultTimeseriesFilters());
  const { data: reviewsData } = useGetGBPReviewsQuery(
    { locationPublicId: locationPublicId || "", page: 1, page_size: 1, sort: "-timestamp" },
    { skip: !locationPublicId, refetchOnMountOrArgChange: true }
  );
  const { data, isLoading, error } = useGetGBPReviewTimeseriesQuery(
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
      (data?.data ?? []).map((point: GBPReviewTimeSeriesPoint) => ({
        ...point,
        label: labelForDate(point.period_start, filters.granularity),
      })),
    [data, filters.granularity]
  );

  const showLoading = isLoading;
  const showError = !!error;
  const showEmpty = !isLoading && !error && chartData.length === 0;

  const ratingDistribution = useMemo(() => {
    const raw = reviewsData as Record<string, unknown> | undefined;
    if (!raw) return null;

    const topMeta = raw.meta_data as Record<string, unknown> | undefined;
    const nestedData = raw.data as Record<string, unknown> | undefined;
    const nestedMeta = nestedData?.meta_data as Record<string, unknown> | undefined;
    const summary =
      (topMeta?.summary as Record<string, unknown> | undefined) ??
      (nestedMeta?.summary as Record<string, unknown> | undefined);
    const distribution = summary?.rating_distribution as Record<string, unknown> | undefined;

    if (!distribution || typeof distribution !== "object") return null;

    return {
      "5": Number(distribution["5"] ?? 0),
      "4": Number(distribution["4"] ?? 0),
      "3": Number(distribution["3"] ?? 0),
      "2": Number(distribution["2"] ?? 0),
      "1": Number(distribution["1"] ?? 0),
    };
  }, [reviewsData]);

  return (
    <div className={`mt-6 ${chartSurface.sectionGap}`}>
      <div className="rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5">
        {ratingDistribution &&
        Object.values(ratingDistribution).some((count) => typeof count === "number" && count > 0) ? (
          (() => {
            const pieChartData = [5, 4, 3, 2, 1]
              .map((rating) => {
                const count = ratingDistribution[rating.toString() as keyof typeof ratingDistribution] || 0;
                return {
                  rating: rating.toString(),
                  count,
                  color:
                    rating === 5
                      ? "#22c55e"
                      : rating === 4
                        ? "#3b82f6"
                        : rating === 3
                          ? "#f59e0b"
                          : rating === 2
                            ? "#f97316"
                            : "#ef4444",
                };
              })
              .filter((item) => item.count > 0);

            const totalReviews = pieChartData.reduce((acc, curr) => acc + curr.count, 0);
            return (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Rating breakdown</p>
                    <p className="text-xs text-muted-foreground">Share of your public reviews</p>
                  </div>
                </div>
                <div className="flex flex-col items-stretch gap-6 sm:flex-row sm:items-center">
                  <div className="mx-auto aspect-square w-full max-w-[200px] shrink-0">
                    <PieChart width={200} height={200}>
                      <Pie data={pieChartData} dataKey="count" nameKey="rating" innerRadius={48} outerRadius={82} strokeWidth={3}>
                        {pieChartData.map((item) => (
                          <Cell key={`cell-${item.rating}`} fill={item.color} />
                        ))}
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              return (
                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                  <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-xl font-bold">
                                    {totalReviews.toLocaleString()}
                                  </tspan>
                                  <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-[10px]">
                                    reviews
                                  </tspan>
                                </text>
                              );
                            }
                            return null;
                          }}
                        />
                      </Pie>
                    </PieChart>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-3" aria-label="Rating breakdown">
                    {pieChartData.map((item) => {
                      const pct = totalReviews > 0 ? Math.round((item.count / totalReviews) * 100) : 0;
                      const label = `${item.rating}★`;
                      return (
                        <li key={item.rating} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border/80" style={{ backgroundColor: item.color }} />
                              <span className="shrink-0 font-medium tabular-nums text-foreground">{label}</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{item.count.toLocaleString()}</span>
                              <span className="text-muted-foreground/90"> · {pct}%</span>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="flex min-h-[160px] flex-col items-center justify-center px-4 text-center">
            <Star className="mb-2 h-8 w-8 text-muted-foreground/35" />
            <p className="text-sm text-muted-foreground">Breakdown appears when rating data is available.</p>
          </div>
        )}
      </div>
      <div>
        <p className={chartSurface.title}>Trends</p>
        <p className={chartSurface.subtitle}>Review volume, average rating, and reply behavior over time.</p>
      </div>
      <GbpTimeseriesFilters value={filters} onChange={setFilters} />
      <div className="grid grid-cols-1 gap-5">
        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <TrendingUp className={`h-4 w-4 shrink-0 ${chartSurface.reviewAccent}`} />
                <CardTitle className="text-base font-semibold">Review volume and average rating</CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VOL_COUNT_COLOR }} />
                  Review count
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AVG_RATING_COLOR }} />
                  Avg rating
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartStateShell
              loading={showLoading}
              error={showError}
              empty={showEmpty}
              emptyText="No review trend data in this range. Sync reviews or widen the date range."
              errorText="Unable to load review trends for the selected range."
            >
              <div className="w-full" style={{ height: CHART_PX }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                    <defs>
                      <linearGradient id="grad-rev-count" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={VOL_COUNT_COLOR} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={VOL_COUNT_COLOR} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="grad-rev-rating" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={AVG_RATING_COLOR} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={AVG_RATING_COLOR} stopOpacity={0} />
                      </linearGradient>
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
                      domain={[1, 5]}
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
                      formatter={(value, name) => {
                        const n = String(name);
                        if (n === "review_count" || n === "Review count") {
                          const num = tooltipToOptionalNumber(value);
                          return [num != null ? num.toLocaleString() : "—", "Review count"];
                        }
                        if (n === "avg_rating" || n === "Avg rating") {
                          const num = tooltipToOptionalNumber(value);
                          if (num == null) return ["—", "Avg rating"];
                          return [num.toFixed(1), "Avg rating"];
                        }
                        return [String(value), n];
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="review_count"
                      name="Review count"
                      stroke={VOL_COUNT_COLOR}
                      strokeWidth={2}
                      fill="url(#grad-rev-count)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_rating"
                      name="Avg rating"
                      stroke={AVG_RATING_COLOR}
                      strokeWidth={2}
                      fill="url(#grad-rev-rating)"
                      connectNulls
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
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
                <MessageSquareReply className={`h-4 w-4 shrink-0 ${chartSurface.reviewAccent}`} />
                <CardTitle className="text-base font-semibold">Replies and sentiment mix</CardTitle>
              </div>
              <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
                {[
                  { c: SENT_POS, t: "Positive" },
                  { c: SENT_NEU, t: "Neutral" },
                  { c: SENT_NEG, t: "Negative" },
                  { c: REPLY_LINE, t: "Reply rate" },
                ].map((row) => (
                  <span key={row.t} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.c }} />
                    {row.t}
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
              emptyText="No reply/sentiment trend data in this range."
              errorText="Unable to load reply and sentiment trends."
            >
              <div className="w-full" style={{ height: CHART_PX }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
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
                      formatter={(value, name) => {
                        const label = String(name);
                        if (label === "Reply rate %") {
                          const num = tooltipToOptionalNumber(value);
                          return [`${num != null ? num.toFixed(0) : "—"}%`, label];
                        }
                        const num = tooltipToOptionalNumber(value);
                        return [num != null ? num.toLocaleString() : "—", label];
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="positive_count"
                      name="Positive"
                      stackId="sentiment"
                      fill={SENT_POS}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="neutral_count"
                      name="Neutral"
                      stackId="sentiment"
                      fill={SENT_NEU}
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="negative_count"
                      name="Negative"
                      stackId="sentiment"
                      fill={SENT_NEG}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="reply_rate_pct"
                      name="Reply rate %"
                      stroke={REPLY_LINE}
                      strokeWidth={2.2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartStateShell>
          </CardContent>
        </Card>
      </div>
      <div className={`flex items-center gap-2 ${chartSurface.helper}`}>
        <Activity className="h-3.5 w-3.5" />
        Reply rate overlays use replied reviews divided by total reviews per bucket.
      </div>
    </div>
  );
}
