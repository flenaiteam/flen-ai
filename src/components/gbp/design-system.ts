export const chartSurface = {
  sectionGap: "space-y-5",
  card: "rounded-2xl border bg-background/80 shadow-sm",
  cardPadding: "p-5 sm:p-6",
  title: "text-base font-semibold text-foreground",
  subtitle: "text-sm text-muted-foreground",
  helper: "text-xs text-muted-foreground",
  iconWrap: "flex items-center gap-2",
  reviewAccent: "text-rose-600",
  postAccent: "text-emerald-600",
  chartHeightLarge: 360,
} as const;

/** Shared button classes for Google Business Profile toolbars. */
export const gbpButtonClasses = {
  primaryCta: "gap-2 border border-primary/60 shadow-sm",
  outlineCta: "gap-2 border-border/80 bg-background shadow-sm",
} as const;
