"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { GBPPostsSections } from "@/components/gbp/gbp-posts-sections";
import { GBPPostTrends } from "@/components/gbp/gbp-post-trends";
import { StatCard } from "@/components/ui/stat-card";
import type { RootState } from "@/lib/redux/store";

function toneFromScore(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

export default function PostsPage() {
  const { current: currentLocation } = useSelector((state: RootState) => state.locations);
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
      <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Posts</h1>
      <p className="text-sm text-[var(--text-secondary)]">Create and schedule Google Business Profile posts.</p>

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
