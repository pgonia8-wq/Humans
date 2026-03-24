export interface Post {
  id: string;
  content: string;
}

export interface AdMetric {
  post_id: string;
  type: "impression" | "click";
  user_id: string;
  country: string;
  language: string;
  interests: string;
  value: number;
  created_at: string;
}

export interface PostStats {
  id: string;
  content: string;
  earnings: number;
  clicks: number;
  impressions: number;
}

export interface ChartPoint {
  date: string;
  earnings: number;
}

export interface AudienceGroup {
  label: string;
  count: number;
  pct: number;
}

export interface ActivityItem {
  id: string;
  country: string;
  type: "impression" | "click";
  value: number;
  created_at: string;
}

export interface DashboardData {
  totalEarnings: number;
  impressions: number;
  clicks: number;
  ctr: number;
  activeAds: number;
  chartData: ChartPoint[];
  topPosts: PostStats[];
  countries: AudienceGroup[];
  languages: AudienceGroup[];
  interests: AudienceGroup[];
  activity: ActivityItem[];
}
