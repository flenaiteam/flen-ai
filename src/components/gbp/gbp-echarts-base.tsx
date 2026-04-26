"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type GbpEchartsBaseProps = {
  option: EChartsOption;
  height?: number;
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyText?: string;
  errorText?: string;
  groupId?: string;
  onChartReady?: (chart: ECharts) => void;
};

export function GbpEchartsBase({
  option,
  height = 280,
  loading,
  error,
  empty,
  emptyText = "No data in this range.",
  errorText = "Unable to load chart data.",
  groupId,
  onChartReady,
}: GbpEchartsBaseProps) {
  const mergedOption = useMemo<EChartsOption>(
    () => ({
      animationDuration: 420,
      animationDurationUpdate: 240,
      animationEasing: "cubicOut",
      animationEasingUpdate: "cubicOut",
      grid: { left: 16, right: 16, top: 28, bottom: 16, containLabel: true },
      textStyle: { color: "var(--muted-foreground)" },
      tooltip: {
        trigger: "axis",
        confine: true,
        borderWidth: 0,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        extraCssText: "color:#e5e7eb;",
        padding: [8, 10],
        textStyle: { color: "#e5e7eb", fontSize: 12 },
        axisPointer: {
          type: "line",
          lineStyle: { color: "rgba(148, 163, 184, 0.45)", width: 1 },
        },
      },
      ...option,
    }),
    [option]
  );

  if (loading) return <Skeleton className="w-full rounded-xl" style={{ height }} />;
  if (error) return <Card className="rounded-xl border border-destructive/40 p-6 text-sm text-muted-foreground">{errorText}</Card>;
  if (empty) return <Card className="rounded-xl border p-6 text-sm text-muted-foreground">{emptyText}</Card>;

  return (
    <ReactECharts
      echarts={echarts}
      option={mergedOption}
      notMerge={false}
      lazyUpdate
      style={{ height, width: "100%" }}
      onChartReady={(chart) => {
        if (groupId) {
          chart.group = groupId;
          echarts.connect(groupId);
        }
        onChartReady?.(chart);
      }}
    />
  );
}
