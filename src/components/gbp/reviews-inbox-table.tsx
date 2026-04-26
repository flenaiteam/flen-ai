"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, Copy, Filter, Loader2, Search, Sparkles, Star, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RainbowButton } from "@/components/ui/rainbow-button";
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
import { useGetGBPReviewReplyOptionsMutation, useGetGBPReviewsQuery } from "@/lib/api/baseApi";
import type { RootState } from "@/lib/redux/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type GBPReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  text?: string | null;
  timestamp: string;
  reply_text?: string | null;
};

type GBPReviewsMeta = {
  current_page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
};

type ReviewReplyPayload = {
  reply_option_1_type: string | null;
  reply_option_1: string | null;
  reply_option_2_type: string | null;
  reply_option_2: string | null;
  reply_option_3_type: string | null;
  reply_option_3: string | null;
  recommended_index: number | null;
  recommendation_why: string | null;
  confidence_score: number | null;
};

function StreamingText({
  text,
  className,
  speed = 18,
  cursorChar = "▌",
}: {
  text: string;
  className?: string;
  speed?: number;
  cursorChar?: string;
}) {
  const [visibleLength, setVisibleLength] = useState(0);
  const isComplete = visibleLength >= text.length;

  useEffect(() => {
    setVisibleLength(0);
  }, [text]);

  useEffect(() => {
    if (visibleLength >= text.length) return;
    const timer = setTimeout(() => setVisibleLength((n) => n + 1), speed);
    return () => clearTimeout(timer);
  }, [visibleLength, text.length, speed]);

  const visible = text.slice(0, visibleLength);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {visible}
      {!isComplete ? (
        <span className="animate-pulse text-primary" aria-hidden>
          {cursorChar}
        </span>
      ) : null}
    </span>
  );
}

function getReplyErrorMessage(err: unknown): string {
  const status = (err as { status?: string | number })?.status;
  const data = (err as { data?: unknown })?.data;
  const directError = (err as { error?: string })?.error;

  if (status === "TIMEOUT_ERROR") {
    return "AI reply generation is taking longer than expected. Please retry.";
  }
  if (status === "FETCH_ERROR") {
    const msg = typeof directError === "string" ? directError.toLowerCase() : "";
    if (msg.includes("abort") || msg.includes("network") || msg.includes("timeout") || msg.includes("failed to fetch")) {
      return "The request took too long or was interrupted. Please retry.";
    }
    return "A network error occurred while generating the reply. Please retry.";
  }
  if (status === "PARSING_ERROR") {
    return "The server returned an unexpected response format. Please retry.";
  }
  if (typeof data === "object" && data !== null) {
    const d = data as { error?: { message?: string }; detail?: string; message?: string };
    return d?.error?.message ?? d?.detail ?? d?.message ?? "Failed to generate reply options. Please try again.";
  }
  return "Failed to generate reply options. Please try again.";
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={cn("h-3.5 w-3.5", v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")}
        />
      ))}
    </div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const postedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(postedAt)) return "Unknown";

  const diffMs = Date.now() - postedAt;
  const absSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (absSeconds < 60) return "just now";

  const minutes = Math.floor(absSeconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function normalizeReviewsPayload(raw: unknown, fallbackPageSize: number): { reviews: GBPReviewRow[]; meta: GBPReviewsMeta } {
  const defaultMeta: GBPReviewsMeta = {
    current_page: 1,
    page_size: fallbackPageSize,
    total_pages: 1,
    total_items: 0,
  };

  if (!raw) return { reviews: [], meta: defaultMeta };

  const top = raw as Record<string, unknown>;
  let reviews: unknown[] = [];
  let metaRaw: Record<string, unknown> | undefined;

  if (Array.isArray(top.data)) {
    reviews = top.data;
    metaRaw = (top.meta_data as Record<string, unknown>) ?? undefined;
  } else if (top.data && typeof top.data === "object") {
    const nested = top.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      reviews = nested.data;
      metaRaw = (nested.meta_data as Record<string, unknown>) ?? ((top.meta_data as Record<string, unknown>) ?? undefined);
    }
  } else if (Array.isArray(raw)) {
    reviews = raw as unknown[];
  }

  const safeReviews = reviews
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: Number(item.id ?? idx + 1),
      author_name: String(item.author_name ?? "Anonymous"),
      rating: Number(item.rating ?? 0),
      text: (item.text as string | null | undefined) ?? "",
      timestamp: String(item.timestamp ?? new Date().toISOString()),
      reply_text: (item.reply_text as string | null | undefined) ?? null,
    }));

  const totalItems = Number(metaRaw?.total_items ?? safeReviews.length);
  const pageSize = Number(metaRaw?.page_size ?? fallbackPageSize) || fallbackPageSize;
  const totalPages = Number(metaRaw?.total_pages ?? Math.max(1, Math.ceil(totalItems / pageSize))) || 1;
  const currentPage = Number(metaRaw?.current_page ?? 1) || 1;

  return {
    reviews: safeReviews,
    meta: {
      current_page: currentPage,
      page_size: pageSize,
      total_pages: totalPages,
      total_items: totalItems,
    },
  };
}

