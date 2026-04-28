"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GBPCompetitorKeywordRank, GBPFieldComparisonRow } from "@/types/gbp";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

export type GapAnalysisPayload = {
  own_profile: Record<string, unknown> | null;
  competitors: Array<Record<string, unknown>>;
  keywords_tracked: string[];
  analysis: {
    gaps?: Array<Record<string, unknown>>;
    action_plan?: Array<Record<string, unknown>>;
    competitive_position?: string;
    summary?: string;
  } | null;
  error?: string;
  detail?: string;
};

export function gapHasDisplayableAnalysis(r: GapAnalysisPayload | null): boolean {
  const a = r?.analysis;
  if (!a) return false;
  return (
    Boolean(a.summary) ||
    Boolean(a.competitive_position) ||
    (Array.isArray(a.gaps) && a.gaps.length > 0) ||
    (Array.isArray(a.action_plan) && a.action_plan.length > 0)
  );
}

export function KeywordsStyleTableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/80 bg-background overflow-x-auto", className)}>
      {children}
    </div>
  );
}

export function CompetitorsGapResultsCard({ gapResult }: { gapResult: GapAnalysisPayload | null }) {
  const analysis = gapResult?.analysis;
  const hasAny =
    Boolean(analysis?.summary) ||
    Boolean(analysis?.competitive_position) ||
    (Array.isArray(analysis?.gaps) && (analysis?.gaps?.length ?? 0) > 0) ||
    (Array.isArray(analysis?.action_plan) && (analysis?.action_plan?.length ?? 0) > 0);
  if (!gapResult || !analysis || !hasAny) return null;

  return (
    <Card className="rounded-2xl border border-border/80 shadow-sm bg-background/80">
      <CardContent className="space-y-4 p-5 sm:p-6">
        {analysis.summary && (
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI summary</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{analysis.summary}</p>
          </div>
        )}
        {analysis.competitive_position && (
          <Badge variant="base-outline" className="capitalize">
            Position: {String(analysis.competitive_position).replace(/_/g, " ")}
          </Badge>
        )}
        {Array.isArray(analysis.gaps) && analysis.gaps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Gaps</h3>
            <ul className="mt-2 space-y-3">
              {analysis.gaps.map((g, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {Boolean(g.area || g.severity) && (
                      <span className="font-medium text-foreground">{String(g.area || "Finding")}</span>
                    )}
                    {Boolean(g.severity) && (
                      <Badge variant="base-soft" className="text-xs capitalize">
                        {String(g.severity)}
                      </Badge>
                    )}
                  </div>
                  {Boolean(g.finding) && (
                    <p className="mt-1 text-[var(--text-secondary)]">{String(g.finding)}</p>
                  )}
                  {Boolean(g.action) && (
                    <p className="mt-1 text-foreground">
                      <span className="font-medium">Action: </span>
                      {String(g.action)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(analysis.action_plan) && analysis.action_plan.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground">Action plan</h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
              {analysis.action_plan.map((item, i) => (
                <li key={i}>
                  <span className="text-foreground">
                    {String((item as { action?: string }).action || JSON.stringify(item))}
                  </span>
                  {(item as { impact?: string }).impact && (
                    <span className="ml-1 text-xs">— Impact: {(item as { impact: string }).impact}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatComparisonValue(field: string, v: number | null): string {
  if (v === null) return "—";
  if (field === "website") return `${Math.round(v)}%`;
  if (field === "rating") return v.toFixed(1);
  if (field === "reviews") return Math.round(v).toLocaleString("en-US");
  if (field === "rank") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  return String(v);
}

function winnerBadgeClass(winner: string): string {
  switch (winner) {
    case "you":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "competitors":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100";
    default:
      return "";
  }
}

type CompetitorsKeywordListProps = {
  keywords: GBPCompetitorKeywordRank[];
};

export function CompetitorsKeywordList({ keywords }: CompetitorsKeywordListProps) {
  return (
    <div className="space-y-4">
      <div className="py-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Local grid snapshot</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">By keyword</h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
          Competitors from your completed Local Ranking Grid scans per tracked keyword.
        </p>
      </div>
      <div className="space-y-4">
        {keywords.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No keywords with completed grid scans and competitor listings yet. Run the Local Ranking Grid for a tracked
            keyword, then return here.
          </p>
        ) : (
          keywords.map((kw) => <KeywordCompetitorCard key={kw.keyword_id} kw={kw} />)
        )}
      </div>
    </div>
  );
}

export function CompetitorsSnapshotBar({
  snapshotDate,
  dataSource,
  onRefresh,
}: {
  snapshotDate: string | null;
  dataSource: string | null;
  onRefresh: () => void;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {snapshotDate && <>Grid snapshot: {new Date(snapshotDate).toLocaleString()}</>}
      {dataSource && (
        <>
          <span className="text-muted-foreground/80">Source:</span>
          <span>{dataSource}</span>
        </>
      )}
      <Button variant="base-ghost" className="h-auto px-0 py-0 text-xs text-primary underline underline-offset-4" type="button" onClick={onRefresh}>
        Refresh
      </Button>
    </p>
  );
}

function KeywordCompetitorCard({ kw }: { kw: GBPCompetitorKeywordRank }) {
  const [compareOpen, setCompareOpen] = useState(false);
  const rows = kw.field_comparison ?? [];
  const hasCompare = rows.length > 0;
  const yourRankLabel =
    kw.our_rank === null || kw.our_rank === undefined || kw.our_rank === "N/A" ? "N/A" : String(kw.our_rank);

  const th =
    "px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground";
  const td = "px-4 py-3 align-top";

  return (
    <Card className="rounded-2xl border border-border/80 bg-muted/15 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
          <span className="font-medium text-foreground">{kw.keyword_text || "Keyword"}</span>
          <Badge variant="base-outline" className="font-mono text-xs">
            You: {yourRankLabel}
          </Badge>
        </div>

        {hasCompare && (
          <Collapsible open={compareOpen} onOpenChange={setCompareOpen} className="border-b border-border/60">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/40"
              >
                <span className="flex items-center gap-2">
                  {compareOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  Compare you vs competitor averages (grid snapshot)
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <KeywordsStyleTableWrap>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={th}>Metric</TableHead>
                        <TableHead className={cn(th, "text-right")}>You</TableHead>
                        <TableHead className={cn(th, "text-right")}>Competitor avg</TableHead>
                        <TableHead className={cn(th, "w-28 text-right")}>Edge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row: GBPFieldComparisonRow) => (
                        <TableRow key={row.field}>
                          <TableCell className={cn(td, "text-sm text-muted-foreground")}>{row.label}</TableCell>
                          <TableCell className={cn(td, "text-right font-mono text-sm")}>
                            {formatComparisonValue(row.field, row.yours)}
                          </TableCell>
                          <TableCell className={cn(td, "text-right font-mono text-sm")}>
                            {formatComparisonValue(row.field, row.competitor_avg)}
                          </TableCell>
                          <TableCell className={cn(td, "text-right")}>
                            <Badge
                              variant="base-outline"
                              className={cn("text-xs capitalize", winnerBadgeClass(row.winner))}
                            >
                              {row.winner === "you"
                                ? "You"
                                : row.winner === "competitors"
                                  ? "Them"
                                  : row.winner === "tie"
                                    ? "Tie"
                                    : row.winner}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </KeywordsStyleTableWrap>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="p-3 sm:p-4">
          <KeywordsStyleTableWrap>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={cn(th, "w-14")}>Rank</TableHead>
                  <TableHead className={th}>Business</TableHead>
                  <TableHead className={cn(th, "hidden md:table-cell")}>Rating</TableHead>
                  <TableHead className={cn(th, "hidden lg:table-cell w-24")}>Maps</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(kw.competitors || []).slice(0, 10).map((c, j) => (
                  <TableRow key={`${c.place_id}-${j}`}>
                    <TableCell className={cn(td, "font-mono text-muted-foreground")}>
                      {c.rank === null || c.rank === undefined ? "—" : c.rank}
                    </TableCell>
                    <TableCell className={td}>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      {c.address && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{c.address}</p>
                      )}
                    </TableCell>
                    <TableCell className={cn(td, "hidden md:table-cell text-sm text-muted-foreground")}>
                      {c.rating_value != null ? `${c.rating_value} ★` : "—"}
                      {c.rating_votes_count != null ? ` (${c.rating_votes_count})` : ""}
                    </TableCell>
                    <TableCell className={cn(td, "hidden lg:table-cell")}>
                      {c.url ? (
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </KeywordsStyleTableWrap>
        </div>
      </CardContent>
    </Card>
  );
}
