"use client";

import { useMemo, useState } from "react";
import { BarChart3, Image as ImageIcon, Megaphone } from "lucide-react";
import type { EChartsOption } from "echarts";

import { useGetGBPPostTimeseriesQuery } from "@/lib/api/baseApi";
import { GbpTimeseriesFilters, defaultTimeseriesFilters } from "@/components/gbp/gbp-timeseries-filters";
import { GbpEchartsBase } from "@/components/gbp/gbp-echarts-base";
import { chartSurface } from "@/components/gbp/design-system";
import { Card } from "@/components/ui/card";

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

export function GBPPostTrends({ locationPublicId }: { locationPublicId?: string }) {
  const [filters, setFilters] = useState(defaultTimeseriesFilters());
  const [chartResetToken, setChartResetToken] = useState(0);
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
  const postGroupId = "gbp-post-trends-sync";

  const postMixOption = useMemo<EChartsOption>(
    () => ({
      legend: { top: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
      xAxis: { type: "category", data: chartData.map((point) => point.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: "#667085", fontSize: 12 } },
      yAxis: [{ type: "value", name: "Posts", minInterval: 1, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } } }],
      dataZoom: [{ type: "inside", start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true }],
      series: [
        { name: "Offer", type: "bar", stack: "postType", itemStyle: { color: "#16a34a", borderRadius: [6, 6, 0, 0] }, data: chartData.map((point) => point.offer_count) },
        { name: "Event", type: "bar", stack: "postType", itemStyle: { color: "#0d9488", borderRadius: [6, 6, 0, 0] }, data: chartData.map((point) => point.event_count) },
        { name: "Update", type: "bar", stack: "postType", itemStyle: { color: "#0284c7", borderRadius: [6, 6, 0, 0] }, data: chartData.map((point) => point.update_count) },
        { name: "What's new", type: "bar", stack: "postType", itemStyle: { color: "#4f46e5", borderRadius: [6, 6, 0, 0] }, data: chartData.map((point) => point.whats_new_count) },
        { name: "Other", type: "bar", stack: "postType", itemStyle: { color: "#64748b", borderRadius: [6, 6, 0, 0] }, data: chartData.map((point) => point.other_count) },
      ],
    }),
    [chartData]
  );

  const coverageOption = useMemo<EChartsOption>(
    () => ({
      legend: { top: 0, itemWidth: 10, itemHeight: 8, textStyle: { color: "var(--muted-foreground)", fontSize: 11 } },
      xAxis: { type: "category", data: chartData.map((point) => point.label), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: "#667085", fontSize: 12 } },
      yAxis: [
        { type: "value", name: "Posts", minInterval: 1, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } } },
        { type: "value", name: "Coverage %", min: 0, max: 100, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#98A2B3", fontSize: 12 }, splitLine: { show: false } },
      ],
      dataZoom: [{ type: "inside", start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true }],
      series: [
        { name: "Post count", type: "bar", itemStyle: { color: "rgba(22, 163, 74, 0.25)", borderRadius: [6, 6, 0, 0] }, data: chartData.map((point) => point.post_count) },
        { name: "Media %", type: "line", yAxisIndex: 1, smooth: 0.25, showSymbol: false, symbol: "none", lineStyle: { color: "#16a34a", width: 2.2 }, itemStyle: { color: "#16a34a" }, data: chartData.map((point) => point.with_media_pct) },
        { name: "CTA %", type: "line", yAxisIndex: 1, smooth: 0.25, showSymbol: false, symbol: "none", lineStyle: { color: "#15803d", width: 2.2 }, itemStyle: { color: "#15803d" }, data: chartData.map((point) => point.with_cta_pct) },
      ],
    }),
    [chartData]
  );

  return (
    <div className={`mt-6 ${chartSurface.sectionGap}`}>
      <div>
        <p className={chartSurface.title}>Trends</p>
        <p className={chartSurface.subtitle}>Publishing cadence, content mix, and rich-content coverage over time.</p>
      </div>
      <GbpTimeseriesFilters
        value={filters}
        onChange={setFilters}
        onReset={() => setChartResetToken((value) => value + 1)}
      />
      <div className="grid grid-cols-1 gap-5">
        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <div className={`mb-3 ${chartSurface.iconWrap} ${chartSurface.title}`}>
            <Megaphone className={`h-4 w-4 ${chartSurface.postAccent}`} />
            Post volume and content mix
          </div>
          <GbpEchartsBase
            key={`post-mix-${chartResetToken}`}
            option={postMixOption}
            loading={isLoading}
            error={!!error}
            empty={!isLoading && !error && chartData.length === 0}
            emptyText="No post trend data in this range. Sync posts or widen the date range."
            errorText="Unable to load post trends for the selected range."
            groupId={postGroupId}
            height={chartSurface.chartHeightLarge}
          />
        </Card>
        <Card className={`${chartSurface.card} ${chartSurface.cardPadding}`}>
          <div className={`mb-3 ${chartSurface.iconWrap} ${chartSurface.title}`}>
            <ImageIcon className={`h-4 w-4 ${chartSurface.postAccent}`} />
            Media and CTA coverage
          </div>
          <GbpEchartsBase
            key={`post-coverage-${chartResetToken}`}
            option={coverageOption}
            loading={isLoading}
            error={!!error}
            empty={!isLoading && !error && chartData.length === 0}
            emptyText="No coverage trend data in this range."
            errorText="Unable to load media and CTA coverage trends."
            groupId={postGroupId}
            height={chartSurface.chartHeightLarge}
          />
        </Card>
      </div>
      <div className={`flex items-center gap-2 ${chartSurface.helper}`}>
        <BarChart3 className="h-3.5 w-3.5" />
        Percent overlays show how many posts in each bucket include media and CTA links.
      </div>
    </div>
  );
}
