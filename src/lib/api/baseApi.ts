import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '@/lib/redux/store';
import { tryStytchSessionRefresh } from '@/lib/auth/sessionRefreshBridge';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  stytch_org_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Membership {
  public_id: string;
  role: string;
  is_active: boolean;
}

export interface Location {
  public_id: string;
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  timezone: string;
  is_default: boolean;
  is_active: boolean;
}

export interface AuthResponse {
  user: User;
  organization: Organization;
  membership: Membership;
  locations: Location[];
  session_jwt: string;
}

// ─── GBP Performance Types ────────────────────────────────────────────────────

export interface GBPPerformanceMetric {
  id: number;
  date: string;
  metric_name: string;
  value: number;
  created_at: string;
}

export interface PaginatedMetaData {
  current_page: number;
  page_size: number;
  total_pages: number;
  total_items: number;
  next_page: string | null;
  previous_page: string | null;
}

export interface GBPPerformanceMetricsResponse {
  data: GBPPerformanceMetric[];
  meta_data: PaginatedMetaData;
}

export interface GBPMetricPeriodSummary {
  total: number;
  average: number;
  count: number;
}

export interface GBPMetricCompareResponse {
  period_a: GBPMetricPeriodSummary;
  period_b: GBPMetricPeriodSummary;
  change_percent: number;
}

export type GBPTimeSeriesGranularity = 'day' | 'week' | 'month';

export interface GBPReviewTimeSeriesPoint {
  period_start: string;
  review_count: number;
  avg_rating: number | null;
  replied_count: number;
  reply_rate_pct: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
}

export interface GBPReviewTimeSeriesResponse {
  data: GBPReviewTimeSeriesPoint[];
  meta_data: {
    granularity: GBPTimeSeriesGranularity;
    date_from: string;
    date_to: string;
    filters: {
      rating: number | null;
      replied: boolean | null;
      search: string | null;
    };
  };
}

export interface GBPSearchKeyword {
  id: number;
  year: number;
  month: number;
  keyword: string;
  impressions_count: number;
  previous_month_impressions: number | null;
  change_percent: number | null;
  trend: string;
  created_at: string;
}

export interface GBPSearchKeywordsResponse {
  data: GBPSearchKeyword[];
  meta_data: PaginatedMetaData;
}

// ─── Base Query ───────────────────────────────────────────────────────────────

/** Matches fe-flen: backend expects `org` (+ optional `location_id`) on most org routes. */
type FetchArgsWithOrgFlag = FetchArgs & { skipOrgLocationParams?: boolean };

function applyOrgLocationParams(args: string | FetchArgs, state: RootState): string | FetchArgs {
  let base: string | Omit<FetchArgsWithOrgFlag, 'skipOrgLocationParams'> = args;

  if (typeof args === 'object' && args !== null && 'skipOrgLocationParams' in args) {
    const { skipOrgLocationParams, ...rest } = args as FetchArgsWithOrgFlag;
    if (skipOrgLocationParams) {
      return rest as FetchArgs;
    }
    base = rest as FetchArgs;
  }

  const org = state.organizations?.current;
  const loc = state.locations?.current;
  if (!org?.id) {
    return base as string | FetchArgs;
  }

  const params = new URLSearchParams();
  params.set('org', org.id);
  if (loc?.public_id) {
    params.set('location_id', loc.public_id);
  }
  const qs = params.toString();
  if (!qs) {
    return base as string | FetchArgs;
  }

  if (typeof base === 'string') {
    return base.includes('?') ? `${base}&${qs}` : `${base}?${qs}`;
  }

  const url = base.url;
  const nextUrl = url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
  return { ...base, url: nextUrl };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: (process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000') + '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState;
    const token =
      state.auth?.sessionJwt ??
      (typeof window !== 'undefined' ? localStorage.getItem('stytch_session_token') : null);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    headers.set('ngrok-skip-browser-warning', 'true');
    return headers;
  },
});

