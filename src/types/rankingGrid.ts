/**
 * Types for Local Ranking Grid API (Whitespark-style).
 * Aligned with backend serializers in sentient (ranking_grid_serializers.py).
 */

export interface RankingGridCreateIn {
  keyword_id: number;
  grid_size: number;
  radius_km: number;
}

export interface RankingGridOut {
  public_id: string;
  keyword_id: number;
  keyword_text: string;
  location_id: number;
  grid_size: number;
  radius_km: number | null;
  radius_mi: number | null;
  distance_km: string;
  distance_mi?: number | null;
  point_count: number;
  created_at: string;
}

export interface RankingGridScanSummary {
  scan_date: string;
  visibility_score: number | null;
  ranking_distribution: Record<string, number>;
  avg_rank: number | null;
  total_grid_points: number;
  points_with_rank: number;
}

export interface RankingGridScanOut {
  id: number;
  public_id: string;
  status: number;
  status_display: string;
  scheduled_poll_at: string | null;
  completed_at: string | null;
  created_at: string;
  summary: RankingGridScanSummary | null;
}

export type MergedRankingGridScanRow = RankingGridScanOut & {
  grid_public_id: string;
  grid_size: number;
  radius_km: number | null;
};

export interface RankingGridTriggerScanResponse extends RankingGridScanOut {
  already_running: boolean;
}

export interface RankingGridListingOut {
  rank_absolute: number | null;
  rank_group: number | null;
  title: string;
  is_own_business: boolean;
  cid: string | null;
  place_id: string | null;
  rating_value: string | null;
  rating_votes_count: number | null;
  address: string;
  category: string | null;
  url: string | null;
  additional_categories?: string[] | null;
  phone?: string | null;
}

export interface RankingGridPointResultOut {
  point_index: number;
  latitude: number | string;
  longitude: number | string;
  rank: number | null;
  tier: string;
  display_color?: string;
  color_hex?: string;
  listings: RankingGridListingOut[];
}

export interface RankingGridScanDetailGridConfig {
  grid_size: number;
  grid_label: string;
  radius_km: number | null;
  radius_mi: number | null;
  distance_km: number | null;
  distance_mi: number | null;
  point_count: number;
  points_with_data: number;
}

export interface RankingGridScanDetailTargetBusiness {
  name: string;
  address: string;
}

export interface RankingGridScanDetailOut extends RankingGridScanOut {
  grid_config: RankingGridScanDetailGridConfig | null;
  target_business: RankingGridScanDetailTargetBusiness | null;
  keyword: string | null;
  scan_date: string | null;
  scan_completed_at: string | null;
  points: RankingGridPointResultOut[];
  competitors: RankingGridListingOut[];
}

export interface CategoryRecommendationItemOut {
  action: string;
  category: string;
  justification: string;
}

export interface CategorySummaryItemOut {
  category: string;
  count: number;
}

export interface CategorySummaryOut {
  top_primary_categories: CategorySummaryItemOut[];
  top_secondary_categories: CategorySummaryItemOut[];
}

export interface CategoryFixerOut {
  category_summary?: CategorySummaryOut;
  recommendations?: CategoryRecommendationItemOut[];
  error?: string;
  detail?: string;
}

export const SCAN_STATUS = {
  PENDING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
  FAILED: 3,
} as const;
