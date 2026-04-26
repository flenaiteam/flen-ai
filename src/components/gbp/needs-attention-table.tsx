"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, Copy, ExternalLink, Loader2, Sparkles, Star, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetGBPReviewReplyOptionsMutation, useGetGBPReviewsQuery } from "@/lib/api/baseApi";
import type { RootState } from "@/lib/redux/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UrgentReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  text: string;
  timestamp: string;
  reply_text: string | null;
  url: string | null;
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

function StreamingText({
  text,
  className,
  speed = 18,
  cursorChar = "¦",
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

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {text.slice(0, visibleLength)}
      {!isComplete ? (
        <span className="animate-pulse text-primary" aria-hidden>
          {cursorChar}
        </span>
      ) : null}
    </span>
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

function normalizeUrgentReviews(raw: unknown): UrgentReviewRow[] {
  if (!raw || typeof raw !== "object") return [];

  const top = raw as Record<string, unknown>;
  let metaRaw: Record<string, unknown> | undefined;

  if (Array.isArray(top.data)) {
    metaRaw = (top.meta_data as Record<string, unknown>) ?? undefined;
  } else if (top.data && typeof top.data === "object") {
    const nested = top.data as Record<string, unknown>;
    metaRaw =
      (nested.meta_data as Record<string, unknown>) ??
      ((top.meta_data as Record<string, unknown>) ?? undefined);
  }

  const urgent = metaRaw?.urgent_reviews;
  if (!Array.isArray(urgent)) return [];

  return urgent
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => ({
      id: Number(item.id ?? idx + 1),
      author_name: String(item.author_name ?? "Anonymous"),
      rating: Number(item.rating ?? 0),
      text: String(item.text ?? ""),
      timestamp: String(item.timestamp ?? new Date().toISOString()),
      reply_text: (item.reply_text as string | null | undefined) ?? null,
      url: typeof item.url === "string" && item.url.trim() ? item.url : null,
    }));
}

export function NeedsAttentionTable() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);
  const [activeReplyReviewId, setActiveReplyReviewId] = useState<number | null>(null);
  const [selectedReview, setSelectedReview] = useState<UrgentReviewRow | null>(null);
  const [reviewReplyPayload, setReviewReplyPayload] = useState<ReviewReplyPayload | null>(null);
  const [reviewReplyError, setReviewReplyError] = useState<string | null>(null);
  const [getGBPReviewReplyOptions, { isLoading: isReviewReplyLoading }] = useGetGBPReviewReplyOptionsMutation();

  const queryArgs = useMemo(
    () => ({
      locationPublicId: currentLocation?.public_id || "",
      page: 1,
      page_size: 100,
      sort: "-timestamp",
    }),
    [currentLocation?.public_id]
  );

  const { data, isLoading, isFetching, error } = useGetGBPReviewsQuery(queryArgs, {
    skip: !currentLocation?.public_id,
    refetchOnMountOrArgChange: true,
  });

  const urgentReviews = useMemo(() => normalizeUrgentReviews(data), [data]);

  const applyReplyPayload = (payload: ReviewReplyPayload) => {
    setReviewReplyPayload(payload);
  };

  const tryRecoverFromParsingError = (err: unknown): boolean => {
    const status = (err as { status?: string })?.status;
    if (status !== "PARSING_ERROR") return false;

    const rawText = (err as { data?: string })?.data;
    if (!rawText) return false;

    try {
      const parsed = JSON.parse(rawText) as { data?: Partial<ReviewReplyPayload> } & Partial<ReviewReplyPayload>;
      const d = parsed?.data ?? parsed;
      if (!d?.reply_option_1) return false;

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
    } catch {
      return false;
    }
  };

  const handleOpenReviewReply = async (review: UrgentReviewRow) => {
    if (!currentLocation?.public_id) return;

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

  const handleCloseReviewReply = () => {
    setActiveReplyReviewId(null);
    setSelectedReview(null);
    setReviewReplyPayload(null);
    setReviewReplyError(null);
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

  const renderReplyOptions = (review: UrgentReviewRow) => {
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
            {options.length > 0 ? (
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
                      <StreamingText text={option.text ?? ""} className="text-sm text-foreground leading-relaxed" speed={14} />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="base-outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => void handleCopyReply(option.text ?? "")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No reply options were returned. Please retry.</AlertDescription>
              </Alert>
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
          Select a location to load priority reviews.
        </CardContent>
      </Card>
    );
  }

  if (error && !isLoading && !isFetching) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Unable to load needs-attention reviews. Please try again.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading || isFetching) {
    return (
      <>
        <div className="py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">Needs attention first</h3>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Lower-star or sensitive reviews - respond on Google, then mark done here after you sync.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/80 bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Reviewer</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Rating</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Review</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Posted</TableHead>
                <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, idx) => (
                <TableRow key={`urgent-loading-row-${idx}`}>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-full max-w-[420px]" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="px-4 py-3"><Skeleton className="h-8 w-40" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  }

  if (urgentReviews.length === 0) {
    return null;
  }

  return (
    <>
      <div className="py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">Needs attention first</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Lower-star or sensitive reviews - respond on Google, then mark done here after you sync.
              </p>
            </div>
          </div>
          <Badge variant="error" className="w-fit shrink-0">
            {urgentReviews.length} flagged
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Reviewer</TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Rating</TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Review</TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Posted</TableHead>
              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {urgentReviews.map((review) => (
              <Fragment key={review.id}>
                <TableRow>
                  <TableCell className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{review.author_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      {renderStars(review.rating)}
                      <Badge variant="error" className="text-[10px]">{review.rating} star{review.rating !== 1 ? "s" : ""}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[520px] px-4 py-3 align-top whitespace-normal">
                    <p className="line-clamp-3 text-sm text-foreground">{review.text || "No review text provided."}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    {review.reply_text ? (
                      <Badge variant="success" className="text-xs">Replied</Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs">Needs attention</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top text-xs text-muted-foreground">
                    {formatRelativeTime(review.timestamp)}
                  </TableCell>
                  <TableCell className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      {!review.reply_text ? (
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
                      ) : null}
                      {review.url ? (
                        <Button size="sm" variant="base-outline" className="h-8 px-2.5 text-xs" asChild>
                          <a href={review.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                            View on Google
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
                {activeReplyReviewId === review.id ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-3">
                      {renderReplyOptions(review)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

