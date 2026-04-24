'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  MapPin,
  Phone,
  Search,
  ShoppingBag,
  Star,
  TrendingUp,
  TrendingDown,
  Zap,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/hooks/use-auth';
import {
  useGetLocationsQuery,
  useGetGBPPerformanceCompareQuery,
  useGetGBPDashboardOverviewQuery,
  useGetGBPPerformanceKeywordsQuery,
  useGetGBPPerformanceMetricsQuery,
  type GBPPerformanceMetric,
} from '@/lib/api/baseApi';
import type { AppDispatch, RootState } from '@/lib/redux/store';
import { setCurrentLocation, setLocationsList } from '@/lib/redux/slices/locationsSlice';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d';

const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

/** Strong ease-out — animations.dev / Emil-style UI motion */
const EASE_OUT_SNAP = 'cubic-bezier(0.23, 1, 0.32, 1)';

function DateRangeSegmentedControl({
  dateRange,
  onChange,
}: {
  dateRange: DateRange;
  onChange: (value: DateRange) => void;
}) {
  const activeIndex = DATE_RANGE_OPTIONS.findIndex((o) => o.value === dateRange);

  return (
    <div
      className="relative flex w-full max-w-[280px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-1 sm:max-w-none sm:w-auto"
      role="tablist"
      aria-label="Report date range"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-md bg-[var(--bg-surface)] shadow-sm ring-1 ring-[var(--border-default)]/60"
        style={{
          transform: `translateX(calc(${Math.max(0, activeIndex)} * 100%))`,
          transition: `transform 200ms ${EASE_OUT_SNAP}`,
        }}
      />
      {DATE_RANGE_OPTIONS.map(({ label, value }) => {
        const selected = dateRange === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(value)}
            className={cn(
              'relative z-10 flex-1 rounded-md px-3 py-1.5 text-xs font-medium outline-none select-none',
              'transition-[color,transform] duration-150',
              'active:scale-[0.97]',
              'focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-subtle)]',
              selected
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
            style={{ transitionTimingFunction: EASE_OUT_SNAP }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

const CHART_METRICS = ['WEBSITE_CLICKS', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'] as const;

const CHART_COLORS: Record<string, string> = {
  WEBSITE_CLICKS: 'rgb(14, 107, 235)',
  CALL_CLICKS: 'rgb(34, 197, 94)',
  BUSINESS_DIRECTION_REQUESTS: 'rgb(249, 115, 22)',
};

const METRIC_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  WEBSITE_CLICKS: {
    label: 'Website Clicks',
    icon: <Globe className="h-5 w-5" />,
    color: 'rgb(14, 107, 235)',
  },
  CALL_CLICKS: {
    label: 'Call Clicks',
    icon: <Phone className="h-5 w-5" />,
    color: 'rgb(34, 197, 94)',
  },
  BUSINESS_DIRECTION_REQUESTS: {
    label: 'Direction Requests',
    icon: <MapPin className="h-5 w-5" />,
    color: 'rgb(249, 115, 22)',
  },
  BUSINESS_BOOKINGS: {
    label: 'Bookings',
    icon: <ShoppingBag className="h-5 w-5" />,
    color: 'rgb(168, 85, 247)',
  },
  BUSINESS_FOOD_ORDERS: {
    label: 'Food Orders',
    icon: <Utensils className="h-5 w-5" />,
    color: 'rgb(236, 72, 153)',
  },
  BUSINESS_FOOD_MENU_CLICKS: {
    label: 'Menu Clicks',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    color: 'rgb(20, 184, 166)',
  },
};

const ACTION_METRICS = Object.keys(METRIC_META);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(range: DateRange): {
  start: string;
  end: string;
  prevStart: string;
  prevEnd: string;
} {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevEnd.getDate() - days + 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return {
    start: fmt(start),
    end: fmt(end),
    prevStart: fmt(prevStart),
    prevEnd: fmt(prevEnd),
  };
}

function aggregateByMetric(data: GBPPerformanceMetric[]): Record<string, number> {
  return data.reduce<Record<string, number>>((acc, row) => {
    acc[row.metric_name] = (acc[row.metric_name] ?? 0) + row.value;
    return acc;
  }, {});
}

function pivotByDate(
  data: GBPPerformanceMetric[],
  metrics: readonly string[]
): Record<string, number | string>[] {
  const byDate = new Map<string, Record<string, number>>();
  for (const row of data) {
    if (!metrics.includes(row.metric_name)) continue;
    if (!byDate.has(row.date)) byDate.set(row.date, {});
    byDate.get(row.date)![row.metric_name] = row.value;
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => {
      const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return { date: label, rawDate: date, ...vals };
    });
}

function formatChangeTrend(
  changePercent: number | undefined
): { trend: 'up' | 'down' | 'neutral'; trendValue: string } {
  if (changePercent === undefined || changePercent === null) {
    return { trend: 'neutral', trendValue: 'No prior period' };
  }
  const sign = changePercent >= 0 ? '+' : '';
  return {
    trend: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'neutral',
    trendValue: `${sign}${changePercent.toFixed(1)}% vs prior period`,
  };
}

type KpiTone = 'good' | 'fair' | 'poor';

interface GBPHealthScore {
  value: number;
  status: string;
  trend: number;
  breakdown?: Array<{
    name: string;
    value: number;
    fill?: string;
  }>;
}

interface GBPCriticalIssue {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  action_url?: string;
}

interface GBPProfileCompleteness {
  score: number;
  missing_fields?: string[];
  completed_fields?: string[];
}

function healthPillarCopy(itemName: string): { infoTitle: string; infoDescription: string } {
  const key = itemName.toLowerCase();
  if (key.includes('profile')) {
    return {
      infoTitle: 'Profile pillar',
      infoDescription:
        'How complete and polished your listing is across hours, photos, categories, and business details.',
    };
  }
  if (key.includes('reputation')) {
    return {
      infoTitle: 'Reputation pillar',
      infoDescription: 'Reviews, ratings, and response quality. This signals customer trust and sentiment.',
    };
  }
  if (key.includes('engagement')) {
    return {
      infoTitle: 'Engagement pillar',
      infoDescription: 'Activity such as posts, media, and Q&A that shows your listing is active and maintained.',
    };
  }
  return {
    infoTitle: itemName,
    infoDescription: 'This metric is one part of your overall GBP snapshot health score.',
  };
}

function scoreTone(value: number): KpiTone {
  if (value >= 70) return 'good';
  if (value >= 45) return 'fair';
  return 'poor';
}

function toneBadgeVariant(tone: KpiTone): 'success' | 'warning' | 'error' {
  if (tone === 'good') return 'success';
  if (tone === 'fair') return 'warning';
  return 'error';
}

function toneLabel(tone: KpiTone): string {
  if (tone === 'good') return 'On track';
  if (tone === 'fair') return 'Room to grow';
  return 'Needs work';
}

// ─── Google icon ──────────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Connect GBP card ─────────────────────────────────────────────────────────

const UNLOCK_FEATURES = [
  { icon: <Globe className="h-4 w-4" />,          label: 'Website Clicks',       desc: 'Track visits driven from your profile' },
  { icon: <Phone className="h-4 w-4" />,          label: 'Call Clicks',          desc: 'See how many customers call you' },
  { icon: <MapPin className="h-4 w-4" />,         label: 'Direction Requests',   desc: 'Monitor foot-traffic intent' },
  { icon: <BarChart3 className="h-4 w-4" />,      label: 'Performance Charts',   desc: 'Daily time-series for all metrics' },
  { icon: <Search className="h-4 w-4" />,         label: 'Search Keywords',      desc: 'Top terms driving impressions' },
  { icon: <TrendingUp className="h-4 w-4" />,     label: 'Period Comparisons',   desc: 'Week-over-week & month-over-month' },
];

function ConnectGBPCard({ locationId }: { locationId: string }) {
  const connectUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ''}/api/v1/gbp/locations/${locationId}/oauth/connect/`;

  return (
    <div className="relative overflow-hidden  ">
      {/* Decorative gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, rgb(14,107,235) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(circle, rgb(234,67,53) 0%, transparent 70%)' }}
      />

      <div className="relative py-10  sm:py-12">
        {/* Header */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] shadow-sm">
            <GoogleIcon className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                Connect Google Business Profile
              </h2>
              <Badge variant="brand" className="text-[10px]">Required</Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Authorise flen.ai to read your GBP performance data. Takes under 60 seconds.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-[var(--border-default)]" />

        {/* Feature grid */}
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          What you'll unlock
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {UNLOCK_FEATURES.map(({ icon, label, desc }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-xl border border-[var(--border-default)]  px-4 py-3"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-soft-brand-bg text-soft-brand-text">
                {icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="my-8 border-t border-[var(--border-default)]" />

        {/* Trust line + CTA */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            {[
              'Read-only access — flen.ai never posts on your behalf',
              'Revoke access any time from your Google account',
            ].map((line) => (
              <p key={line} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" />
                {line}
              </p>
            ))}
          </div>

          <a href={connectUrl}>
            <Button size="lg" className="gap-2.5 shadow-md">
              <GoogleIcon className="h-4 w-4" />
              Connect with Google
            </Button>
          </a>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(to right, #4285F4, #34A853, #FBBC05, #EA4335)' }}
      />
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border-default)] p-6 space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, organization, location, isInitialized, isAuthenticated } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const locationsList = useSelector((s: RootState) => s.locations.list);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  // Always fetch locations from the API once the user is initialized.
  // This is the authoritative source — it works even when localStorage has
  // no `selected_location` or `auth_data.locations` is empty.
  const { data: apiLocations } = useGetLocationsQuery(undefined, {
    skip: !isInitialized || !isAuthenticated || !organization?.id,
  });

  // Sync API locations into Redux and auto-select if nothing is set yet
  useEffect(() => {
    if (!apiLocations?.length) return;
    if (locationsList.length === 0) {
      dispatch(setLocationsList(apiLocations));
    }
    if (!location) {
      dispatch(setCurrentLocation(apiLocations[0]));
    }
  }, [apiLocations, location, locationsList, dispatch]);

  // Use Redux current location; while it is still null fall back to the first
  // API result so the derived locationId is ready in the same render cycle
  // (avoids an extra round-trip before queries can fire).
  const effectiveLocation = location ?? apiLocations?.[0] ?? null;

  const { start, end, prevStart, prevEnd } = useMemo(
    () => getDateRange(dateRange),
    [dateRange]
  );

  const locationId = effectiveLocation?.public_id ?? '';
  // Skip only while not yet initialized OR while we still have no location
  const skip = !isInitialized || !locationId;

  // ── Data fetching ────────────────────────────────────────────────────────────

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
  } = useGetGBPPerformanceMetricsQuery(
    { locationPublicId: locationId, start_date: start, end_date: end, page_size: 200 },
    { skip }
  );

  const { data: compareWebsite } = useGetGBPPerformanceCompareQuery(
    {
      locationPublicId: locationId,
      metric_name: 'WEBSITE_CLICKS',
      period_a_start: prevStart,
      period_a_end: prevEnd,
      period_b_start: start,
      period_b_end: end,
    },
    { skip }
  );

  const { data: compareCalls } = useGetGBPPerformanceCompareQuery(
    {
      locationPublicId: locationId,
      metric_name: 'CALL_CLICKS',
      period_a_start: prevStart,
      period_a_end: prevEnd,
      period_b_start: start,
      period_b_end: end,
    },
    { skip }
  );

  const { data: compareDirections } = useGetGBPPerformanceCompareQuery(
    {
      locationPublicId: locationId,
      metric_name: 'BUSINESS_DIRECTION_REQUESTS',
      period_a_start: prevStart,
      period_a_end: prevEnd,
      period_b_start: start,
      period_b_end: end,
    },
    { skip }
  );

  const {
    data: keywordsData,
    isLoading: keywordsLoading,
  } = useGetGBPPerformanceKeywordsQuery(
    { locationPublicId: locationId, page_size: 10 },
    { skip }
  );

  const {
    data: overviewData,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useGetGBPDashboardOverviewQuery(locationId, { skip });

  // ── Derived data ─────────────────────────────────────────────────────────────

  const metricTotals = useMemo(
    () => (metricsData?.data ? aggregateByMetric(metricsData.data) : {}),
    [metricsData]
  );

  const chartData = useMemo(
    () => (metricsData?.data ? pivotByDate(metricsData.data, CHART_METRICS) : []),
    [metricsData]
  );

  const compareMap: Record<string, number | undefined> = {
    WEBSITE_CLICKS: compareWebsite?.change_percent,
    CALL_CLICKS: compareCalls?.change_percent,
    BUSINESS_DIRECTION_REQUESTS: compareDirections?.change_percent,
  };

  const isNoConnection =
    metricsError != null &&
    'status' in metricsError &&
    (metricsError.status === 404 || metricsError.status === 403);

  const rawOverviewData = (overviewData as { data?: any } | undefined)?.data;

  const healthScore = rawOverviewData?.health_score as GBPHealthScore | undefined;
  const criticalIssues = (rawOverviewData?.critical_issues || []) as GBPCriticalIssue[];
  const profileCompleteness = rawOverviewData?.profile_completeness as GBPProfileCompleteness | undefined;
  const overviewMetrics = rawOverviewData?.metrics as any;
  const profileCompletenessScore = profileCompleteness?.score ?? 0;

  const healthMessage = healthScore
    ? healthScore.value >= 80
      ? 'Your profile is in excellent shape.'
      : healthScore.value >= 60
        ? "Your profile is performing well, with room to grow."
        : healthScore.value >= 40
          ? 'A few focused updates can improve visibility and trust.'
          : 'Key listing signals are weak. Prioritize action items below.'
    : null;

  const profilePillar = healthScore?.breakdown?.find((item) => item.name.toLowerCase().includes('profile'));
  const reputationPillar = healthScore?.breakdown?.find((item) => item.name.toLowerCase().includes('reputation'));
  const engagementPillar = healthScore?.breakdown?.find((item) => item.name.toLowerCase().includes('engagement'));

  const kpiCards = [
    {
      key: 'health',
      label: 'Health score',
      value: `${Math.round(healthScore?.value ?? 0)} / 100`,
      infoDescription:
        'Composite score (0-100) summarizing your latest GBP snapshot across profile, reputation, and engagement signals.',
      tone: scoreTone(healthScore?.value ?? 0),
      badgeLabel: toneLabel(scoreTone(healthScore?.value ?? 0)),
    },
    {
      key: 'action-items',
      label: 'Action items',
      value: `${criticalIssues.length}`,
      infoDescription:
        'Issues flagged in the latest snapshot that may need action in Google Business Profile.',
      tone: criticalIssues.length === 0 ? 'good' : criticalIssues.length <= 2 ? 'fair' : 'poor' as KpiTone,
      badgeLabel:
        criticalIssues.length === 0
          ? 'Nothing critical'
          : criticalIssues.length <= 2
            ? 'A few open'
            : 'Needs focus',
      trend: 'neutral' as const,
      trendValue: 'Flagged in snapshot',
    },
    {
      key: 'profile',
      label: 'Profile',
      value: `${Math.round(profilePillar?.value ?? profileCompletenessScore)} %`,
      infoDescription: healthPillarCopy('profile').infoDescription,
      tone: scoreTone(profilePillar?.value ?? profileCompletenessScore),
      badgeLabel: toneLabel(scoreTone(profilePillar?.value ?? profileCompletenessScore)),
    },
    {
      key: 'reputation',
      label: 'Reputation',
      value: `${Math.round(reputationPillar?.value ?? 0)}`,
      infoDescription: healthPillarCopy('reputation').infoDescription,
      tone: scoreTone(reputationPillar?.value ?? 0),
      badgeLabel: toneLabel(scoreTone(reputationPillar?.value ?? 0)),
    },
    {
      key: 'engagement',
      label: 'Engagement',
      value: `${Math.round(engagementPillar?.value ?? 0)}`,
      infoDescription: healthPillarCopy('engagement').infoDescription,
      tone: scoreTone(engagementPillar?.value ?? 0),
      badgeLabel: toneLabel(scoreTone(engagementPillar?.value ?? 0)),
    },
    {
      key: 'completeness',
      label: 'Completeness',
      value: `${Math.round(profileCompletenessScore)} %`,
      infoDescription:
        'How complete your listing fields are compared with recommended GBP profile attributes.',
      tone: scoreTone(profileCompletenessScore),
      badgeLabel: toneLabel(scoreTone(profileCompletenessScore)),
    },
  ];

  // Show skeletons while Redux is hydrating OR while queries are in-flight
  const showLoadingState = !isInitialized || metricsLoading;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 p-6">
      {/* Welcome header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {user?.display_name
              ? `Welcome back, ${user.display_name.split(' ')[0]}`
              : 'Dashboard'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
            {organization && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {organization.name}
              </span>
            )}
            {organization && location && (
              <span className="text-[var(--text-muted)]">·</span>
            )}
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {location.name}
              </span>
            )}
            {location?.is_default && (
              <Badge variant="brand" className="text-xs">
                Default
              </Badge>
            )}
          </div>
        </div>

        {/* Date range selector — segmented control with sliding pill (ease-out, under 300ms per design skill) */}
        <DateRangeSegmentedControl dateRange={dateRange} onChange={setDateRange} />
      </div>

      {/* No GBP connection — show connect card instead of all metric sections */}
      {isNoConnection ? (
        <ConnectGBPCard locationId={locationId} />
      ) : (
        <>
          {/* Action metric stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {showLoadingState
              ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
              : ACTION_METRICS.map((metric) => {
                  const meta = METRIC_META[metric];
                  const total = metricTotals[metric] ?? 0;
                  const { trend, trendValue } = formatChangeTrend(compareMap[metric]);
                  return (
                    <StatCard
                      key={metric}
                      label={meta.label}
                      value={total.toLocaleString()}
                      trend={trend}
                      trendValue={trendValue}
                      icon={meta.icon}
                    />
                  );
                })}
          </div>

          {/* Performance time-series chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold">
                  Performance Over Time
                </CardTitle>
                <div className="flex items-center gap-4">
                  {CHART_METRICS.map((m) => (
                    <span key={m} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[m] }}
                      />
                      {METRIC_META[m].label}
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {showLoadingState ? (
                <Skeleton className="h-[240px] w-full rounded-md" />
              ) : chartData.length === 0 ? (
                <div className="flex h-[240px] items-center justify-center text-sm text-[var(--text-muted)]">
                  No data for this period
                </div>
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 4, right: 4, left: -16, bottom: 4 }}
                    >
                      <defs>
                        {CHART_METRICS.map((m) => (
                          <linearGradient key={m} id={`grad-${m}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[m]} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={CHART_COLORS[m]} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelStyle={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}
                        itemStyle={{ color: 'var(--text-secondary)' }}
                        formatter={(value: number, name: string) => [
                          value.toLocaleString(),
                          METRIC_META[name]?.label ?? name,
                        ]}
                      />
                      {CHART_METRICS.map((m) => (
                        <Area
                          key={m}
                          type="monotone"
                          dataKey={m}
                          stroke={CHART_COLORS[m]}
                          strokeWidth={2}
                          fill={`url(#grad-${m})`}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
              
          {/* GBP overview (migrated from fe-flen, adapted to flen-ai primitives) */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">GBP Overview</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Snapshot of listing health, profile completeness, and priority actions.
                </p>
              </div>
              <Button variant="base-outline" size="sm" onClick={() => void refetchOverview()}>
                Refresh
              </Button>
            </div>
            {overviewLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <StatCardSkeleton key={`ov-skeleton-${i}`} />
                  ))}
                </div>
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : overviewError ? (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load dashboard overview. Please try again.
                </AlertDescription>
              </Alert>
            ) : !rawOverviewData ? (
              <div className="flex h-28 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-sm text-[var(--text-muted)]">
                No overview data available yet.
              </div>
            ) : (
              <div className="space-y-8">
                  <section>
                    <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Overview KPIs</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {kpiCards.map((card) => (
                        <StatCard
                          key={card.key}
                          label={card.label}
                          value={card.value}
                          trend={card.trend}
                          trendValue={card.trendValue}
                          infoDescription={card.infoDescription}
                          badgeLabel={card.badgeLabel}
                          badgeVariant={toneBadgeVariant(card.tone)}
                        />
                      ))}
                    </div>
                  </section>

                  {healthMessage ? (
                    <Alert variant="info">
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>{healthMessage}</AlertDescription>
                    </Alert>
                  ) : null}

       

                  

                  {overviewMetrics ? (
                    <section className="border-t border-[var(--border-default)] pt-6">
                      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Quick Insights</h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {overviewMetrics.reputation?.average_rating_30d != null ? (
                          <StatCard
                            label="Recent Rating"
                            value={overviewMetrics.reputation.average_rating_30d.toFixed(1)}
                            icon={<Star className="h-5 w-5" />}
                          />
                        ) : null}
                        {overviewMetrics.reputation?.response_rate != null ? (
                          <StatCard
                            label="Response Rate"
                            value={`${overviewMetrics.reputation.response_rate.toFixed(0)}%`}
                            icon={<Phone className="h-5 w-5" />}
                          />
                        ) : null}
                        {overviewMetrics.posts?.days_since_last_post != null ? (
                          <StatCard
                            label="Last Post"
                            value={
                              overviewMetrics.posts.days_since_last_post === 0
                                ? 'Today'
                                : `${overviewMetrics.posts.days_since_last_post}d ago`
                            }
                            icon={<Clock className="h-5 w-5" />}
                          />
                        ) : null}
                      </div>
                    </section>
                  ) : null}

              </div>
            )}
          </section>

          {/* Search keywords */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Top Search Keywords</CardTitle>
                <a
                  href="/keywords"
                  className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {(!isInitialized || keywordsLoading) ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : !keywordsData?.data?.length ? (
                <p className="text-sm text-[var(--text-muted)]">No keyword data available.</p>
              ) : (
                <div className="divide-y divide-[var(--border-default)]">
                  {keywordsData.data.map((kw) => (
                    <div key={kw.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                        <span className="truncate text-sm text-[var(--text-primary)]">
                          {kw.keyword}
                        </span>
                        {kw.trend === 'new' && (
                          <Badge variant="brand" className="text-[10px] px-1.5 py-0 shrink-0">
                            New
                          </Badge>
                        )}
                        {kw.trend === 'up' && (
                          <Badge variant="success" className="text-[10px] px-1.5 py-0 shrink-0">
                            ↑
                          </Badge>
                        )}
                        {kw.trend === 'down' && (
                          <Badge variant="error" className="text-[10px] px-1.5 py-0 shrink-0">
                            ↓
                          </Badge>
                        )}
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {kw.impressions_count.toLocaleString()}
                        </span>
                        {kw.change_percent !== null && (
                          <span
                            className={cn(
                              'ml-1.5 text-xs font-medium',
                              kw.change_percent > 0 ? 'text-success-600' : 'text-error-600'
                            )}
                          >
                            {kw.change_percent > 0 ? '+' : ''}
                            {kw.change_percent.toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Reviews', desc: 'View and respond to customer reviews', href: '/reviews' },
          { label: 'Posts', desc: 'Create and schedule GBP posts', href: '/posts' },
          { label: 'Keywords', desc: 'Track your local search keywords', href: '/keywords' },
        ].map(({ label, desc, href }) => (
          <a
            key={label}
            href={href}
            className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 hover:border-brand-300 hover:bg-soft-brand-bg transition-colors"
          >
            <p className="font-display font-semibold text-[var(--text-primary)] group-hover:text-soft-brand-text">
              {label}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
