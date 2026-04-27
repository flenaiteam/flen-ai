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
