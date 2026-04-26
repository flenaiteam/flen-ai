"use client";

import { useMemo, useState } from "react";
import { Activity, BarChart3, MessageSquareReply, Star, TrendingUp } from "lucide-react";
import type { EChartsOption } from "echarts";
import { Cell, Label, Pie, PieChart } from "recharts";

import { useGetGBPReviewTimeseriesQuery, useGetGBPReviewsQuery } from "@/lib/api/baseApi";
import { Card } from "@/components/ui/card";
import { GbpTimeseriesFilters, defaultTimeseriesFilters } from "@/components/gbp/gbp-timeseries-filters";
import { GbpEchartsBase } from "@/components/gbp/gbp-echarts-base";
import { chartSurface } from "@/components/gbp/design-system";

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

function labelForDate(value: string, granularity: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (granularity === "month") return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GBPReviewTrends({ locationPublicId }: { locationPublicId?: string }) {
  const [filters, setFilters] = useState(defaultTimeseriesFilters());
  const [chartResetToken, setChartResetToken] = useState(0);
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
  const reviewGroupId = "gbp-review-trends-sync";

  const volumeAndRatingOption = useMemo<EChartsOption>(
    () => ({
      legend: { show: false },
      xAxis: {
        type: "category",
        data: chartData.map((point) => point.label),
        boundaryGap: false,
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: "#667085", fontSize: 12 },
      },
      yAxis: [
        { type: "value", name: "Reviews", minInterval: 1, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } } },
        { type: "value", name: "Rating", min: 1, max: 5, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { show: false } },
      ],
      dataZoom: [{ type: "inside", start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true }],
      series: [
        {
          name: "Review count",
          type: "line",
          smooth: true,
          showSymbol: false,
          symbol: "none",
          areaStyle: { color: "rgba(225, 29, 72, 0.1)" },
          lineStyle: { color: "#e11d48", width: 2.5 },
          itemStyle: { color: "#e11d48" },
          data: chartData.map((point) => point.review_count),
        },
        {
          name: "Avg rating",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          symbol: "none",
          lineStyle: { color: "#be123c", width: 2.2 },
          itemStyle: { color: "#be123c" },
          data: chartData.map((point) => point.avg_rating ?? 0),
        },
      ],
    }),
    [chartData]
  );

  const replyAndSentimentOption = useMemo<EChartsOption>(
    () => ({
      legend: { top: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
      xAxis: { type: "category", data: chartData.map((point) => point.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: "#667085", fontSize: 12 } },
      yAxis: [
        { type: "value", name: "Count", minInterval: 1, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } } },
        { type: "value", name: "Reply %", min: 0, max: 100, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { show: false } },
      ],
      dataZoom: [{ type: "inside", start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true }],
      series: [
        { name: "Positive", type: "bar", stack: "sentiment", itemStyle: { color: "#10b981" }, data: chartData.map((point) => point.positive_count) },
        { name: "Neutral", type: "bar", stack: "sentiment", itemStyle: { color: "#f59e0b" }, data: chartData.map((point) => point.neutral_count) },
        { name: "Negative", type: "bar", stack: "sentiment", itemStyle: { color: "#ef4444" }, data: chartData.map((point) => point.negative_count) },
        {
          name: "Reply rate %",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          symbol: "none",
          lineStyle: { color: "#ea580c", width: 2.2 },
          itemStyle: { color: "#ea580c" },
          data: chartData.map((point) => point.reply_rate_pct),
        },
      ],
    }),
    [chartData]
  );

  return (
    <div className={`mt-6 ${chartSurface.sectionGap}`}>
      <div className="rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5">
        {ratingDistribution &&
        Object.values(ratingDistribution).some((count) => typeof count === "number" && count > 0) ? (
          (() => {
            const chartData = [5, 4, 3, 2, 1]
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

            const totalReviews = chartData.reduce((acc, curr) => acc + curr.count, 0);
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
                      <Pie data={chartData} dataKey="count" nameKey="rating" innerRadius={48} outerRadius={82} strokeWidth={3}>
                        {chartData.map((item) => (
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
                    {chartData.map((item) => {
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
      <GbpTimeseriesFilters
        value={filters}
        onChange={setFilters}
        onReset={() => setChartResetToken((value) => value + 1)}
      />
      <div className="grid grid-cols-1 gap-5">
        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <div className={`mb-3 ${chartSurface.iconWrap} ${chartSurface.title}`}>
            <TrendingUp className={`h-4 w-4 ${chartSurface.reviewAccent}`} />
            Review volume and average rating
          </div>
          <GbpEchartsBase
            key={`review-volume-${chartResetToken}`}
            option={volumeAndRatingOption}
            loading={isLoading}
            error={!!error}
            empty={!isLoading && !error && chartData.length === 0}
            emptyText="No review trend data in this range. Sync reviews or widen the date range."
            errorText="Unable to load review trends for the selected range."
            groupId={reviewGroupId}
            height={chartSurface.chartHeightLarge}
          />
        </Card>
        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <div className={`mb-3 ${chartSurface.iconWrap} ${chartSurface.title}`}>
            <MessageSquareReply className={`h-4 w-4 ${chartSurface.reviewAccent}`} />
            Replies and sentiment mix
          </div>
          <GbpEchartsBase
            key={`review-sentiment-${chartResetToken}`}
            option={replyAndSentimentOption}
            loading={isLoading}
            error={!!error}
            empty={!isLoading && !error && chartData.length === 0}
            emptyText="No reply/sentiment trend data in this range."
            errorText="Unable to load reply and sentiment trends."
            groupId={reviewGroupId}
            height={chartSurface.chartHeightLarge}
          />
        </Card>
      </div>
      <div className={`flex items-center gap-2 ${chartSurface.helper}`}>
        <Activity className="h-3.5 w-3.5" />
        Reply rate overlays use replied reviews divided by total reviews per bucket.
      </div>
    </div>
  );
}
