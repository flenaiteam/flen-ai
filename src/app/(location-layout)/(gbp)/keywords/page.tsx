"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, Filter, Search, Sparkles, Trophy, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetGBPKeywordsQuery } from "@/lib/api/baseApi";
import type { RootState } from "@/lib/redux/store";
import { cn } from "@/lib/utils";

type GBPKeyword = {
  id: number;
  keyword: string;
  rank_position: number | null;
  search_volume: number;
  opportunity_score: string | number;
  competition: string;
  is_active: boolean;
};

type KeywordsMeta = {
  current_page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
};

function normalizeKeywordList(rawList: unknown): GBPKeyword[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: Number(item.id ?? idx + 1),
      keyword: String(item.keyword ?? "Untitled keyword"),
      rank_position:
        item.rank_position === null || item.rank_position === undefined ? null : Number(item.rank_position),
      search_volume: Number(item.search_volume ?? 0),
      opportunity_score: (item.opportunity_score as string | number | undefined) ?? "0",
      competition: String(item.competition ?? "UNKNOWN").toUpperCase(),
      is_active: Boolean(item.is_active),
    }));
}

function normalizeKeywords(raw: unknown, fallbackPageSize: number): { keywords: GBPKeyword[]; opportunities: GBPKeyword[]; meta: KeywordsMeta } {
  const defaultMeta: KeywordsMeta = {
    current_page: 1,
    page_size: fallbackPageSize,
    total_pages: 1,
    total_items: 0,
  };
  if (!raw || typeof raw !== "object") return { keywords: [], opportunities: [], meta: defaultMeta };

  const top = raw as Record<string, unknown>;
  let list: unknown[] = [];
  let opportunitiesRaw: unknown[] = [];
  let totalItems = 0;
  let totalPages = 1;
  let currentPage = 1;
  let pageSize = fallbackPageSize;
  let meta: Record<string, unknown> | undefined;

  if (Array.isArray(top.data)) {
    list = top.data;
    meta = (top.meta_data as Record<string, unknown> | undefined) ?? undefined;
    totalItems = Number(meta?.total_items ?? top.data.length);
  } else if (top.data && typeof top.data === "object") {
    const nested = top.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      list = nested.data;
      meta =
        (nested.meta_data as Record<string, unknown> | undefined) ??
        ((top.meta_data as Record<string, unknown> | undefined) ?? undefined);
      totalItems = Number(
        meta?.total_items ??
          nested.data.length
      );
    }
  } else if (Array.isArray(raw)) {
    list = raw;
    totalItems = raw.length;
  }

  if (Array.isArray(meta?.opportunities)) {
    opportunitiesRaw = meta.opportunities as unknown[];
  }

  const keywords = normalizeKeywordList(list);
  const opportunities = normalizeKeywordList(opportunitiesRaw);

  totalItems = Number(meta?.total_items ?? totalItems ?? keywords.length);
  pageSize = Number(meta?.page_size ?? fallbackPageSize) || fallbackPageSize;
  totalPages = Number(meta?.total_pages ?? Math.max(1, Math.ceil(totalItems / pageSize))) || 1;
  currentPage = Number(meta?.current_page ?? 1) || 1;

  return {
    keywords,
    opportunities,
    meta: {
      current_page: currentPage,
      page_size: pageSize,
      total_pages: totalPages,
      total_items: Number.isFinite(totalItems) ? totalItems : keywords.length,
    },
  };
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

function competitionBadgeVariant(level: string): "success" | "warning" | "error" | "base-outline" {
  if (level === "LOW") return "success";
  if (level === "MEDIUM") return "warning";
  if (level === "HIGH") return "error";
  return "base-outline";
}