// ─── Re-auth interceptor ──────────────────────────────────────────────────────
// On 401: try Stytch session refresh once, retry the request; only then hard logout.

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const state = api.getState() as RootState;
  const request = applyOrgLocationParams(args, state);
  const result = await rawBaseQuery(request, api, extraOptions);

  if (result.error?.status === 401 && typeof window !== 'undefined') {
    const refreshed = await tryStytchSessionRefresh();
    if (refreshed) {
      const stateAfter = api.getState() as RootState;
      const retryRequest = applyOrgLocationParams(args, stateAfter);
      return rawBaseQuery(retryRequest, api, extraOptions);
    }
    localStorage.removeItem('stytch_session_token');
    localStorage.removeItem('auth_data');
    localStorage.removeItem('selected_location');
    document.cookie = 'auth_session=; path=/; max-age=0';
    window.location.href = '/';
  }

  return result;
};

// ─── API ──────────────────────────────────────────────────────────────────────

const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Organization', 'Location', 'GBP'],
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    // ── Auth ──────────────────────────────────────────────────────────────────

    /** Exchange an intermediate session token + org_id for a full session */
    exchangeToken: builder.mutation<
      AuthResponse,
      { intermediate_session_token: string; organization_id: string }
    >({
      query: (body) => ({
        url: '/auth/exchange/',
        method: 'POST',
        body,
        skipOrgLocationParams: true,
      }),
      transformResponse: (res: { data?: AuthResponse } | AuthResponse) =>
        (res as { data?: AuthResponse }).data ?? (res as AuthResponse),
      invalidatesTags: ['Auth', 'Organization'],
    }),

    /** Create a new org (and first location) from an intermediate session token */
    createOrganization: builder.mutation<
      AuthResponse,
      { name: string; intermediate_session_token: string; place_id?: string }
    >({
      query: (body) => ({
        url: '/organizations/',
        method: 'POST',
        body,
        skipOrgLocationParams: true,
      }),
      transformResponse: (res: { data?: AuthResponse } | AuthResponse) =>
        (res as { data?: AuthResponse }).data ?? (res as AuthResponse),
      invalidatesTags: ['Auth', 'Organization', 'Location'],
    }),

    // ── Locations ─────────────────────────────────────────────────────────────

    /** Fetch all locations for the current org */
    getLocations: builder.query<Location[], void>({
      query: () => '/organizations/locations/',
      transformResponse: (res: unknown): Location[] => {
        if (Array.isArray(res)) return res as Location[];
        if (res && typeof res === 'object') {
          const o = res as { data?: Location[]; results?: Location[] };
          if (Array.isArray(o.data)) return o.data;
          if (Array.isArray(o.results)) return o.results;
        }
        return [];
      },
      providesTags: ['Location'],
    }),

    /** Create a new location */
    createLocation: builder.mutation<
      Location,
      { name: string; address?: string; timezone?: string; place_id?: string }
    >({
      query: (body) => ({
        url: '/organizations/locations/',
        method: 'POST',
        body,
      }),
      transformResponse: (res: { data?: Location } | Location) =>
        (res as { data?: Location }).data ?? (res as Location),
      invalidatesTags: ['Location'],
    }),

    // ── GBP ───────────────────────────────────────────────────────────────────

    getGBPDashboardOverview: builder.query<unknown, string>({
      query: (locationPublicId) =>
        `/organizations/locations/${locationPublicId}/gbp/dashboard/overview/`,
      providesTags: ['GBP'],
    }),

    getGBPReviews: builder.query<
      unknown,
      {
        locationPublicId: string;
        page?: number;
        page_size?: number;
        search?: string;
        rating?: number;
        replied?: boolean;
        sort?: string;
      }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString();
        return `/organizations/locations/${locationPublicId}/gbp/reviews${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPReviewTimeseries: builder.query<
      GBPReviewTimeSeriesResponse,
      {
        locationPublicId: string;
        date_from?: string;
        date_to?: string;
        granularity?: GBPTimeSeriesGranularity;
        search?: string;
        rating?: number;
        replied?: boolean;
      }
    >({
      query: ({ locationPublicId, ...filters }) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
        const queryString = params.toString();
        return `/organizations/locations/${locationPublicId}/gbp/reviews/timeseries/${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPPosts: builder.query<
      unknown,
      { locationPublicId: string; page?: number; page_size?: number }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString();
        return `/organizations/locations/${locationPublicId}/gbp/posts/${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPKeywords: builder.query<
      unknown,
      { locationPublicId: string; page?: number; page_size?: number }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString();
        return `/organizations/locations/${locationPublicId}/gbp/keywords/${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPProfileInfo: builder.query<unknown, string>({
      query: (locationPublicId) =>
        `/organizations/locations/${locationPublicId}/gbp/profile-info/`,
      providesTags: ['GBP'],
    }),

    fixBusinessAbout: builder.mutation<
      {
        success: boolean;
        description_option_1: string | null;
        description_option_2: string | null;
        description_option_3: string | null;
        recommended_index: number | null;
        recommendation_why: string | null;
        confidence_score: number | null;
      },
      { locationPublicId: string; current_description?: string }
    >({
      query: ({ locationPublicId, current_description }) => ({
        url: `/organizations/locations/${locationPublicId}/gbp/ai/fix-business-about/`,
        method: 'POST',
        body: current_description != null ? { current_description } : {},
      }),
      transformResponse: (response: {
        data?: {
          success?: boolean;
          description_option_1?: string | null;
          description_option_2?: string | null;
          description_option_3?: string | null;
          recommended_index?: number | null;
          recommendation_why?: string | null;
          confidence_score?: number | null;
        };
      }) => {
        const d = response?.data;
        return {
          success: d?.success ?? true,
          description_option_1: d?.description_option_1 ?? null,
          description_option_2: d?.description_option_2 ?? null,
          description_option_3: d?.description_option_3 ?? null,
          recommended_index: d?.recommended_index ?? null,
          recommendation_why: d?.recommendation_why ?? null,
          confidence_score: d?.confidence_score ?? null,
        };
      },
    }),

    getGBPReviewReplyOptions: builder.mutation<
      {
        success: boolean;
        reply_option_1_type: string | null;
        reply_option_1: string | null;
        reply_option_2_type: string | null;
        reply_option_2: string | null;
        reply_option_3_type: string | null;
        reply_option_3: string | null;
        recommended_index: number | null;
        recommendation_why: string | null;
        confidence_score: number | null;
      },
      { locationPublicId: string; review_text: string; reviewer_name?: string; star_rating?: number }
    >({
      query: ({ locationPublicId, review_text, reviewer_name, star_rating }) => ({
        url: `/organizations/locations/${locationPublicId}/gbp/ai/review-reply/`,
        method: "POST",
        body: { review_text, reviewer_name, star_rating },
        timeout: 120000,
        // Use 'text' so we own JSON parsing and never hit a PARSING_ERROR
        // even when the response uses chunked encoding or non-standard content headers.
        responseHandler: "text" as const,
      }),
      transformResponse: (rawText: string) => {
        type ReplyData = {
          success?: boolean;
          reply_option_1_type?: string | null;
          reply_option_1?: string | null;
          reply_option_2_type?: string | null;
          reply_option_2?: string | null;
          reply_option_3_type?: string | null;
          reply_option_3?: string | null;
          recommended_index?: number | null;
          recommendation_why?: string | null;
          confidence_score?: number | null;
        };
        let parsed: { data?: ReplyData } & ReplyData = {};
        try {
          parsed = JSON.parse(rawText) as typeof parsed;
        } catch {
          // Non-JSON body → return safe all-null result so .unwrap() resolves (not throws)
        }
        const d: ReplyData = (parsed?.data ?? parsed) as ReplyData;
        return {
          success: (d?.success ?? true) as boolean,
          reply_option_1_type: (d?.reply_option_1_type ?? null) as string | null,
          reply_option_1: (d?.reply_option_1 ?? null) as string | null,
          reply_option_2_type: (d?.reply_option_2_type ?? null) as string | null,
          reply_option_2: (d?.reply_option_2 ?? null) as string | null,
          reply_option_3_type: (d?.reply_option_3_type ?? null) as string | null,
          reply_option_3: (d?.reply_option_3 ?? null) as string | null,
          recommended_index: (d?.recommended_index ?? null) as number | null,
          recommendation_why: (d?.recommendation_why ?? null) as string | null,
          confidence_score: (d?.confidence_score ?? null) as number | null,
        };
      },
    }),

    runGBPHoursOptimizer: builder.mutation<unknown, string>({
      query: (locationPublicId) => ({
        url: `/organizations/locations/${locationPublicId}/gbp/hours-optimizer/`,
        method: 'POST',
      }),
      transformResponse: (response: { data?: unknown } | unknown) =>
        (response as { data?: unknown })?.data ?? response,
    }),

    syncGBPProfileInfo: builder.mutation<
      { status?: string; job_id?: string; estimated_seconds?: number; message?: string },
      string
    >({
      query: (locationPublicId) => ({
        url: `/organizations/locations/${locationPublicId}/gbp/profile-info/sync/`,
        method: 'POST',
      }),
      transformResponse: (response: {
        data?: { status?: string; job_id?: string; estimated_seconds?: number; message?: string };
      }) => response?.data ?? {},
      invalidatesTags: ['GBP'],
    }),

    runCategoryFixer: builder.mutation<unknown, { locationPublicId: string }>({
      query: ({ locationPublicId }) => ({
        url: `/organizations/locations/${locationPublicId}/category-fixer/`,
        method: 'POST',
      }),
      transformResponse: (response: { data?: unknown } | unknown) =>
        (response as { data?: unknown })?.data ?? response,
    }),

    getGBPSERPRankings: builder.query<
      unknown,
      { locationPublicId: string; page?: number; page_size?: number }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString();
        return `/organizations/locations/${locationPublicId}/gbp/serp/rankings/${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPCompetitorKeywordRanks: builder.query<unknown, string>({
      query: (locationPublicId) =>
        `/organizations/locations/${locationPublicId}/gbp/serp/competitor-keyword-ranks/`,
      providesTags: ['GBP'],
    }),

    // ── GBP Performance ───────────────────────────────────────────────────────

    getGBPPerformanceMetrics: builder.query<
      GBPPerformanceMetricsResponse,
      {
        locationPublicId: string;
        start_date: string;
        end_date: string;
        metric_name?: string;
        page?: number;
        page_size?: number;
      }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString();
        return `/gbp/locations/${locationPublicId}/performance/metrics/${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPPerformanceCompare: builder.query<
      GBPMetricCompareResponse,
      {
        locationPublicId: string;
        metric_name: string;
        period_a_start: string;
        period_a_end: string;
        period_b_start: string;
        period_b_end: string;
      }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ).toString();
        return `/gbp/locations/${locationPublicId}/performance/metrics/compare/?${qs}`;
      },
      providesTags: ['GBP'],
    }),

    getGBPPerformanceKeywords: builder.query<
      GBPSearchKeywordsResponse,
      { locationPublicId: string; page?: number; page_size?: number }
    >({
      query: ({ locationPublicId, ...params }) => {
        const qs = new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString();
        return `/gbp/locations/${locationPublicId}/performance/keywords/${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['GBP'],
    }),
  }),
});

export default baseApi;

export const {
  useExchangeTokenMutation,
  useCreateOrganizationMutation,
  useGetLocationsQuery,
  useCreateLocationMutation,
  useGetGBPDashboardOverviewQuery,
  useGetGBPReviewsQuery,
  useGetGBPReviewTimeseriesQuery,
  useGetGBPPostsQuery,
  useGetGBPKeywordsQuery,
  useGetGBPProfileInfoQuery,
  useFixBusinessAboutMutation,
  useGetGBPReviewReplyOptionsMutation,
  useRunGBPHoursOptimizerMutation,
  useSyncGBPProfileInfoMutation,
  useRunCategoryFixerMutation,
  useGetGBPSERPRankingsQuery,
  useGetGBPCompetitorKeywordRanksQuery,
  useGetGBPPerformanceMetricsQuery,
  useGetGBPPerformanceCompareQuery,
  useGetGBPPerformanceKeywordsQuery,
} = baseApi;