export function ReviewsInboxTable() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [repliedFilter, setRepliedFilter] = useState<string>("unreplied");
  const [sortBy, setSortBy] = useState<string>("-timestamp");
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<GBPReviewRow | null>(null);
  const [reviewReplyPayload, setReviewReplyPayload] = useState<ReviewReplyPayload | null>(null);
  const [reviewReplyError, setReviewReplyError] = useState<string | null>(null);
  const [getGBPReviewReplyOptions, { isLoading: isReviewReplyLoading }] = useGetGBPReviewReplyOptionsMutation();

  const queryArgs = useMemo(
    () => ({
      locationPublicId: currentLocation?.public_id || "",
      page: currentPage,
      page_size: pageSize,
      search: searchQuery.trim() || undefined,
      rating: ratingFilter !== "all" ? parseInt(ratingFilter, 10) : undefined,
      replied: repliedFilter !== "all" ? repliedFilter === "replied" : undefined,
      sort: sortBy,
    }),
    [currentLocation?.public_id, currentPage, pageSize, ratingFilter, repliedFilter, searchQuery, sortBy]
  );

  const { data, isLoading, error, isFetching } = useGetGBPReviewsQuery(queryArgs, {
    skip: !currentLocation?.public_id,
    refetchOnMountOrArgChange: true,
  });

  const { reviews, meta } = useMemo(() => normalizeReviewsPayload(data, pageSize), [data, pageSize]);
  const totalPages = Math.max(1, meta.total_pages);
  const totalItems = meta.total_items;
  const hasActiveFilters = Boolean(searchQuery.trim()) || ratingFilter !== "all" || repliedFilter !== "unreplied";
  const showTableLoading = isLoading || isFetching;

  const clearFilters = () => {
    setSearchQuery("");
    setRatingFilter("all");
    setRepliedFilter("unreplied");
    setSortBy("-timestamp");
    setCurrentPage(1);
  };

  const pageNumbers = useMemo(() => {
    const around = 2;
    const start = Math.max(1, currentPage - around);
    const end = Math.min(totalPages, currentPage + around);
    const nums: number[] = [];
    for (let p = start; p <= end; p += 1) nums.push(p);
    return nums;
  }, [currentPage, totalPages]);

  const applyReplyPayload = (payload: {
    reply_option_1_type: string | null;
    reply_option_1: string | null;
    reply_option_2_type: string | null;
    reply_option_2: string | null;
    reply_option_3_type: string | null;
    reply_option_3: string | null;
    recommended_index: number | null;
    recommendation_why: string | null;
    confidence_score: number | null;
  }) => {
    setReviewReplyPayload({
      reply_option_1_type: payload.reply_option_1_type,
      reply_option_1: payload.reply_option_1,
      reply_option_2_type: payload.reply_option_2_type,
      reply_option_2: payload.reply_option_2,
      reply_option_3_type: payload.reply_option_3_type,
      reply_option_3: payload.reply_option_3,
      recommended_index: payload.recommended_index,
      recommendation_why: payload.recommendation_why,
      confidence_score: payload.confidence_score,
    });
  };

  /**
   * If RTK still emits a PARSING_ERROR despite responseHandler:'text', attempt to
   * salvage the options from err.data (the raw body text that RTK captured).
   * Returns true if salvage succeeded, false otherwise.
   */
  const tryRecoverFromParsingError = (err: unknown): boolean => {
    const status = (err as { status?: string })?.status;
    if (status !== "PARSING_ERROR") return false;
    const rawText = (err as { data?: string })?.data;
    if (!rawText) return false;
    try {
      type ReplyData = { reply_option_1?: string | null; reply_option_1_type?: string | null; reply_option_2?: string | null; reply_option_2_type?: string | null; reply_option_3?: string | null; reply_option_3_type?: string | null; recommended_index?: number | null; recommendation_why?: string | null; confidence_score?: number | null };
      const parsed = JSON.parse(rawText) as { data?: ReplyData } & ReplyData;
      const d: ReplyData = parsed?.data ?? parsed;
      if (d?.reply_option_1) {
        applyReplyPayload({
          reply_option_1_type: d.reply_option_1_type ?? null,
          reply_option_1: d.reply_option_1 ?? null,
          reply_option_2_type: d.reply_option_2_type ?? null,
          reply_option_2: d.reply_option_2 ?? null,
          reply_option_3_type: d.reply_option_3_type ?? null,
          reply_option_3: d.reply_option_3 ?? null,
          recommended_index: d.recommended_index ?? null,
          recommendation_why: d.recommendation_why ?? null,
          confidence_score: d.confidence_score ?? null,
        });
        return true;
      }
    } catch {
      // raw text was not parseable JSON
    }
    return false;
  };

  const handleOpenReviewReply = async (review: GBPReviewRow) => {
    if (!currentLocation?.public_id) return;
    if (isReviewReplyLoading && activeReplyReviewId === review.id) return;
    setActiveReplyReviewId(review.id);
    setSelectedReview(review);
    setReviewReplyPayload(null);
    setReviewReplyError(null);
    try {
      const payload = await getGBPReviewReplyOptions({
        locationPublicId: currentLocation.public_id,
        review_text: review.text || "",
        reviewer_name: review.author_name || undefined,
        star_rating: review.rating,
      }).unwrap();
      applyReplyPayload(payload);
    } catch (err) {
      if (!tryRecoverFromParsingError(err)) {
        setReviewReplyError(getReplyErrorMessage(err));
      }
    }
  };

  const handleCloseReviewReply = () => {
    setActiveReplyReviewId(null);
    setSelectedReview(null);
    setReviewReplyPayload(null);
    setReviewReplyError(null);
  };

  const handleRetryReviewReply = async () => {
    if (!selectedReview || !currentLocation?.public_id) return;
    setReviewReplyPayload(null);
    setReviewReplyError(null);
    try {
      const payload = await getGBPReviewReplyOptions({
        locationPublicId: currentLocation.public_id,
        review_text: selectedReview.text || "",
        reviewer_name: selectedReview.author_name || undefined,
        star_rating: selectedReview.rating,
      }).unwrap();
      applyReplyPayload(payload);
    } catch (err) {
      if (!tryRecoverFromParsingError(err)) {
        setReviewReplyError(getReplyErrorMessage(err));
      }
    }
  };

  const handleCopyReply = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getVariantTypeLabel = (rawType: string | null): string => {
    if (!rawType) return "General";
    const normalized = rawType.toLowerCase().trim();
    if (normalized.includes("empathetic") || normalized.includes("empathy")) return "Empathetic";
    if (normalized.includes("professional")) return "Professional";
    if (normalized.includes("friendly")) return "Friendly";
    if (normalized.includes("concise") || normalized.includes("short")) return "Concise";
    return rawType;
  };

  const renderReplyOptions = (review: GBPReviewRow) => {
    if (activeReplyReviewId !== review.id) return null;

    const options = [
      { idx: 1, type: reviewReplyPayload?.reply_option_1_type ?? null, text: reviewReplyPayload?.reply_option_1 ?? null },
      { idx: 2, type: reviewReplyPayload?.reply_option_2_type ?? null, text: reviewReplyPayload?.reply_option_2 ?? null },
      { idx: 3, type: reviewReplyPayload?.reply_option_3_type ?? null, text: reviewReplyPayload?.reply_option_3 ?? null },
    ].filter((o) => Boolean(o.text));

    return (
      <div className="rounded-xl border bg-muted/20 p-4 animate-in fade-in-0 slide-in-from-top-1 duration-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">AI reply variants</p>
          </div>
          <Button variant="base-ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCloseReviewReply}>
            Hide
          </Button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Compare tone variants and copy the version you want to publish in Google.
        </p>

        <div
          className={cn(
            "mt-3 rounded-lg border px-3 py-2 text-xs",
            isReviewReplyLoading && !reviewReplyPayload
              ? "border-violet-200 bg-violet-50/70 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-200"
              : "border-border/70 bg-background text-muted-foreground"
          )}
        >
          {isReviewReplyLoading && !reviewReplyPayload ? "AI is drafting reply variants..." : "AI draft panel ready"}
        </div>

        {isReviewReplyLoading && !reviewReplyPayload && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Drafting reply options...
          </div>
        )}

        {reviewReplyError && (
          <div className="mt-3 space-y-3">
            <Alert variant="error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{reviewReplyError}</AlertDescription>
            </Alert>
            <Button onClick={() => void handleRetryReviewReply()} disabled={isReviewReplyLoading} size="sm" variant="base-outline">
              {isReviewReplyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try again"}
            </Button>
          </div>
        )}

        {reviewReplyPayload && !isReviewReplyLoading && (
          <div className="mt-3 space-y-3">
            {reviewReplyPayload.recommendation_why && (
              <p className="text-xs text-muted-foreground">{reviewReplyPayload.recommendation_why}</p>
            )}
            {reviewReplyPayload.confidence_score != null && (
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round((reviewReplyPayload.confidence_score ?? 0) * 100)}%
              </p>
            )}
            {options.some((option) => Boolean(option.text)) ? (
              options.map((option) => (
                <Card
                  key={`${review.id}-${option.idx}`}
                  className={cn(
                    "border rounded-xl overflow-hidden bg-background animate-in fade-in-0 slide-in-from-bottom-1 duration-300",
                    reviewReplyPayload.recommended_index === option.idx && "ring-2 ring-primary"
                  )}
                  style={{ animationDelay: `${option.idx * 60}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Option {option.idx}</span>
                        <Badge variant="base-outline" className="text-[10px] uppercase tracking-wide">
                          {getVariantTypeLabel(option.type)}
                        </Badge>
                      </div>
                      {reviewReplyPayload.recommended_index === option.idx ? (
                        <Badge variant="base-soft" className="shrink-0">Recommended</Badge>
                      ) : null}
                    </div>
                    <div className="mb-3 min-h-[2rem] whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      <StreamingText
                        text={option.text ?? ""}
                        className="text-sm text-foreground leading-relaxed"
                        speed={14}
                      />
                    </div>
                    <Button
                      variant="base-outline"
                      size="sm"
                      onClick={() => option.text && handleCopyReply(option.text)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="py-2 text-sm text-muted-foreground">No reply options were returned. Try again.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!currentLocation?.public_id) {
    return (
      <Card className="rounded-2xl border border-border/80 py-0">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Select a location to load review inbox data.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className=" py-4 ">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inbox</p>
            <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">All reviews</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Search and filter public Google reviews for this location.
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
              placeholder="Search review text or reviewer name..."
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
                value={ratingFilter}
                onValueChange={(value) => {
                  if (!value) return;
                  setRatingFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-full border-0 bg-background shadow-sm">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stars</SelectItem>
                  <SelectItem value="5">5 stars</SelectItem>
                  <SelectItem value="4">4 stars</SelectItem>
                  <SelectItem value="3">3 stars</SelectItem>
                  <SelectItem value="2">2 stars</SelectItem>
                  <SelectItem value="1">1 star</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={repliedFilter}
              onValueChange={(value) => {
                if (!value) return;
                setRepliedFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full min-w-[min(100%,10rem)] border-0 bg-background shadow-sm sm:w-[168px]">
                <SelectValue placeholder="Reply status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="replied">Replied only</SelectItem>
                <SelectItem value="unreplied">Needs reply</SelectItem>
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
                <SelectItem value="-timestamp">Newest first</SelectItem>
                <SelectItem value="timestamp">Oldest first</SelectItem>
                <SelectItem value="-rating">Highest rating</SelectItem>
                <SelectItem value="rating">Lowest rating</SelectItem>
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
            <AlertDescription>Unable to load reviews. Please try again.</AlertDescription>
          </Alert>
        ) : showTableLoading ? (
          <div className="rounded-xl border border-border/80 bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Reviewer</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Rating</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Review</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Posted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: pageSize }).map((_, idx) => (
                  <TableRow key={`loading-row-${idx}`}>
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-full max-w-[440px]" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : reviews.length > 0 ? (
          <>
            <div className="rounded-xl border border-border/80 bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Reviewer</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Rating</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Review</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                    <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Posted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <Fragment key={review.id}>
                      <TableRow>
                        <TableCell className="px-4 py-3 align-top">
                          <span className="text-sm font-medium text-foreground">{review.author_name}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top">{renderStars(review.rating)}</TableCell>
                        <TableCell className="max-w-[520px] px-4 py-3 align-top whitespace-normal">
                          <p className="line-clamp-3 text-sm text-foreground">{review.text || "No review text provided."}</p>
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top">
                          {review.reply_text ? (
                            <Badge variant="success" className="text-xs">Replied</Badge>
                          ) : (
                            <div className="flex flex-col items-start gap-2">
                              <Badge variant="warning" className="text-xs">Needs reply</Badge>
                              <RainbowButton
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void handleOpenReviewReply(review)}
                                disabled={isReviewReplyLoading && activeReplyReviewId === review.id}
                              >
                                {isReviewReplyLoading && activeReplyReviewId === review.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4" />
                                )}
                                {isReviewReplyLoading && activeReplyReviewId === review.id ? "Drafting..." : "Draft a reply with AI"}
                              </RainbowButton>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 align-top text-xs text-muted-foreground">
                          {formatRelativeTime(review.timestamp)}
                        </TableCell>
                      </TableRow>
                      {activeReplyReviewId === review.id ? (
                        <TableRow>
                          <TableCell colSpan={5} className="px-4 pb-4 pt-0 align-top">
                            {renderReplyOptions(review)}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
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
            <p className="font-medium text-foreground">No reviews match</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Broaden your search or reset filters to see the full inbox again.
            </p>
            <Button variant="base-outline" className="mt-4" onClick={clearFilters}>
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

