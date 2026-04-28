"use client";

import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useGetGBPCompetitorKeywordRanksQuery, useRunGBPCompetitiveGapMutation } from "@/lib/api/baseApi";
import { GbpAiWorkingStrip } from "@/components/gbp/gbp-ai-presence";
import { GbpAiSparklesLoader } from "@/components/gbp/gbp-ai-sparkles-loader";
import {
  CompetitorsGapResultsCard,
  CompetitorsKeywordList,
  CompetitorsSnapshotBar,
  gapHasDisplayableAnalysis,
  type GapAnalysisPayload,
} from "@/components/gbp/gbp-competitors";
import { gbpButtonClasses } from "@/components/gbp/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatCard } from "@/components/ui/stat-card";
import type { RootState } from "@/lib/redux/store";

export default function CompetitorsPage() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [gapResult, setGapResult] = useState<GapAnalysisPayload | null>(null);

  const { data, isLoading, error, refetch } = useGetGBPCompetitorKeywordRanksQuery(
    currentLocation?.public_id ?? "",
    { skip: !currentLocation?.public_id }
  );
  const [runGap, { isLoading: gapLoading }] = useRunGBPCompetitiveGapMutation();

  const handleOpenGapSheet = useCallback(() => {
    setGapResult(null);
    setSheetOpen(true);
  }, []);

  const handleRunGap = useCallback(async () => {
    if (!currentLocation?.public_id) return;
    setGapResult(null);
    try {
      const res = await runGap(currentLocation.public_id).unwrap();
      setGapResult(res);
      if (res.error) {
        toast.error("Gap analysis unavailable", { description: res.detail || res.error });
      } else {
        toast.success("Analysis complete");
      }
    } catch (e: unknown) {
      const err = e as { data?: { detail?: string; error?: string } };
      toast.error("Gap analysis failed", {
        description:
          err?.data?.detail ||
          err?.data?.error ||
          "Complete a Local Ranking Grid scan first so we have stored competitor listings to analyze.",
      });
    }
  }, [currentLocation, runGap]);

  const keywords = data?.keywords ?? [];
  const emptyMessage = (data?.message ?? "").trim();
  const snapshotDate = data?.snapshot_date ?? null;
  const dataSource = data?.data_source ?? null;

  const statCards = useMemo(() => {
    const kwCount = keywords.length;
    const snapLabel =
      snapshotDate != null
        ? new Date(snapshotDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        : "None yet";
    const badgeSnapshot = snapshotDate != null ? "Live snapshot" : "Run a grid scan";
    return [
      {
        label: "Grid snapshot",
        value: snapLabel,
        badgeLabel: badgeSnapshot,
        badgeVariant: (snapshotDate != null ? "success" : "warning") as "success" | "warning",
        infoDescription:
          "Latest completed ranking grid snapshot used for competitor rows. Run Local Ranking Grid to refresh.",
      },
      {
        label: "Keywords with competitors",
        value: kwCount.toLocaleString(),
        badgeLabel: kwCount > 0 ? "Tracking" : "Empty",
        badgeVariant: (kwCount > 0 ? "success" : "warning") as "success" | "warning",
        infoDescription: "Tracked keywords where we have competitor listings saved from grid scans.",
      },
      // {
      //   label: "Data source",
      //   value: dataSource ?? "—",
      //   badgeLabel: dataSource ? "Stored" : "Unknown",
      //   badgeVariant: "base-outline" as const,
      //   infoDescription:
      //     "Which stored scan or index powered this snapshot (no live SERP refresh from this screen).",
      // },
    ];
  }, [dataSource, keywords.length, snapshotDate]);

  if (!currentLocation?.public_id) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Competitors</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Compare your profile against businesses that appear alongside you in saved grid snapshots.
          </p>
        </div>
        <Alert className="rounded-xl">
          <AlertDescription>Select a location to load competitor snapshots.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Competitors</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            See who appears on your Local Ranking Grid snapshots and run an optional AI gap summary.
          </p>
        </div>
        <Button
          size="md"
          onClick={handleOpenGapSheet}
          disabled={!currentLocation?.public_id || gapLoading}
          className={gbpButtonClasses.primaryCta}
        >
          <Sparkles className="h-4 w-4" />
          AI profile gap
        </Button>
      </div>

      {isLoading ? (
        <GbpAiSparklesLoader label="Loading competitor snapshot from your grids…" />
      ) : error ? (
        <Alert variant="error" className="rounded-2xl">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>Unable to load competitor data. Please try again.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {statCards.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                badgeLabel={s.badgeLabel}
                badgeVariant={s.badgeVariant}
                infoDescription={s.infoDescription}
              />
            ))}
          </div>

          {/* <CompetitorsSnapshotBar snapshotDate={snapshotDate} dataSource={dataSource} onRefresh={() => refetch()} /> */}

          {keywords.length === 0 && emptyMessage ? (
            <Alert className="rounded-xl border-border/80 bg-muted/20">
              <AlertDescription className="text-sm">{emptyMessage}</AlertDescription>
            </Alert>
          ) : null}

          <CompetitorsKeywordList keywords={keywords} />
        </>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setGapResult(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full !w-full w-full !max-w-none flex-col overflow-y-auto p-0 sm:!max-w-none"
        >
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[800px] flex-col">
            <SheetHeader className="shrink-0 border-b border-[var(--border-default)] p-4 pr-12">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <SheetTitle>AI competitor gap</SheetTitle>
              </div>
              <SheetDescription>
                Optional summary using your stored grid listings and GBP context. No live SERP refresh.
              </SheetDescription>
              {gapHasDisplayableAnalysis(gapResult) && !gapLoading && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="base-outline">Analysis ready</Badge>
                  <Button variant="base-outline" size="sm" type="button" onClick={handleRunGap} disabled={gapLoading}>
                    {gapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run again"}
                  </Button>
                </div>
              )}
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-4 p-4 sm:p-5">
              {!gapLoading && !gapHasDisplayableAnalysis(gapResult) && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
                    We will compare your profile to nearby competitors using data already saved from your ranking grids.
                  </p>
                  <Button
                    size="md"
                    type="button"
                    onClick={handleRunGap}
                    disabled={gapLoading || !currentLocation?.public_id}
                    className={gbpButtonClasses.primaryCta}
                  >
                    <Sparkles className="h-4 w-4" />
                    Run analysis
                  </Button>
                </div>
              )}

              {gapLoading && (
                <>
                  <GbpAiSparklesLoader compact label="Analyzing your competitive landscape…" />
                  <GbpAiWorkingStrip active variant="analysis" />
                </>
              )}

              {gapResult?.error && !gapLoading && (
                <Alert variant="warning" className="rounded-xl">
                  <AlertDescription>{gapResult.detail || gapResult.error}</AlertDescription>
                </Alert>
              )}

              {!gapLoading && gapResult && <CompetitorsGapResultsCard gapResult={gapResult} />}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
