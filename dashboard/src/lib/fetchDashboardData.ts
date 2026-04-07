import { createClient } from "@supabase/supabase-js";
import { getFlag } from "./utils";
import type { AdMetric, AudienceGroup, ChartPoint, DashboardData, Post, PostStats } from "./types";

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function emptyData(): DashboardData {
  return {
    totalEarnings: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    activeAds: 0,
    chartData: [],
    topPosts: [],
    countries: [],
    languages: [],
    interests: [],
    activity: [],
  };
}

export async function fetchDashboardData(userId: string): Promise<DashboardData> {

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, content")
    .eq("user_id", userId);

  if (postsError) throw new Error(postsError.message);
  if (!posts?.length) return emptyData();

  const postIds = posts.map((p: Post) => p.id);

  const { data: metrics, error: metricsError } = await supabase
    .from("ad_metrics")
    .select("*")
    .in("post_id", postIds);

  if (metricsError) throw new Error(metricsError.message);
  if (!metrics?.length) return emptyData();

  const clicks = metrics.filter((m: AdMetric) => m.type === "click").length;
  const impressions = metrics.filter((m: AdMetric) => m.type === "impression").length;
  const totalEarnings = metrics.reduce(
  (s, m) => s + (m.creator_earning || 0),
  0
);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const postMap = new Map<string, PostStats>();
  posts.forEach((p: Post) =>
    postMap.set(p.id, { id: p.id, content: p.content, earnings: 0, clicks: 0, impressions: 0 })
  );

  metrics.forEach((m: AdMetric) => {
    const ps = postMap.get(m.post_id);
    if (!ps) return;
    if (m.type === "click") {
  ps.clicks++;
  ps.earnings += m.creator_earning || 0;
}
    if (m.type === "impression") ps.impressions++;
  });

  const topPosts = Array.from(postMap.values())
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);

  const byDay = new Map<string, number>();
  metrics.forEach((m: AdMetric) => {
    if (m.value > 0) {
      const day = new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      byDay.set(day, (byDay.get(day) || 0) + m.value);
    }
  });
  const chartData: ChartPoint[] = Array.from(byDay.entries())
    .map(([date, earnings]) => ({ date, earnings: parseFloat(earnings.toFixed(4)) }))
    .slice(-7);

  function groupBy(field: "country" | "language" | "interests", withFlag = false): AudienceGroup[] {
    const map = new Map<string, number>();
    metrics.filter((m: AdMetric) => m.type === "click").forEach((m: AdMetric) => {
      const k = (m[field] as string) || "Unknown";
      map.set(k, (map.get(k) || 0) + 1);
    });
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, count]) => ({
        label: withFlag ? `${getFlag(label)} ${label}` : label,
        count,
        pct: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
      }));
  }

  const countries = groupBy("country", true);
  const languages = groupBy("language");
  const interests = groupBy("interests");

  const activity = [...metrics]
    .sort((a: AdMetric, b: AdMetric) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((m: AdMetric, i: number) => ({ ...m, id: String(i) }));

  const activeAds = new Set(
    metrics.filter((m: AdMetric) => m.type === "impression").map((m: AdMetric) => m.post_id)
  ).size;

  return { totalEarnings, impressions, clicks, ctr, activeAds, chartData, topPosts, countries, languages, interests, activity };
}
