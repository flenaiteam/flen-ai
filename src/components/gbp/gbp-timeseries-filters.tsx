"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type GBPTimeSeriesGranularity = "day" | "week" | "month";
type RangePreset = "7d" | "30d" | "90d" | "12m";

export type GbpTimeseriesFiltersValue = {
  preset: RangePreset;
  dateFrom: string;
  dateTo: string;
  granularity: GBPTimeSeriesGranularity;
};

type GbpTimeseriesFiltersProps = {
  value: GbpTimeseriesFiltersValue;
  onChange: (next: GbpTimeseriesFiltersValue) => void;
  onReset?: () => void;
};

export function defaultTimeseriesFilters(): GbpTimeseriesFiltersValue {
  return applyPreset("90d");
}

export function applyPreset(preset: RangePreset): GbpTimeseriesFiltersValue {
  const now = new Date();
  const dateTo = formatDate(now);
  const dateFrom = new Date(now);
  const granularity: GBPTimeSeriesGranularity = preset === "12m" ? "month" : preset === "90d" ? "week" : "day";

  if (preset === "7d") dateFrom.setDate(now.getDate() - 6);
  if (preset === "30d") dateFrom.setDate(now.getDate() - 29);
  if (preset === "90d") dateFrom.setDate(now.getDate() - 89);
  if (preset === "12m") dateFrom.setMonth(now.getMonth() - 11);

  return {
    preset,
    dateFrom: formatDate(dateFrom),
    dateTo,
    granularity,
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateSpanDays(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

export function GbpTimeseriesFilters({ value, onChange, onReset }: GbpTimeseriesFiltersProps) {
  const daySpan = getDateSpanDays(value.dateFrom, value.dateTo);
  const suggestedGranularity: GBPTimeSeriesGranularity = daySpan > 180 ? "month" : daySpan > 60 ? "week" : "day";
  const disableDay = daySpan > 120;
  const disableWeek = daySpan > 720;

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        {(["7d", "30d", "90d", "12m"] as const).map((preset) => (
          <Button
            key={preset}
            size="sm"
            variant={value.preset === preset ? "brand" : "base-outline"}
            onClick={() => onChange(applyPreset(preset))}
            className="h-9 px-3"
          >
            {preset === "12m" ? "12m" : preset.toUpperCase()}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <Input
            type="date"
            value={value.dateFrom}
            onChange={(event) => onChange({ ...value, dateFrom: event.target.value, preset: "90d" })}
            className="h-9 w-[150px]"
            max={value.dateTo}
          />
          <Input
            type="date"
            value={value.dateTo}
            onChange={(event) => onChange({ ...value, dateTo: event.target.value, preset: "90d" })}
            className="h-9 w-[150px]"
            min={value.dateFrom}
          />
          <Select
            value={value.granularity}
            onValueChange={(next) => onChange({ ...value, granularity: next as GBPTimeSeriesGranularity })}
          >
            <SelectTrigger className="h-9 w-[122px]">
              <SelectValue placeholder="Granularity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day" disabled={disableDay}>Daily</SelectItem>
              <SelectItem value="week" disabled={disableWeek}>Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="base-ghost"
            className="h-9 px-3"
            onClick={() => {
              onReset?.();
              onChange(defaultTimeseriesFilters());
            }}
          >
            Reset
          </Button>
        </div>
      </div>
      {value.granularity !== suggestedGranularity ? (
        <p className="text-xs text-muted-foreground">
          Suggested granularity: {suggestedGranularity}
        </p>
      ) : null}
    </div>
  );
}
