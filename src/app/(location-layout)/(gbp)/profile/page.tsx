'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertCircle,
  Ban,
  Building2,
  CheckCircle2,
  Check,
  Clock,
  DollarSign,
  Eye,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { RainbowButton } from '@/components/ui/rainbow-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useFixBusinessAboutMutation,
  useGetGBPProfileInfoQuery,
  useRunCategoryFixerMutation,
  useRunGBPHoursOptimizerMutation,
  useSyncGBPProfileInfoMutation,
} from '@/lib/api/baseApi';
import type { RootState } from '@/lib/redux/store';
import { cn } from '@/lib/utils';

type WorkSlot = { open: { hour: number; minute: number }; close: { hour: number; minute: number } };
type WorkHours = { current_status?: string; timetable?: Record<string, WorkSlot[]> };
type ProfileData = {
  title?: string;
  address?: string;
  phone?: string;
  url?: string;
  category?: string;
  additional_categories?: string[];
  description?: string;
  rating_value?: string | number;
  rating_votes_count?: number;
  total_photos?: number;
  work_hours?: WorkHours;
  main_image?: string;
  place_id?: string;
  price_level?: number | null;
  attributes?: {
    available_attributes?: Record<string, string[]>;
    unavailable_attributes?: unknown;
  };
};

type ProfileInfoResponse = {
  data?: {
    profile?: ProfileData;
    completeness_score?: number;
    missing_fields?: string[];
  };
};

type CategorySummaryItem = { category: string; count: number };
type CategorySummary = {
  top_primary_categories?: CategorySummaryItem[];
  top_secondary_categories?: CategorySummaryItem[];
};
type CategoryRecommendation = { action: string; category: string; justification?: string };
type CategoryFixerResult = {
  category_summary?: CategorySummary | null;
  recommendations?: CategoryRecommendation[];
  error?: string;
  detail?: string;
};

type HoursOptimizerWindow = {
  day?: string;
  time?: string;
  competitors_closed_count?: number;
  competitors_open_count?: number;
  opportunity?: string;
  risk?: string;
};
type HoursOptimizerChange = {
  day?: string;
  current?: string;
  suggested?: string;
  rationale?: string;
};
type HoursOptimizerResult = {
  own_weekly_hours?: number;
  competitor_avg_weekly_hours?: number;
  competitors_count?: number;
  analysis?: {
    hours_summary?: string;
    weekly_hours_gap?: number;
    opportunity_windows?: HoursOptimizerWindow[];
    risk_windows?: HoursOptimizerWindow[];
    recommended_changes?: HoursOptimizerChange[];
  } | null;
};

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const COMMON_GBP_ATTRIBUTE_IDS: ReadonlyArray<{ id: string; group: string }> = [
  { id: 'pay_credit_card', group: 'payments' },
  { id: 'pay_debit_card', group: 'payments' },
  { id: 'pay_mobile_nfc', group: 'payments' },
  { id: 'pay_cash', group: 'payments' },
  { id: 'has_online_appointments', group: 'offerings' },
  { id: 'requires_appointments', group: 'planning' },
  { id: 'has_service_repair', group: 'offerings' },
  { id: 'has_onsite_services', group: 'service_options' },
  { id: 'has_wheelchair_accessible_entrance', group: 'accessibility' },
  { id: 'has_wheelchair_accessible_restroom', group: 'accessibility' },
  { id: 'has_wheelchair_accessible_parking', group: 'accessibility' },
  { id: 'has_wheelchair_accessible_seating', group: 'accessibility' },
  { id: 'has_restroom', group: 'amenities' },
  { id: 'gender_neutral_restroom', group: 'amenities' },
  { id: 'offers_free_wifi', group: 'amenities' },
  { id: 'lgbtq_friendly', group: 'crowd' },
] as const;

function titleCaseDay(raw: string): string {
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : 'Unknown';
}

function formatHourMinute(hour?: number, minute?: number): string {
  const h = Number.isFinite(hour) ? Number(hour) : 0;
  const m = Number.isFinite(minute) ? Number(minute) : 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatSlots(slots?: WorkSlot[]): string {
  if (!slots?.length) return 'Closed';
  return slots
    .map((slot) => `${formatHourMinute(slot.open?.hour, slot.open?.minute)}-${formatHourMinute(slot.close?.hour, slot.close?.minute)}`)
    .join(', ');
}

function formatAttributeLabel(raw: string) {
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeAttributeStringList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).map((s) => s.trim());
  }
  if (typeof raw === 'object') {
    const list: string[] = [];
    for (const vals of Object.values(raw as Record<string, unknown>)) {
      if (Array.isArray(vals)) {
        for (const v of vals) {
          if (typeof v === 'string' && v.trim()) list.push(v.trim());
        }
      } else if (typeof vals === 'string' && vals.trim()) {
        list.push(vals.trim());
      }
    }
    return list;
  }
  return [];
}

function collectOwnedAttributeIds(profile?: ProfileData): Set<string> {
  const out = new Set<string>();
  const aa = profile?.attributes?.available_attributes;
  if (!aa || typeof aa !== 'object') return out;
  for (const vals of Object.values(aa)) {
    if (!Array.isArray(vals)) continue;
    for (const v of vals) {
      if (typeof v === 'string' && v.trim()) out.add(v.trim().toLowerCase());
    }
  }
  return out;
}

function collectUnavailableAttributeIds(profile?: ProfileData): Set<string> {
  return new Set(normalizeAttributeStringList(profile?.attributes?.unavailable_attributes).map((x) => x.toLowerCase()));
}

type AttributeChecklistStatus = 'present' | 'missing' | 'unavailable';

