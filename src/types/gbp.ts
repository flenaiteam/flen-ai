// GBP AI API types (generate post)

export interface ContextSent {
  business_name: string | null;
  location_city: string | null;
  industry: string | null;
  keywords_count: number;
  keywords: string[];
}

export interface GBPPostAI {
  post_intent: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  seasonal_context: string | null;
  day_of_week: string | null;
  topic_type: string | null;
  summary: string | null;
  call_to_action_type: string | null;
  call_to_action_url: string | null;
  event_title: string | null;
  event_start_date: string | null;
  event_start_time: string | null;
  event_end_date: string | null;
  event_end_time: string | null;
  offer_coupon_code: string | null;
  offer_redeem_url: string | null;
  offer_terms: string | null;
  suggested_image_description: string | null;
}

export interface GeneratePostBulkItem {
  keyword: string;
  post: GBPPostAI;
}

export interface GeneratePostBulkPayload {
  success: true;
  posts: GeneratePostBulkItem[];
  response?: Record<string, unknown>;
  meta?: { context_sent: ContextSent };
}

// ── Competitor keyword ranks (ranking grid snapshot; Local Pack from stored scans) ──

export interface GBPCompetitorRanking {
  rank: number | null;
  title: string;
  place_id: string;
  cid: string;
  rating_value: number | null;
  rating_votes_count: number | null;
  address: string;
  url: string | null;
  website_url?: string | null;
}

export interface GBPFieldComparisonRow {
  field: string;
  label: string;
  yours: number | null;
  competitor_avg: number | null;
  winner: string;
}

export interface GBPCompetitorKeywordRank {
  keyword_id: number;
  keyword_text: string;
  our_rank: number | "N/A";
  our_rating?: number | null;
  our_reviews?: number | null;
  our_has_website?: boolean;
  competitor_avg_rank?: number | null;
  competitor_avg_rating?: number | null;
  competitor_avg_reviews?: number | null;
  competitor_website_rate_pct?: number | null;
  field_comparison?: GBPFieldComparisonRow[];
  competitors: GBPCompetitorRanking[];
}

export interface GBPCompetitorKeywordRanksResponse {
  snapshot_id: number | null;
  snapshot_uuid: string | null;
  snapshot_date: string | null;
  data_source?: string | null;
  keywords: GBPCompetitorKeywordRank[];
  message?: string | null;
  active_keyword_count?: number | null;
  latest_snapshot_status?: string | null;
  latest_snapshot_progress?: string | null;
}