export default function KeywordsPage() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [competitionFilter, setCompetitionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("-search_volume");

  const queryArgs = useMemo(
    () => ({
      locationPublicId: currentLocation?.public_id || "",
      page: currentPage,
      page_size: pageSize,
      search: searchQuery.trim() || undefined,
      competition: competitionFilter !== "all" ? competitionFilter : undefined,
      is_active: statusFilter !== "all" ? statusFilter === "active" : undefined,
      sort: sortBy,
    }),
    [competitionFilter, currentLocation?.public_id, currentPage, pageSize, searchQuery, sortBy, statusFilter]
  );

  const { data, isLoading, isFetching, error } = useGetGBPKeywordsQuery(
    queryArgs,
    { skip: !currentLocation?.public_id, refetchOnMountOrArgChange: true }
  );

  const { keywords, opportunities, meta } = useMemo(() => normalizeKeywords(data, pageSize), [data, pageSize]);
  const totalItems = meta.total_items;
  const totalPages = Math.max(1, meta.total_pages);
  const hasActiveFilters = Boolean(searchQuery.trim()) || competitionFilter !== "all" || statusFilter !== "all";
  const showTableLoading = isLoading || isFetching;
  const pageNumbers = useMemo(() => {
    const around = 2;
    const start = Math.max(1, currentPage - around);
    const end = Math.min(totalPages, currentPage + around);
    const nums: number[] = [];
    for (let p = start; p <= end; p += 1) nums.push(p);
    return nums;
  }, [currentPage, totalPages]);

  const clearFilters = () => {
    setSearchQuery("");
    setCompetitionFilter("all");
    setStatusFilter("all");
    setSortBy("-search_volume");
    setCurrentPage(1);
  };

  const displaySummary = useMemo(() => {
    const rankedKeywords = keywords.filter((k) => k.rank_position !== null);
    const averageRank =
      rankedKeywords.length > 0
        ? rankedKeywords.reduce((sum, k) => sum + Number(k.rank_position ?? 0), 0) / rankedKeywords.length
        : null;

    return {
      total_keywords: totalItems || keywords.length,
      active_keywords: keywords.filter((k) => k.is_active).length,
      ranked_keywords: rankedKeywords.length,
      keywords_in_top_10: keywords.filter((k) => k.rank_position !== null && Number(k.rank_position) <= 10).length,
      keywords_in_top_3: keywords.filter((k) => k.rank_position !== null && Number(k.rank_position) <= 3).length,
      average_rank_position: averageRank,
      total_search_volume: keywords.reduce((sum, k) => sum + Number(k.search_volume || 0), 0),
      high_opportunity_keywords: keywords.filter((k) => Number.parseFloat(String(k.opportunity_score)) > 7).length,
    };
  }, [keywords, totalItems]);

  const opportunityKeywords = useMemo(
    () => {
      if (opportunities.length > 0) return opportunities.slice(0, 6);
      return keywords
        .filter((k) => Number.parseFloat(String(k.opportunity_score)) > 7)
        .sort((a, b) => Number(b.search_volume) - Number(a.search_volume))
        .slice(0, 6);
    },
    [keywords, opportunities]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Keywords</h1>
        <p className="text-sm text-[var(--text-secondary)]">Track local keyword visibility and trends.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Top 3 rankings"
          value={displaySummary.keywords_in_top_3.toLocaleString()}
          subValue="Keywords ranking in positions 1-3"
          infoDescription="Top 3 positions typically capture the majority of search clicks."
          badgeLabel="Critical"
          badgeVariant="warning"
        />
        <StatCard
          label="Top 10 rankings"
          value={displaySummary.keywords_in_top_10.toLocaleString()}
          subValue="First-page keywords (positions 1-10)"
          infoDescription="First page rankings drive most search visibility."
          badgeLabel="High visibility"
          badgeVariant="success"
        />
        <StatCard
          label="Monthly searches"
          value={`${formatNumber(displaySummary.total_search_volume)}+`}
          subValue="Combined volume across tracked keywords"
          infoDescription="Total monthly search demand across your keywords."
          badgeLabel="Opportunity"
          badgeVariant="info"
        />
      </div>

      <Card className="rounded-2xl border border-border/80 bg-muted/20">
        <CardContent className="space-y-3 p-4 sm:p-5">
          {displaySummary.ranked_keywords > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <Trophy className="h-5 w-5 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {displaySummary.ranked_keywords} keyword{displaySummary.ranked_keywords !== 1 ? "s" : ""} currently ranking
                </p>
                {displaySummary.average_rank_position ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Average position: {displaySummary.average_rank_position.toFixed(1)}
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {displaySummary.high_opportunity_keywords > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
              <Sparkles className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {displaySummary.high_opportunity_keywords} high opportunity keyword
                  {displaySummary.high_opportunity_keywords !== 1 ? "s" : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  These keywords have strong upside for improving visibility.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 ">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {displaySummary.active_keywords} active keyword{displaySummary.active_keywords !== 1 ? "s" : ""} out of{" "}
                {displaySummary.total_keywords} total
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {displaySummary.total_keywords - displaySummary.active_keywords} inactive keyword
                {displaySummary.total_keywords - displaySummary.active_keywords !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {opportunityKeywords.length > 0 ? (
        <>
          <div className="py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    High Opportunity Keywords
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Keywords with strong upside to improve visibility and traffic.
                  </p>
                </div>
              </div>
              <Badge variant="base-outline" className="w-fit shrink-0">
                {opportunityKeywords.length}
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Keyword</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Search volume</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Competition</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Opportunity</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Hint</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunityKeywords.map((keyword) => (
                  <TableRow key={keyword.id}>
                    <TableCell className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-foreground">{keyword.keyword}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top text-sm text-foreground">
                      {formatNumber(keyword.search_volume)}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top">
                      <Badge variant={competitionBadgeVariant(keyword.competition)} className="w-fit">
                        {keyword.competition}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top text-sm text-foreground">
                      {Number.parseFloat(String(keyword.opportunity_score)).toFixed(1)}
                    </TableCell>
                    <TableCell className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {keyword.competition === "LOW" ? "Great candidate for quick SEO and ads wins." : "Worth optimizing content depth and relevance."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}

      <>
        <div className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inbox</p>
              <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">All keywords</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Search and filter keywords by competition, status, and volume.
              </p>
              {totalItems > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{totalItems.toLocaleString()}</span>
                </p>
              )}
              {hasActiveFilters && (
                <Badge variant="base-soft" className="mt-2 text-xs">
                  Filters active
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-1 sm:items-end">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Page size</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  if (!value) return;
                  setPageSize(parseInt(value, 10));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 border-0 bg-background pl-9 pr-9 shadow-sm"
              />
              {searchQuery && (
                <Button
                  variant="base-ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex min-w-[min(100%,11rem)] flex-1 items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select
                  value={competitionFilter}
                  onValueChange={(value) => {
                    if (!value) return;
                    setCompetitionFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full border-0 bg-background shadow-sm">
                    <SelectValue placeholder="Competition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All competition</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  if (!value) return;
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-[min(100%,10rem)] border-0 bg-background shadow-sm sm:w-[168px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortBy}
                onValueChange={(value) => {
                  if (!value) return;
                  setSortBy(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full min-w-[min(100%,10rem)] border-0 bg-background shadow-sm sm:w-[168px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-search_volume">Highest volume</SelectItem>
                  <SelectItem value="search_volume">Lowest volume</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="base-ghost" size="sm" onClick={clearFilters} className="h-9 gap-2 text-muted-foreground">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {error && !showTableLoading ? (
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Unable to load keywords. Please try again.</AlertDescription>
            </Alert>
          ) : showTableLoading ? (
            <div className="rounded-xl border border-border/80 bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Keyword</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Volume</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Competition</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: pageSize }).map((_, idx) => (
                    <TableRow key={`loading-row-${idx}`}>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : keywords.length > 0 ? (
            <>
              <div className="rounded-xl border border-border/80 bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Keyword</TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Volume</TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Competition</TableHead>
                      <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords.map((keyword) => (
                      <TableRow key={keyword.id}>
                        <TableCell className="px-4 py-3 align-top">
                          <p className="text-sm font-medium text-foreground">{keyword.keyword}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top text-sm text-foreground">
                          {formatNumber(keyword.search_volume)}
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top">
                          <Badge variant={competitionBadgeVariant(keyword.competition)} className="w-fit">
                            {keyword.competition}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top">
                          <Badge variant={keyword.is_active ? "success" : "base-outline"} className="w-fit">
                            {keyword.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className={cn("justify-end", isFetching && "opacity-70")}>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage((p) => p - 1);
                        }}
                      />
                    </PaginationItem>
                    {pageNumbers.map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage((p) => p + 1);
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-14 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No keywords match</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Broaden your search or reset filters to see all tracked keywords.
              </p>
              <Button variant="base-outline" className="mt-4" onClick={clearFilters}>
                Reset filters
              </Button>
            </div>
          )}
        </div>
      </>
    </div>
  );
}