function getCommonAttributeChecklist(profile?: ProfileData): {
  rows: ReadonlyArray<{ id: string; group: string; status: AttributeChecklistStatus }>;
  presentCount: number;
  missingCount: number;
  unavailableCount: number;
} {
  const owned = collectOwnedAttributeIds(profile);
  const unavailable = collectUnavailableAttributeIds(profile);
  const rows: { id: string; group: string; status: AttributeChecklistStatus }[] = [];
  let presentCount = 0;
  let missingCount = 0;
  let unavailableCount = 0;
  for (const row of COMMON_GBP_ATTRIBUTE_IDS) {
    const key = row.id.toLowerCase();
    let status: AttributeChecklistStatus;
    if (owned.has(key)) {
      status = 'present';
      presentCount += 1;
    } else if (unavailable.has(key)) {
      status = 'unavailable';
      unavailableCount += 1;
    } else {
      status = 'missing';
      missingCount += 1;
    }
    rows.push({ ...row, status });
  }
  const order: Record<AttributeChecklistStatus, number> = { missing: 0, unavailable: 1, present: 2 };
  rows.sort((a, b) => order[a.status] - order[b.status] || a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
  return { rows, presentCount, missingCount, unavailableCount };
}

function formatPriceLevel(level: number | null | undefined): string | null {
  if (level == null || !Number.isFinite(level)) return null;
  const n = Math.min(4, Math.max(1, Math.round(level)));
  return '$'.repeat(n);
}

function getTodayClosingSummary(timetable?: Record<string, WorkSlot[]>): string | null {
  if (!timetable) return null;
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayKey = dayKeys[new Date().getDay()];
  const slots = timetable[dayKey];
  if (!slots?.length) return 'Closed today';
  const last = slots[slots.length - 1];
  const h = last.close.hour;
  const m = last.close.minute;
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  const mm = String(m).padStart(2, '0');
  return `Closes ${h12}:${mm} ${ampm}`;
}

function hasConfiguredHours(profile?: ProfileData): boolean {
  const t = profile?.work_hours?.timetable;
  if (!t) return false;
  return Object.values(t).some((slots) => Array.isArray(slots) && slots.length > 0);
}

function ProfilePresenceField({
  label,
  present,
  icon: Icon,
  action,
  children,
}: {
  label: string;
  present: boolean;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-md border border-border bg-muted/20 p-3 transition-colors">
      <div className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', present ? 'bg-emerald-500' : 'bg-muted-foreground/50')} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          </div>
          {action}
        </div>
        <div className={cn('break-words text-sm', present ? 'text-foreground' : 'text-muted-foreground italic')}>
          {present ? children : 'Not set in Google Business Profile'}
        </div>
      </div>
    </div>
  );
}

function CategorySummaryView({
  summary,
  existingCategories,
}: {
  summary: CategorySummary;
  existingCategories: string[];
}) {
  const existingSet = new Set(existingCategories.map((c) => c.toLowerCase()));

  const renderList = (title: string, items: CategorySummaryItem[] = []) => (
    <div className="flex-1 space-y-2">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {items.slice(0, 12).map((item) => {
              const isOwn = existingSet.has(item.category.toLowerCase());
              return (
                <div
                  key={`${title}-${item.category}`}
                  className={cn(
                    'flex items-center justify-between rounded-md px-3 py-1.5 text-xs border',
                    isOwn
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:bg-emerald-900/60 dark:border-emerald-500 dark:text-emerald-50'
                      : 'border-border bg-muted/50 text-foreground'
                  )}
                >
                  <span className="truncate">{item.category}</span>
                  <div className="flex items-center gap-2">
                    {isOwn && (
                      <span className="text-[10px] rounded-full bg-emerald-600/80 px-2 py-0.5 text-emerald-50">
                        Yours
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground">×{item.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {items.length > 12 && (
            <p className="text-[11px] text-muted-foreground">
              +{items.length - 12} more categories not shown
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs font-medium text-foreground">Competitor category landscape</div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {renderList('Top primary', summary.top_primary_categories ?? [])}
        {renderList('Top secondary', summary.top_secondary_categories ?? [])}
      </div>
    </div>
  );
}

function CategoryRecommendationsView({
  recommendations,
  existingCategories,
}: {
  recommendations: CategoryRecommendation[];
  existingCategories: string[];
}) {
  if (!recommendations || recommendations.length === 0) return null;
  const existingSet = new Set(existingCategories.map((c) => c.toLowerCase()));

  const grouped: Record<string, CategoryRecommendation[]> = recommendations.reduce(
    (acc, rec) => {
      const key = rec.action;
      if (!acc[key]) acc[key] = [];
      acc[key].push(rec);
      return acc;
    },
    {} as Record<string, CategoryRecommendation[]>
  );

  const order = ['add', 'delete', 'move_to_primary', 'move_to_secondary'];
  const labelMap: Record<string, string> = {
    add: 'Add',
    delete: 'Remove',
    move_to_primary: 'Move to primary',
    move_to_secondary: 'Move to secondary',
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs font-medium text-foreground">Flen recommendations</div>
      <div className="space-y-3">
        {order
          .filter((key) => grouped[key]?.length)
          .map((key) => (
            <div key={key} className="space-y-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {labelMap[key] ?? key}
              </div>
              <div className="space-y-1">
                {grouped[key].map((rec, idx) => (
                  <div
                    key={`${key}-${rec.category}-${idx}`}
                    className={cn(
                      'rounded-md border px-3 py-2 text-xs transition transform hover:-translate-y-0.5 hover:shadow-md',
                      key === 'add' &&
                        'border-emerald-600/60 bg-emerald-950 text-emerald-50 dark:border-emerald-500/70 dark:bg-emerald-950/90',
                      key === 'delete' &&
                        'border-rose-600/60 bg-rose-950 text-rose-50 dark:border-rose-500/70 dark:bg-rose-950/90',
                      (key === 'move_to_primary' || key === 'move_to_secondary') &&
                        'border-amber-600/50 bg-amber-100 text-amber-950 dark:border-amber-500/70 dark:bg-amber-950/85 dark:text-amber-50',
                      !['add', 'delete', 'move_to_primary', 'move_to_secondary'].includes(key) &&
                        'border-border bg-muted/50',
                      existingSet.has(rec.category.toLowerCase()) && 'ring-2 ring-emerald-400/80'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate font-medium',
                          key === 'add' && 'text-emerald-50',
                          key === 'delete' && 'text-rose-50',
                          (key === 'move_to_primary' || key === 'move_to_secondary') &&
                            'text-amber-950 dark:text-amber-50',
                          !['add', 'delete', 'move_to_primary', 'move_to_secondary'].includes(key) &&
                            'text-foreground'
                        )}
                      >
                        {rec.category}
                      </span>
                      <span
                        className={cn(
                          'flex items-center gap-1 text-[10px] uppercase tracking-wide',
                          key === 'add' && 'text-emerald-200',
                          key === 'delete' && 'text-rose-200',
                          (key === 'move_to_primary' || key === 'move_to_secondary') &&
                            'text-amber-800 dark:text-amber-200',
                          !['add', 'delete', 'move_to_primary', 'move_to_secondary'].includes(key) &&
                            'text-muted-foreground'
                        )}
                      >
                        {key === 'add' && (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-emerald-950">
                            +
                          </span>
                        )}
                        {key === 'delete' && (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-400 text-[9px] font-bold text-rose-950">
                            -
                          </span>
                        )}
                        {(key === 'move_to_primary' || key === 'move_to_secondary') && (
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-amber-950">
                            ⇄
                          </span>
                        )}
                        {labelMap[key] ?? key}
                      </span>
                    </div>
                    {rec.justification && (
                      <p
                        className={cn(
                          'text-[11px] leading-snug',
                          key === 'add' && 'text-emerald-100',
                          key === 'delete' && 'text-rose-100',
                          (key === 'move_to_primary' || key === 'move_to_secondary') &&
                            'text-amber-900 dark:text-amber-100',
                          !['add', 'delete', 'move_to_primary', 'move_to_secondary'].includes(key) &&
                            'text-muted-foreground'
                        )}
                      >
                        {rec.justification}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function AiWorkingStrip({ active }: { active: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 transition-colors',
        active
          ? 'border-violet-200 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-950/20'
          : 'border-[var(--border-default)] bg-[var(--bg-subtle)]'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
              Analysis Engine
            </p>
            <p className="text-sm text-[var(--text-primary)]">
              {active ? 'Comparing signals from your ranking grids...' : 'Analysis ready'}
            </p>
          </div>
        </div>
        {active ? <Loader2 className="h-4 w-4 animate-spin text-violet-500" /> : null}
      </div>
    </div>
  );
}

function toneFromValue(value: number): 'success' | 'warning' | 'error' {
  if (value >= 80) return 'success';
  if (value >= 50) return 'warning';
  return 'error';
}

export default function ProfilePage() {
  const { current: currentLocation } = useSelector((s: RootState) => s.locations);
  const locationId = currentLocation?.public_id ?? '';

  const { data, isLoading, error, refetch } = useGetGBPProfileInfoQuery(locationId, { skip: !locationId });
  const [syncProfileInfo, { isLoading: isSyncing }] = useSyncGBPProfileInfoMutation();
  const [fixBusinessAbout, { isLoading: isImprovingAbout }] = useFixBusinessAboutMutation();
  const [runHoursOptimizer, { isLoading: isFixingHours }] = useRunGBPHoursOptimizerMutation();
  const [runCategoryFixer, { isLoading: isFixingCategories }] = useRunCategoryFixerMutation();

  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutOptions, setAboutOptions] = useState<{
    description_option_1: string | null;
    description_option_2: string | null;
    description_option_3: string | null;
    recommended_index: number | null;
    recommendation_why: string | null;
    confidence_score: number | null;
  } | null>(null);

  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursResult, setHoursResult] = useState<HoursOptimizerResult | null>(null);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [hoursSearch, setHoursSearch] = useState('');
  const [attributesOpen, setAttributesOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesResult, setCategoriesResult] = useState<CategoryFixerResult | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const response = data as ProfileInfoResponse | undefined;
  const profile = response?.data?.profile;
  const completeness = response?.data?.completeness_score ?? 0;
  const missingFields = response?.data?.missing_fields ?? [];

  const rating = Number(profile?.rating_value ?? 0);
  const reviews = profile?.rating_votes_count ?? 0;
  const photos = profile?.total_photos ?? 0;
  const categoriesCount = (profile?.category ? 1 : 0) + (profile?.additional_categories?.length ?? 0);

  const kpis = useMemo(
    () => [
      {
        label: 'Completeness',
        value: `${completeness}%`,
        infoDescription: 'Estimated share of recommended listing fields filled in.',
        badgeLabel: completeness >= 90 ? 'Well filled' : completeness >= 70 ? 'Good' : 'Needs work',
        badgeVariant: toneFromValue(completeness),
      },
      {
        label: 'Google rating',
        value: Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : '—',
        infoDescription: 'Public star rating shown on your listing.',
        badgeLabel: rating >= 4.2 ? 'Strong' : rating >= 3.6 ? 'Okay' : 'Watch reviews',
        badgeVariant: toneFromValue(Math.round(rating * 20)),
      },
      {
        label: 'Reviews',
        value: reviews.toLocaleString(),
        infoDescription: 'Total reviews associated with this listing.',
        badgeLabel: reviews >= 40 ? 'Solid volume' : reviews > 0 ? 'Growing' : 'Starting',
        badgeVariant: toneFromValue(Math.min(100, reviews)),
      },
      {
        label: 'Photos',
        value: `${photos}`,
        infoDescription: 'Total photos associated with your listing.',
        badgeLabel: photos >= 100 ? '100+ met' : `Missing ${Math.max(0, 100 - photos)}`,
        badgeVariant: toneFromValue(photos),
      },
      {
        label: 'Categories',
        value: `${categoriesCount}`,
        infoDescription: 'Primary and additional categories for discovery.',
        badgeLabel: categoriesCount >= 2 ? 'Good coverage' : categoriesCount === 1 ? 'Primary only' : 'Missing',
        badgeVariant: toneFromValue(categoriesCount * 50),
      },
      {
        label: 'Suggested gaps',
        value: `${missingFields.length}`,
        infoDescription: 'Fields still flagged missing in completeness checks.',
        badgeLabel: missingFields.length === 0 ? 'None flagged' : missingFields.length <= 3 ? 'A few left' : 'Several gaps',
        badgeVariant: toneFromValue(100 - missingFields.length * 20),
      },
    ],
    [categoriesCount, completeness, missingFields.length, photos, rating, reviews]
  );

  const handleSync = async () => {
    if (!locationId) return;
    try {
      const res = await syncProfileInfo(locationId).unwrap();
      toast.success('Sync started', { description: res?.message ?? 'Profile sync queued.' });
      void refetch();
    } catch (e) {
      toast.error('Unable to sync profile');
    }
  };

  const handleImproveAbout = async () => {
    if (!locationId) return;
    setAboutOpen(true);
    try {
      const res = await fixBusinessAbout({
        locationPublicId: locationId,
        current_description: profile?.description,
      }).unwrap();
      setAboutOptions(res);
    } catch {
      toast.error('Unable to generate description options');
      setAboutOptions(null);
    }
  };

  const runHoursAnalysis = async () => {
    if (!locationId || isFixingHours) return;
    setHoursError(null);
    try {
      const res = await runHoursOptimizer(locationId).unwrap();
      setHoursResult((res ?? null) as HoursOptimizerResult | null);
      setHoursError(null);
    } catch (e) {
      const msg =
        (e as { data?: { detail?: string; error?: string } })?.data?.detail ||
        (e as { data?: { detail?: string; error?: string } })?.data?.error ||
        'Unable to load hours analysis. Complete at least one ranking grid scan first.';
      setHoursError(msg);
      setHoursResult(null);
    }
  };

  const handleFixHours = async () => {
    if (!locationId || isFixingHours) return;
    setHoursOpen(true);
    setHoursResult(null);
    setHoursError(null);
    await runHoursAnalysis();
  };

  const handleFixCategories = async () => {
    if (!locationId) return;
    setCategoriesOpen(true);
    setCategoriesError(null);
    setCategoriesResult(null);
    try {
      const res = await runCategoryFixer({ locationPublicId: locationId }).unwrap();
      const typed = (res ?? {}) as CategoryFixerResult;
      if (typed.error === 'no_grid_data') {
        setCategoriesError(
          typed.detail || 'You need at least one completed ranking grid scan before fixing categories.'
        );
      } else {
        setCategoriesResult(typed);
      }
    } catch (e) {
      const msg =
        (e as { data?: { detail?: string; error?: string } })?.data?.detail ||
        (e as { data?: { detail?: string; error?: string } })?.data?.error ||
        'Unable to load category recommendations. Please try again.';
      setCategoriesError(msg);
      setCategoriesResult(null);
    }
  };

  const safeSummary = categoriesResult?.category_summary ?? null;
  const safeRecommendations = categoriesResult?.recommendations ?? [];
  const existingCategories: string[] = [
    profile?.category,
    ...(profile?.additional_categories ?? []),
  ].filter(Boolean) as string[];
  const weeklyHoursRows = useMemo(
    () =>
      WEEK_DAYS.map((day) => {
        const slots = profile?.work_hours?.timetable?.[day] ?? [];
        return {
          day,
          dayLabel: titleCaseDay(day),
          isOpen: slots.length > 0,
          hoursLabel: formatSlots(slots),
        };
      }),
    [profile?.work_hours?.timetable]
  );
  const filteredWeeklyRows = useMemo(() => {
    const q = hoursSearch.trim().toLowerCase();
    if (!q) return weeklyHoursRows;
    return weeklyHoursRows.filter((row) => row.dayLabel.toLowerCase().includes(q));
  }, [hoursSearch, weeklyHoursRows]);
  const closingSummary = getTodayClosingSummary(profile?.work_hours?.timetable);
  const mapsUrl = profile?.place_id?.trim()
    ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(profile.place_id.trim())}`
    : profile?.address?.trim()
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address.trim())}`
      : undefined;
  const numericRating = Number(profile?.rating_value ?? 0);
  const additionalCategories = profile?.additional_categories ?? [];
  const attrPayments = profile?.attributes?.available_attributes?.payments ?? [];
  const attrOfferings = profile?.attributes?.available_attributes?.offerings ?? [];
  const attrUnavailable = normalizeAttributeStringList(profile?.attributes?.unavailable_attributes);
  const checklist = getCommonAttributeChecklist(profile);
  const checklistTotal = COMMON_GBP_ATTRIBUTE_IDS.length;
  const photoTotal = profile?.total_photos ?? 0;
  const photosShortOf100 = Math.max(0, 100 - photoTotal);
  const priceLabel = formatPriceLevel(profile?.price_level);
  const dayIndexToday = (() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  })();
  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn('h-4 w-4', star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Unable to load profile information. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
            No profile information available yet.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Profile</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Signals from your live Google Business Profile. Use AI tools to refine copy and keep categories current.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="base-outline" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.value}
            infoDescription={k.infoDescription}
            badgeLabel={k.badgeLabel}
            badgeVariant={k.badgeVariant}
          />
        ))}
      </div>

      <Card className="overflow-hidden rounded-lg border border-border bg-background shadow-none">
        <div className="space-y-4 p-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="h-[90px] w-[90px]  overflow-hidden rounded-lg bg-muted md:h-[180px] max-w-[180px md:w-[180px] max-h-[180px">
              {profile.main_image ? (
                <img
                  src={profile.main_image}
                  alt={profile?.title ? `Cover photo — ${profile?.title}` : 'Business cover photo'}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
                  <ImageIcon className="h-8 w-8 text-neutral-400 md:h-10 md:w-10" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h2 className="max-w-full break-words text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                  {profile.title ?? 'Business profile'}
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="success-solid" className="h-6 gap-1 px-2 font-normal">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Claimed
                  </Badge>
                  <Badge variant="info" className="h-6 gap-1 px-2 font-normal">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg ">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="text-base font-semibold tabular-nums text-foreground">
                      {Number.isFinite(numericRating) && numericRating > 0 ? numericRating.toFixed(1) : '—'}
                    </span>
                    {Number.isFinite(numericRating) && numericRating > 0 ? renderStars(numericRating) : null}
                    <span className="text-sm text-muted-foreground">
                      ({(profile.rating_votes_count ?? 0).toLocaleString()} reviews)
                    </span>
                  </div>
                  {profile.category ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {profile.category}
                    </span>
                  ) : null}
                  {priceLabel ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5 shrink-0" />
                      {priceLabel}
                    </span>
                  ) : null}
                  {mapsUrl ? (
              <Button size="sm" variant="base-outline" className="w-full shrink-0 lg:w-auto lg:self-start" asChild>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  View on Maps
                  <ExternalLink className="ml-2 h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="base-outline" disabled className="w-full shrink-0 opacity-60 lg:w-auto lg:self-start">
                View on Maps
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            )}
                </div>
              </div>
            </div>
            </div>
          </div>

          <div>
            <div className="mb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact &amp; hours</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfilePresenceField label="Address" present={Boolean(profile.address?.trim())} icon={MapPin}>
                {profile.address}
              </ProfilePresenceField>
              <ProfilePresenceField label="Phone" present={Boolean(profile.phone?.trim())} icon={Phone}>
                {profile.phone ? (
                  <a href={`tel:${profile.phone}`} className="font-medium underline-offset-2 hover:underline">
                    {profile.phone}
                  </a>
                ) : null}
              </ProfilePresenceField>
              <ProfilePresenceField label="Website" present={Boolean(profile.url?.trim())} icon={Globe}>
                {profile.url ? (
                  <a href={profile.url} target="_blank" rel="noopener noreferrer" className="font-medium break-all underline-offset-2 hover:underline">
                    {profile.url}
                  </a>
                ) : null}
              </ProfilePresenceField>
              <ProfilePresenceField
                label="Hours"
                present={hasConfiguredHours(profile)}
                icon={Clock}
                // action={
                //   <RainbowButton size="sm" variant="outline" onClick={handleFixHours} disabled={isFixingHours}>
                //     {isFixingHours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                //     Fix business hours
                //   </RainbowButton>
                // }
              >
                <span
                  className={cn(
                    'font-medium',
                    profile.work_hours?.current_status?.toLowerCase().includes('open')
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-700 dark:text-rose-400'
                  )}
                >
                  {profile.work_hours?.current_status ?? '—'}
                </span>
                {closingSummary ? <span className="text-muted-foreground"> · {closingSummary}</span> : null}
              </ProfilePresenceField>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-lg border border-border bg-background shadow-none">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-[var(--text-muted)]" />
              About
            </p>
            {/* <Button size="sm" variant="base-outline" onClick={handleImproveAbout} disabled={isImprovingAbout}>
              {isImprovingAbout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Improve description
            </Button> */}

            <RainbowButton size="sm" variant="outline" onClick={handleImproveAbout} disabled={isImprovingAbout}>
              {isImprovingAbout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Improve description
            </RainbowButton>
          </div>
          <p className={cn('text-sm leading-relaxed', !profile.description && 'text-[var(--text-muted)] italic')}>
            {profile.description ?? 'No description yet.'}
          </p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-lg border border-border bg-background shadow-none">
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <h3 className="text-sm font-medium text-foreground">Business hours</h3>
          </div>
          <RainbowButton size="sm" variant="outline" onClick={handleFixHours} disabled={isFixingHours}>
            {isFixingHours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Fix business hours
          </RainbowButton>
        </div>
        <div className="divide-y divide-border p-2 sm:p-2">
          {weeklyHoursRows.map((item, index) => {
            const isToday = index === dayIndexToday;
            const isClosed = item.hoursLabel.toLowerCase() === 'closed';
            const timeLabel = item.hoursLabel.replace(' - ', ' – ');
            return (
              <div
                key={item.day}
                className={cn(
                  'flex flex-col gap-1 rounded-md px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
                  isToday && 'bg-primary/5 ring-1 ring-primary/15',
                  !isToday && index % 2 === 1 && 'bg-muted/20'
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-sm font-medium text-foreground', isToday && 'text-primary')}>
                      {item.dayLabel}
                    </span>
                    {isToday ? (
                      <Badge variant="base-soft" className="h-5 text-[10px] font-medium uppercase tracking-wide">
                        Today
                      </Badge>
                    ) : null}
                  </div>
                  {isClosed ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">No hours listed for this day</p>
                  ) : null}
                </div>
                <div
                  className={cn(
                    'shrink-0 tabular-nums text-sm font-medium sm:text-right',
                    isClosed ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {isClosed ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Closed
                    </span>
                  ) : (
                    timeLabel
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="overflow-hidden rounded-lg border border-border bg-background shadow-none">
        <div className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-medium text-foreground">Categories</h3>
            </div>
            <RainbowButton size="sm" variant="outline" onClick={handleFixCategories} disabled={isFixingCategories}>
              {isFixingCategories ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Fix categories
            </RainbowButton>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {profile.category ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Primary</p>
              <Badge variant="base-soft" className="text-sm">{profile.category}</Badge>
            </div>
          ) : null}
          {additionalCategories.length > 0 ? (
            <div className="rounded-md border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Additional</p>
              <div className="flex flex-wrap gap-2">
                {additionalCategories.map((cat) => (
                  <Badge key={cat} variant="base-outline">{cat}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No additional categories set.</p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden rounded-lg border border-border bg-background shadow-none">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-medium text-foreground">Photos</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold tabular-nums text-foreground">{photoTotal}</span>
              <span className="text-sm text-muted-foreground">total</span>
              {photoTotal < 100 ? (
                <Badge variant="warning">Missing {photosShortOf100} to 100</Badge>
              ) : (
                <Badge variant="success-solid">100+ met</Badge>
              )}
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div
              className={cn(
                'flex items-center justify-between rounded-md p-3',
                photoTotal < 100
                  ? 'border border-rose-200/90 bg-rose-50/50 dark:border-rose-900/45 dark:bg-rose-950/20'
                  : 'bg-muted/50'
              )}
            >
              <span className="text-sm font-medium text-foreground">What&apos;s missing</span>
              <span
                className={cn(
                  'text-right text-sm font-semibold tabular-nums',
                  photoTotal < 100 ? 'text-rose-800 dark:text-rose-200' : 'text-emerald-700 dark:text-emerald-400'
                )}
              >
                {photoTotal < 100 ? `${photosShortOf100} photos to reach 100` : 'At or above 100'}
              </span>
            </div>
            {profile.main_image ? (
              <div className="relative h-32 overflow-hidden rounded-lg border border-border">
                <img src={profile.main_image} alt="Main image" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  No photo available from Google
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-lg border border-border bg-background shadow-none">
          <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <h3 className="text-sm font-medium text-foreground">Attributes</h3>
            </div>
            <RainbowButton size="sm" variant="outline" onClick={() => setAttributesOpen(true)}>
              Fix attributes
            </RainbowButton>
          </div>
          <div className="space-y-4 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">From Google (synced)</p>
            {attrPayments.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Payment methods</p>
                <div className="flex flex-wrap gap-2">
                  {attrPayments.map((payment, index) => (
                    <Badge key={`${payment}-${index}`} variant="base-outline" className="text-xs">
                      {formatAttributeLabel(payment)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {attrOfferings.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Offerings</p>
                <div className="flex flex-wrap gap-2">
                  {attrOfferings.map((offering, index) => (
                    <Badge key={`${offering}-${index}`} variant="base-outline" className="text-xs">
                      {formatAttributeLabel(offering)}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {attrUnavailable.length > 0 ? (
              <div className="rounded-lg border border-amber-200/90 bg-amber-50/50 p-3 dark:border-amber-900/45 dark:bg-amber-950/25">
                <p className="mb-1.5 text-xs font-semibold text-amber-950 dark:text-amber-200">Marked unavailable or not enabled</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {attrUnavailable.slice(0, 14).map(formatAttributeLabel).join(' · ')}
                  {attrUnavailable.length > 14 ? ` · +${attrUnavailable.length - 14} more` : ''}
                </p>
              </div>
            ) : null}
            {attrPayments.length === 0 && attrOfferings.length === 0 && attrUnavailable.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                No extra attribute groups were returned for this listing yet (payments / offerings may be empty).
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      <Sheet open={aboutOpen} onOpenChange={setAboutOpen}>
        <SheetContent side="right" className="w-full max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Improve business description</SheetTitle>
            <SheetDescription>Choose one option and copy it into your GBP About field.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 p-4">
            <AiWorkingStrip active={isImprovingAbout && !aboutOptions} />
            {isImprovingAbout && !aboutOptions ? (
              <div className="py-6 text-sm text-[var(--text-muted)]">Generating options...</div>
            ) : (
              <div className="space-y-3">
                {[aboutOptions?.description_option_1, aboutOptions?.description_option_2, aboutOptions?.description_option_3]
                  .filter(Boolean)
                  .map((text, idx) => (
                    <Card key={idx}>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[var(--text-muted)]">Option {idx + 1}</span>
                          {aboutOptions?.recommended_index === idx + 1 ? <Badge variant="brand">Recommended</Badge> : null}
                        </div>
                        <p className="text-sm">{text}</p>
                      </CardContent>
                    </Card>
                  ))}
                {aboutOptions?.recommendation_why ? (
                  <p className="text-xs text-[var(--text-muted)]">{aboutOptions.recommendation_why}</p>
                ) : null}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={hoursOpen} onOpenChange={setHoursOpen}>
        <SheetContent side="right" style={{ width: '100%', maxWidth: '800px' }} className="w-full max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fix business hours</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              AI analysis of your hours vs local pack competitors from your ranking grid data.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 space-y-3 p-4">
            <AiWorkingStrip active={isFixingHours && !hoursResult && !hoursError} />
            {hoursError ? (
              <div className="flex items-start gap-2 rounded-md border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                <p>{hoursError}</p>
              </div>
            ) : null}

            <Card>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hours analysis</p>
                  <Button
                    size="sm"
                    variant="base-outline"
                    onClick={runHoursAnalysis}
                    disabled={isFixingHours}
                  >
                    {isFixingHours ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh
                  </Button>
                </div>
                {hoursResult ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your weekly hours</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{hoursResult.own_weekly_hours ?? 0}</p>
                        <p className="mt-1 text-sm text-muted-foreground">hours open</p>
                      </div>
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Competitor average</p>
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                          {hoursResult.competitor_avg_weekly_hours ?? 0}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Mean weekly hours among {hoursResult.competitors_count ?? 0} competitors
                        </p>
                      </div>
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hours gap</p>
                        <p className="mt-1 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
                          {hoursResult.analysis?.weekly_hours_gap ?? 0}
                          {(hoursResult.analysis?.weekly_hours_gap ?? 0) < 0 ? (
                            <TrendingDown className="h-5 w-5 text-rose-500" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                          )}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {(hoursResult.analysis?.weekly_hours_gap ?? 0) < 0
                            ? 'You are open fewer hours than the competitor average'
                            : 'You are open more hours than the competitor average'}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-200/60 bg-amber-50/35 p-5 dark:border-amber-800/40 dark:bg-amber-950/20">
                      <p className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Sparkles className="h-5 w-5 text-orange-500" />
                        Executive summary
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {hoursResult.analysis?.hours_summary ??
                          'No executive summary generated yet. Run refresh again after ranking grid data is available.'}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                            Opportunity windows
                          </p>
                          <Badge variant="success">{hoursResult.analysis?.opportunity_windows?.length ?? 0}</Badge>
                        </div>
                        <p className="mb-3 text-sm text-muted-foreground">Times when you are open and competitors are closed</p>
                        {(hoursResult.analysis?.opportunity_windows?.length ?? 0) > 0 ? (
                          <div className="space-y-2">
                            {(hoursResult.analysis?.opportunity_windows ?? []).slice(0, 8).map((win, idx) => (
                              <div key={`${win.day}-${win.time}-${idx}`} className="rounded-md border bg-background px-3 py-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">
                                    {win.day ?? 'Unknown'} {win.time ? `• ${win.time}` : ''}
                                  </span>
                                  <Badge variant="success">{win.competitors_closed_count ?? 0} closed</Badge>
                                </div>
                                <p className="mt-1 text-muted-foreground">{win.opportunity ?? 'Potential visibility gain window.'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border bg-background p-5 text-center">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-900/35">
                              <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No opportunity windows identified</p>
                            <p className="mt-1 text-sm text-muted-foreground">Your hours overlap with most competitors</p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                            <TriangleAlert className="h-5 w-5 text-rose-500" />
                            Risk windows
                          </p>
                          <Badge variant="warning">{hoursResult.analysis?.risk_windows?.length ?? 0}</Badge>
                        </div>
                        <p className="mb-3 text-sm text-muted-foreground">Times where competitors remain open while you are closed</p>
                        {(hoursResult.analysis?.risk_windows?.length ?? 0) > 0 ? (
                          <div className="space-y-2">
                            {(hoursResult.analysis?.risk_windows ?? []).slice(0, 8).map((win, idx) => (
                              <div key={`${win.day}-${win.time}-${idx}`} className="rounded-md border bg-background px-3 py-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground">
                                    {win.day ?? 'Unknown'} {win.time ? `• ${win.time}` : ''}
                                  </span>
                                  <Badge variant="warning">{win.competitors_open_count ?? 0} open</Badge>
                                </div>
                                <p className="mt-1 text-muted-foreground">
                                  {win.risk ?? 'Competitor coverage appears stronger in this window.'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border bg-background p-5 text-center">
                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100/70 dark:border-emerald-800 dark:bg-emerald-900/35">
                              <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm font-medium text-foreground">No risk windows identified</p>
                            <p className="mt-1 text-sm text-muted-foreground">Your closing times are competitive</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                          <Lightbulb className="h-5 w-5 text-orange-500" />
                          Recommended changes
                        </p>
                        <Badge variant="brand">{hoursResult.analysis?.recommended_changes?.length ?? 0}</Badge>
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">Specific hour adjustments to consider for your listing</p>
                      {(hoursResult.analysis?.recommended_changes?.length ?? 0) > 0 ? (
                        <div className="space-y-2">
                          {(hoursResult.analysis?.recommended_changes ?? []).slice(0, 10).map((change, idx) => (
                            <div key={`${change.day}-${idx}`} className="rounded-md border bg-background p-3">
                              <p className="text-sm font-semibold text-foreground">{change.day ?? 'Day not specified'}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Current: <span className="text-foreground">{change.current ?? 'N/A'}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Suggested: <span className="text-emerald-600 dark:text-emerald-400">{change.suggested ?? 'N/A'}</span>
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {change.rationale ?? 'Suggested to improve parity with local competitors.'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-md border bg-background p-4 text-center">
                          <p className="text-sm text-foreground">No specific changes suggested</p>
                          <p className="text-xs text-muted-foreground">Your current schedule is already aligned</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4">
                      <p className="mb-4 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Clock className="h-5 w-5 text-orange-500" />
                        Weekly schedule
                      </p>
                      <div className="rounded-lg border bg-background">
                        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="relative w-full sm:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={hoursSearch}
                              onChange={(e) => setHoursSearch(e.target.value)}
                              className="pl-9"
                              placeholder="Search days..."
                            />
                          </div>
                          <Button variant="base-outline" size="sm" disabled className="w-full sm:w-auto">
                            <Eye className="h-4 w-4" />
                            Columns
                          </Button>
                        </div>
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          Showing <span className="text-foreground">{filteredWeeklyRows.length > 0 ? 1 : 0}</span> to{' '}
                          <span className="text-foreground">{filteredWeeklyRows.length}</span> of{' '}
                          <span className="text-foreground">{weeklyHoursRows.length}</span> results
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Day</TableHead>
                              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                              <TableHead className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">Hours</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWeeklyRows.map((row) => (
                              <TableRow key={row.day}>
                                <TableCell className="px-4 py-3 text-sm">{row.dayLabel}</TableCell>
                                <TableCell className="px-4 py-3">
                                  <Badge variant={row.isOpen ? 'success' : 'base-soft'}>{row.isOpen ? 'Open' : 'Closed'}</Badge>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-sm">{row.hoursLabel}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {filteredWeeklyRows.length === 0 ? (
                          <div className="border-t px-4 py-4 text-sm text-muted-foreground">No days match your search.</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isFixingHours ? 'Running analysis...' : 'No hours analysis available yet.'}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button size="md" variant="base-outline" onClick={() => setHoursOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="right" style={{ width: '100%', maxWidth: '800px' }} className="w-full max-w-[800px] overflow-y-auto border-border bg-background text-foreground">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Fix categories</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Recommendations based on competitor category data from your recent ranking grids.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3 space-y-4 p-4">
            <AiWorkingStrip active={isFixingCategories && !categoriesResult && !categoriesError} />

            {categoriesError && (
              <div className="flex items-start gap-2 rounded-md border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
                <p>{categoriesError}</p>
              </div>
            )}

            {safeSummary && (
              <CategorySummaryView summary={safeSummary} existingCategories={existingCategories} />
            )}

            {safeRecommendations.length > 0 && (
              <CategoryRecommendationsView
                recommendations={safeRecommendations}
                existingCategories={existingCategories}
              />
            )}

            {!categoriesError && safeSummary && safeRecommendations.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No category changes are recommended right now. Your current setup already looks
                strong against competitors.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button size="md" variant="base-outline" onClick={() => setCategoriesOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={attributesOpen} onOpenChange={setAttributesOpen}>
        <SheetContent side="right" style={{ width: '100%', maxWidth: '800px' }} className="w-full max-w-[800px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold">Fix attributes</SheetTitle>
            <SheetDescription className="text-xs leading-relaxed text-muted-foreground">
              Compares a curated list of common Google attribute IDs to your synced listing. Google supports many more
              by primary category. Use this as a quick pass, then edit details in Google Business Profile.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-2 space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Summary:</span>
              {checklist.missingCount > 0 ? (
                <Badge variant="error">
                  <XCircle className="mr-1 h-3 w-3" aria-hidden />
                  {checklist.missingCount} missing
                </Badge>
              ) : null}
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                {checklist.presentCount} on listing
              </Badge>
              {checklist.unavailableCount > 0 ? (
                <Badge variant="base-soft">
                  <Ban className="mr-1 h-3 w-3" aria-hidden />
                  {checklist.unavailableCount} N/A in Google
                </Badge>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-4">
                <span className="pl-1">Status</span>
                <span>Attribute</span>
                <span className="text-right sm:text-left">Group</span>
              </div>
              <ul className="max-h-[min(52vh,420px)] divide-y divide-border overflow-y-auto">
                {checklist.rows.map((row) => (
                  <li
                    key={`${row.group}:${row.id}`}
                    className={cn(
                      'grid grid-cols-[auto_1fr_auto] items-center gap-x-3 px-3 py-2.5 text-sm sm:px-4',
                      row.status === 'missing' && 'bg-rose-50/70 dark:bg-rose-950/25',
                      row.status === 'present' && 'bg-emerald-50/40 dark:bg-emerald-950/15',
                      row.status === 'unavailable' && 'bg-muted/30'
                    )}
                  >
                    <span className="flex shrink-0 items-center justify-center">
                      {row.status === 'present' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="On listing" />
                      ) : row.status === 'missing' ? (
                        <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-label="Missing" />
                      ) : (
                        <Ban className="h-4 w-4 text-muted-foreground" aria-label="Not applicable" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{formatAttributeLabel(row.id)}</p>
                      <p className="text-[11px] text-muted-foreground sm:hidden">
                        {row.status === 'missing'
                          ? 'Not on your listing - add in Google if it applies'
                          : row.status === 'present'
                            ? 'Synced on your listing'
                            : 'Marked N/A in Google'}
                      </p>
                    </div>
                    <span className="text-right text-xs text-muted-foreground sm:text-left">{row.group}</span>
                  </li>
                ))}
              </ul>
            </div>

            {checklist.missingCount === 0 && checklistTotal > 0 ? (
              <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/35 p-3 text-sm text-foreground dark:border-emerald-900/40 dark:bg-emerald-950/20">
                No missing items on this {checklistTotal}-point checklist. Everything is either on your listing or marked N/A in Google.
              </div>
            ) : null}

            <div className="flex justify-end border-t border-border/60 pt-3">
              <Button size="sm" variant="base-outline" onClick={() => setAttributesOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
