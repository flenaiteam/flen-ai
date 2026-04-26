import { useMemo } from "react";
import { ReviewsInboxTable } from "@/components/gbp/reviews-inbox-table";
import { StatCard } from "@/components/ui/stat-card";

function toneFromScore(score: number): "success" | "warning" | "error" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "error";
}

export default function ReviewsPage() {
  const summary = {
    averageRating: 4.4,
    totalReviews: 248,
    responseRate: 72,
    unansweredCount: 14,
    oldestWaitDays: 6,
    typicalReplyDays: 2.3,
    reviewsLast30Days: 23,
  };

  const approxReviewsPerWeek = Math.round((summary.reviewsLast30Days / 30) * 7);

  const kpis = useMemo(
    () => [
      {
        label: "Avg. rating",
        value: summary.averageRating.toFixed(1),
        infoDescription:
          "The average star rating (1-5) across every review synced from Google for this location.",
        badgeLabel:
          summary.averageRating >= 4.3
            ? "Strong rating"
            : summary.averageRating >= 3.8
              ? "Room to improve"
              : "Needs attention",
        badgeVariant: toneFromScore(Math.round(summary.averageRating * 20)),
      },
      {
        label: "Total reviews",
        value: summary.totalReviews.toLocaleString(),
        infoDescription:
          "Count of public Google reviews on file after sync. This is the full review history for this listing.",
        badgeLabel:
          summary.totalReviews >= 120
            ? "Solid review history"
            : summary.totalReviews >= 40
              ? "Growing"
              : "Early stage",
        badgeVariant: toneFromScore(Math.min(100, summary.totalReviews)),
        subValue: "From Google Business Profile",
      },
      {
        label: "Reply rate",
        value: `${summary.responseRate}%`,
        infoDescription:
          "Percentage of all reviews where your business has posted a public owner reply.",
        badgeLabel:
          summary.responseRate >= 80
            ? "Great engagement"
            : summary.responseRate >= 50
              ? "Could reply more"
              : "Low reply rate",
        badgeVariant: toneFromScore(summary.responseRate),
        subValue: "Of reviews have a reply",
      },
      {
        label: "Unanswered",
        value: summary.unansweredCount.toLocaleString(),
        infoDescription:
          "Reviews with no owner reply yet in Google. Responding helps customer trust and local visibility.",
        badgeLabel:
          summary.unansweredCount === 0
            ? "All caught up"
            : summary.unansweredCount <= 5
              ? "A few waiting"
              : "Backlog building",
        badgeVariant: toneFromScore(Math.max(0, 100 - summary.unansweredCount * 10)),
        subValue: summary.unansweredCount > 0 ? "Need a reply in Google" : "Nothing pending",
      },
      {
        label: "Oldest wait",
        value: summary.unansweredCount > 0 ? `${summary.oldestWaitDays}d` : "-",
        infoDescription:
          "Days since your oldest still-unanswered review was posted. Larger values mean customers are waiting longer.",
        badgeLabel:
          summary.unansweredCount === 0
            ? "No backlog"
            : summary.oldestWaitDays <= 3
              ? "Watch wait time"
              : "Long waits",
        badgeVariant: toneFromScore(Math.max(0, 100 - summary.oldestWaitDays * 15)),
        subValue: summary.unansweredCount > 0 ? "Since oldest pending review" : "No backlog",
        valueClassName: summary.unansweredCount > 0 ? "text-amber-800 dark:text-amber-400" : "text-[var(--text-muted)]",
      },
      {
        label: "Typical reply time",
        value: `${summary.typicalReplyDays.toFixed(1)}d`,
        infoDescription:
          "Typical time between customer review and your public reply, based only on answered reviews.",
        badgeLabel:
          summary.typicalReplyDays <= 1.5
            ? "Quick responses"
            : summary.typicalReplyDays <= 3
              ? "A bit slow"
              : "Very slow",
        badgeVariant: toneFromScore(Math.max(0, 100 - Math.round(summary.typicalReplyDays * 25))),
        subValue: "Average time to reply (answered reviews)",
      },
      {
        label: "30-day velocity",
        value: summary.reviewsLast30Days.toLocaleString(),
        infoDescription:
          "How many new reviews arrived in the last 30 days. Weekly pace is estimated from this rolling count.",
        badgeLabel:
          summary.reviewsLast30Days >= 20
            ? "Strong activity"
            : summary.reviewsLast30Days > 0
              ? "Steady flow"
              : "Quiet lately",
        badgeVariant: toneFromScore(Math.min(100, summary.reviewsLast30Days * 4)),
        subValue: "New reviews (rolling 30d)",
        footer:
          approxReviewsPerWeek > 0
            ? `~${approxReviewsPerWeek} / week pace`
            : "No new reviews in the last 30 days",
      },
    ],
    [approxReviewsPerWeek, summary]
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">Reviews</h1>
      <p className="text-sm text-[var(--text-secondary)]">Manage and reply to GBP reviews.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            subValue={kpi.subValue}
            footer={kpi.footer}
            valueClassName={kpi.valueClassName}
            infoDescription={kpi.infoDescription}
            badgeLabel={kpi.badgeLabel}
            badgeVariant={kpi.badgeVariant}
          />
        ))}
      </div>
      <ReviewsInboxTable />
    </div>
  );
}
