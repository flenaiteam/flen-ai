"use client";

import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { AlertCircle, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useGenerateGBPPostMutation } from "@/lib/api/baseApi";
import { GBPPostsSections } from "@/components/gbp/gbp-posts-sections";
import { GBPPostTrends } from "@/components/gbp/gbp-post-trends";
import { gbpButtonClasses } from "@/components/gbp/design-system";
import { GbpAiWorkingStrip } from "@/components/gbp/gbp-ai-presence";
import { ThinkingBubble } from "@/components/gbp/gbp-ai-chat-ui";
import { StatCard } from "@/components/ui/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { RootState } from "@/lib/redux/store";
import type { GeneratePostBulkItem } from "@/types/gbp";

function toneFromScore(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

function formatCtaLabel(ctaType: string | null) {
  if (!ctaType) return "";
  const normalized = ctaType.toUpperCase().replace(/\s+/g, "_");
  const labels: Record<string, string> = {
    CALL: "Call",
    LEARN_MORE: "Learn more",
    BOOK: "Book",
    BOOK_NOW: "Book now",
    SIGN_UP: "Sign up",
    WEBSITE: "Website",
    ORDER: "Order online",
    ORDER_NOW: "Order now",
    GET_OFFER: "Get offer",
    RESERVE: "Reserve",
  };
  return labels[normalized] ?? ctaType.replace(/_/g, " ");
}

export default function PostsPage() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);

  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [generatePostMeta, setGeneratePostMeta] = useState<{
    posts: GeneratePostBulkItem[];
    error?: string;
  } | null>(null);
  const [generateGBPPost, { isLoading: isGeneratingPost }] = useGenerateGBPPostMutation();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [generateStartDate, setGenerateStartDate] = useState("");
  const [generateEndDate, setGenerateEndDate] = useState("");

  const handleOpenGeneratePost = useCallback(() => {
    setGeneratePostMeta(null);
    setShowDatePicker(true);
    setShowGeneratePanel(true);
  }, []);

  const handleStartGenerate = useCallback(
    (startDate?: string, endDate?: string) => {
      setShowDatePicker(false);
      setGeneratePostMeta(null);
      generateGBPPost({
        locationPublicId: currentLocation?.public_id || "",
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
        .unwrap()
        .then((payload) => setGeneratePostMeta({ posts: payload.posts ?? [] }))
        .catch((err) => {
          setGeneratePostMeta({
            posts: [],
            error:
              (err as { data?: { error?: { message?: string } }; error?: { message?: string } })
                ?.data?.error?.message ??
              (err as { error?: { message?: string } })?.error?.message ??
              "Failed to generate posts. Please try again.",
          });
        });
    },
    [currentLocation?.public_id, generateGBPPost]
  );

  const handleCopySummary = useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  const handleRegeneratePost = useCallback(() => {
    setShowDatePicker(true);
    setGeneratePostMeta(null);
  }, []);

  const summary = {
    totalPosts: 62,
    postsLast30Days: 12,
    daysSinceLastPost: 4,
    postsWithMedia: 45,
    postsWithCta: 28,
    activeOffersCount: 3,
    upcomingEventsCount: 2,
  };

  const mediaPct = summary.totalPosts > 0 ? summary.postsWithMedia / summary.totalPosts : 0;
  const ctaPct = summary.totalPosts > 0 ? summary.postsWithCta / summary.totalPosts : 0;
  const promoCount = summary.activeOffersCount + summary.upcomingEventsCount;

  const kpis = useMemo(
    () => [
      {
        label: "Total posts",
        value: summary.totalPosts.toLocaleString(),
        infoDescription:
          "Posts on file for this location after sync, including updates, offers, and events.",
        badgeLabel:
          summary.totalPosts >= 40
            ? "Healthy library"
            : summary.totalPosts > 0
              ? "Getting started"
              : "Room to grow",
        badgeVariant: toneFromScore(Math.min(100, summary.totalPosts * 2)),
      },
      {
        label: "Last 30 days",
        value: summary.postsLast30Days.toLocaleString(),
        infoDescription:
          "How many posts were published or synced in the last 30 days, a direct activity signal.",
        badgeLabel:
          summary.postsLast30Days >= 8
            ? "Active"
            : summary.postsLast30Days === 0
              ? "Quiet"
              : "Steady",
        badgeVariant: toneFromScore(Math.min(100, summary.postsLast30Days * 10)),
      },
      {
        label: "Since last post",
        value: `${summary.daysSinceLastPost}d`,
        infoDescription:
          "Days since the most recent post timestamp available. Frequent updates help keep the listing fresh.",
        badgeLabel:
          summary.daysSinceLastPost <= 7
            ? "Recent"
            : summary.daysSinceLastPost <= 30
              ? "Moderate gap"
              : "Stale or none",
        badgeVariant: toneFromScore(Math.max(0, 100 - summary.daysSinceLastPost * 4)),
      },
      {
        label: "With media",
        value: summary.postsWithMedia.toLocaleString(),
        infoDescription:
          "Posts that include an image or video. Visual posts often perform better in GBP feeds.",
        badgeLabel:
          summary.totalPosts === 0
            ? "N/A"
            : mediaPct >= 0.65
              ? "Visual-heavy"
              : "Add imagery",
        badgeVariant: toneFromScore(Math.round(mediaPct * 100)),
        subValue: summary.totalPosts > 0 ? `${Math.round(mediaPct * 100)}% of posts` : "0% of posts",
      },
      {
        label: "With CTA",
        value: summary.postsWithCta.toLocaleString(),
        infoDescription:
          "Posts that include a button or link. CTAs help drive calls, bookings, and site visits.",
        badgeLabel: ctaPct >= 0.45 ? "Strong CTAs" : "Could add more",
        badgeVariant: toneFromScore(Math.round(ctaPct * 100)),
        subValue: summary.totalPosts > 0 ? `${Math.round(ctaPct * 100)}% of posts` : "0% of posts",
      },
      {
        label: "Offers & events",
        value: promoCount.toLocaleString(),
        infoDescription:
          "Active offers plus upcoming events from synced posts, useful for timely promotions.",
        badgeLabel:
          promoCount >= 3 ? "Strong promos" : promoCount >= 1 ? "One live" : "None highlighted",
        badgeVariant: toneFromScore(Math.min(100, promoCount * 30)),
        subValue: `Offers ${summary.activeOffersCount} · Upcoming events ${summary.upcomingEventsCount}`,
        footer: promoCount === 0 ? "— None highlighted" : undefined,
      },
    ],
    [ctaPct, mediaPct, promoCount, summary]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Posts</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Create and schedule Google Business Profile posts.
          </p>
        </div>
        <Button
          size="md"
          onClick={handleOpenGeneratePost}
          disabled={!currentLocation?.public_id || isGeneratingPost}
          className={gbpButtonClasses.primaryCta}
        >
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      <Sheet open={showGeneratePanel} onOpenChange={setShowGeneratePanel}>
        <SheetContent
          side="right"
          className="flex h-full !w-full w-full !max-w-none flex-col overflow-y-auto p-0 sm:!max-w-none"
        >
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[800px] flex-col">
            <SheetHeader className="shrink-0 border-b border-[var(--border-default)] p-4 pr-12">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <SheetTitle>Generate post with AI</SheetTitle>
              </div>
              <SheetDescription>
                Draft campaign-ready posts. Compare, copy, and publish to Google.
              </SheetDescription>
              {generatePostMeta?.posts && generatePostMeta.posts.length > 0 && !isGeneratingPost && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="base-outline">{generatePostMeta.posts.length} generated</Badge>
                  <Button
                    variant="base-outline"
                    size="sm"
                    onClick={handleRegeneratePost}
                    disabled={isGeneratingPost}
                  >
                    {isGeneratingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate all"}
                  </Button>
                </div>
              )}
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-4 p-4 sm:p-5">
            {showDatePicker && !isGeneratingPost && (
              <div className="space-y-5 py-1">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Select a publishing date range</p>
                  <p className="text-xs text-muted-foreground">
                    The AI will plan and schedule one post per day, with regional festivals and seasonal
                    peaks considered. Minimum 15 posts.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">From</label>
                    <Input
                      type="date"
                      value={generateStartDate}
                      onChange={(e) => setGenerateStartDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">To</label>
                    <Input
                      type="date"
                      value={generateEndDate}
                      onChange={(e) => setGenerateEndDate(e.target.value)}
                      min={generateStartDate || new Date().toISOString().split("T")[0]}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Button
                    onClick={() => handleStartGenerate(generateStartDate, generateEndDate)}
                    className="sm:flex-1"
                    disabled={!generateStartDate || !generateEndDate}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate posts
                  </Button>
                  <Button
                    variant="base-ghost"
                    className="text-muted-foreground sm:flex-1"
                    onClick={() => handleStartGenerate()}
                  >
                    Skip date range
                  </Button>
                </div>
              </div>
            )}

            {!showDatePicker && (
              <>
                <GbpAiWorkingStrip active={isGeneratingPost} variant="analysis" className="mb-4" />
                {isGeneratingPost && !generatePostMeta && (
                  <div className="flex justify-start py-6">
                    <ThinkingBubble />
                  </div>
                )}
                {generatePostMeta?.error && (
                  <div className="space-y-3">
                    <Alert variant="error">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{generatePostMeta.error}</AlertDescription>
                    </Alert>
                    <Button onClick={handleRegeneratePost} disabled={isGeneratingPost} className="w-full sm:w-auto">
                      {isGeneratingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : "Try again"}
                    </Button>
                  </div>
                )}
                {generatePostMeta && !generatePostMeta.error && !isGeneratingPost && (
                  <>
                    {generatePostMeta.posts.length > 0 ? (
                      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                        {generatePostMeta.posts.map((item, index) => {
                          const title =
                            item.post.event_title ||
                            (item.keyword ? item.keyword : "Post");
                          const metaLine = [item.post.day_of_week, item.post.topic_type, item.post.post_intent]
                            .filter(Boolean)
                            .join(" · ");
                          const scheduleLine = item.post.scheduled_date
                            ? `Scheduled · ${new Date(item.post.scheduled_date + "T00:00:00").toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}${item.post.scheduled_time ? ` · ${item.post.scheduled_time}` : ""}`
                            : "";
                          const cardDescription = [metaLine, scheduleLine].filter(Boolean).join(" · ");
                          const footerLabel =
                            item.post.seasonal_context ||
                            (item.post.topic_type ? String(item.post.topic_type).replace(/_/g, " ") : null) ||
                            "Draft";
                          return (
                            <Card
                              key={`${item.keyword}-${index}`}
                              className="flex flex-col animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
                              style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
                            >
                              <CardHeader>
                                <CardTitle className="line-clamp-2 text-base font-semibold leading-snug">
                                  {title}
                                </CardTitle>
                                <CardDescription className="line-clamp-2">
                                  {cardDescription || "AI-generated draft for your Business Profile."}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="flex flex-1 flex-col space-y-3">
                                {item.post.suggested_image_description && (
                                  <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-muted/30 p-2">
                                    <p className="line-clamp-4 text-center text-xs text-[var(--text-secondary)]">
                                      {item.post.suggested_image_description}
                                    </p>
                                  </div>
                                )}
                                {item.post.summary && (
                                  <p className="line-clamp-6 text-sm leading-relaxed text-[var(--text-secondary)]">
                                    {item.post.summary}
                                  </p>
                                )}
                                {(item.post.offer_redeem_url || item.post.offer_terms || item.post.offer_coupon_code) && (
                                  <div className="space-y-1.5 border-t border-[var(--border-default)]/70 pt-2">
                                    {item.post.offer_coupon_code && (
                                      <p className="text-sm font-medium text-foreground">
                                        Code: {item.post.offer_coupon_code}
                                      </p>
                                    )}
                                    {item.post.offer_terms && (
                                      <p className="text-xs text-[var(--text-secondary)]">{item.post.offer_terms}</p>
                                    )}
                                  </div>
                                )}
                                {item.post.call_to_action_type && (
                                  <div>
                                    {item.post.call_to_action_url || item.post.offer_redeem_url ? (
                                      <a
                                        href={item.post.call_to_action_url || item.post.offer_redeem_url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                      >
                                        {formatCtaLabel(item.post.call_to_action_type)}
                                      </a>
                                    ) : (
                                      <span className="text-sm font-medium text-primary">
                                        {formatCtaLabel(item.post.call_to_action_type)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                              <CardFooter className="mt-auto flex-wrap justify-between gap-2 border-t border-[var(--border-default)]/60 pt-4">
                                <Badge variant="warning" className="max-w-[60%] truncate">
                                  {footerLabel}
                                </Badge>
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="base-outline"
                                  onClick={() => handleCopySummary(item.post.summary || "")}
                                >
                                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                                  Copy
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-3 py-4">
                        <p className="text-sm text-muted-foreground">
                          No posts were generated. You can try again with different options.
                        </p>
                        <Button onClick={handleRegeneratePost} disabled={isGeneratingPost}>
                          {isGeneratingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            subValue={kpi.subValue}
            footer={kpi.footer}
            infoDescription={kpi.infoDescription}
            badgeLabel={kpi.badgeLabel}
            badgeVariant={kpi.badgeVariant}
          />
        ))}
      </div>
      <GBPPostTrends locationPublicId={currentLocation?.public_id} />
      <GBPPostsSections locationPublicId={currentLocation?.public_id} />
    </div>
  );
}
