import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../supabaseClient";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  MousePointerClick,
  Eye,
  Zap,
  Activity,
  Globe,
  BarChart3,
  ChevronUp,
  Clock,
  Sparkles,
} from "lucide-react";



interface Post {
  id: string;
  content: string;
}

interface AdMetric {
  post_id: string;
  type: "impression" | "click";
  user_id: string;
  country: string;
  language: string;
  interests: string;
  value: number;
  created_at: string;
}

interface PostStats {
  id: string;
  content: string;
  earnings: number;
  clicks: number;
  impressions: number;
}

interface ChartPoint {
  date: string;
  earnings: number;
}

interface AudienceGroup {
  label: string;
  count: number;
  pct: number;
}

interface ActivityItem {
  id: string;
  country: string;
  type: "impression" | "click";
  value: number;
  created_at: string;
}

interface DashboardData {
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

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", MX: "🇲🇽", ES: "🇪🇸", BR: "🇧🇷", AR: "🇦🇷",
  CO: "🇨🇴", DE: "🇩🇪", FR: "🇫🇷", GB: "🇬🇧", CA: "🇨🇦",
  JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", AU: "🇦🇺", IT: "🇮🇹",
  PT: "🇵🇹", NL: "🇳🇱", SE: "🇸🇪", PL: "🇵🇱", RU: "🇷🇺",
};

function getFlag(country: string) {
  return COUNTRY_FLAGS[country?.toUpperCase()] ?? "🌍";
}

function useCountUp(target: number, duration = 1200, decimals = 4) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const supabase = supabaseClient;
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, decimals]);

  return value;
}

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

async function fetchDashboardData(userId: string): Promise<DashboardData> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase no está configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");

  const { data: posts, error: postsError } = await supabase
    .select("*")
.in("post_id", postIds)
.order("created_at", { ascending: false })
.limit(500)

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
  const totalEarnings = metrics.reduce((s: number, m: AdMetric) => s + (m.value || 0), 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  const postMap = new Map<string, PostStats>();
  posts.forEach((p: Post) => postMap.set(p.id, { id: p.id, content: p.content, earnings: 0, clicks: 0, impressions: 0 }));

  metrics.forEach((m: AdMetric) => {
    const ps = postMap.get(m.post_id);
    if (!ps) return;
    if (m.type === "click") { ps.clicks++; ps.earnings += m.value || 0; }
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

  function groupBy(field: "country" | "language" | "interests", withFlag = false) {
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

  const activity: ActivityItem[] = [...metrics]
    .sort((a: AdMetric, b: AdMetric) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((m: AdMetric, i: number) => ({ ...m, id: String(i) }));

  const activeAds = new Set(metrics.filter((m: AdMetric) => m.type === "impression").map((m: AdMetric) => m.post_id)).size;

  return { totalEarnings, impressions, clicks, ctr, activeAds, chartData, topPosts, countries, languages, interests, activity };
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg ${className}`}
      style={{ boxShadow: "0 4px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)" }}
    >
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <GlassCard className="p-5 hover:border-white/20 transition-all duration-300 hover:translate-y-[-2px] group cursor-default">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
          {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </GlassCard>
  );
}

function BarGroup({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/70 w-32 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-white/40 w-10 text-right shrink-0">{pct}%</span>
    </div>
  );
}

export default function Dashboard({ currentUserId }: { currentUserId?: string | null }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(!!currentUserId);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardData(currentUserId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const animatedEarnings = useCountUp(data?.totalEarnings ?? 0, 1400);
  const animatedClicks = useCountUp(data?.clicks ?? 0, 1000, 0);
  const animatedImpressions = useCountUp(data?.impressions ?? 0, 1000, 0);
  const animatedCTR = useCountUp(data?.ctr ?? 0, 1000, 2);

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(230 15% 7%)" }}>
        <GlassCard className="p-8 text-center max-w-sm">
          <p className="text-white/60 font-semibold mb-1">Sin sesión activa</p>
          <p className="text-white/30 text-sm">Inicia sesión con World App para ver tu dashboard.</p>
        </GlassCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(109,40,217,0.15) 0%, transparent 60%), radial-gradient(ellipse at 0% 80%, rgba(16,185,129,0.10) 0%, transparent 60%), hsl(230 15% 7%)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 animate-spin" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-violet-500 animate-spin" style={{ animationDuration: "0.8s", animationDirection: "reverse" }} />
          </div>
          <p className="text-white/40 text-sm tracking-widest uppercase">Loading Dashboard</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(230 15% 7%)" }}>
        <GlassCard className="p-8 text-center max-w-sm">
          <p className="text-red-400 font-semibold mb-2">Something went wrong</p>
          <p className="text-white/40 text-sm mb-4">{error}</p>
          <button onClick={load} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 transition-colors">
            Try Again
          </button>
        </GlassCard>
      </div>
    );
  }

  if (!data) return null;

  const customTooltipStyle = {
    backgroundColor: "rgba(10,10,20,0.9)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    backdropFilter: "blur(12px)",
    color: "#fff",
    fontSize: 12,
    padding: "8px 12px",
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: "radial-gradient(ellipse at 60% 0%, rgba(109,40,217,0.15) 0%, transparent 60%), radial-gradient(ellipse at 0% 80%, rgba(16,185,129,0.10) 0%, transparent 60%), hsl(230 15% 7%)",
      }}
      data-testid="dashboard-root"
    >
      <div className="max-w-2xl mx-auto px-4 py-8 pb-16">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={14} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-widest">Creator Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">H by Humans</h1>
          <p className="text-white/30 text-sm mt-0.5">Your monetization engine</p>
        </div>

        {/* Hero Earnings Card */}
        <div
          className="relative rounded-3xl overflow-hidden mb-6 p-7"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(109,40,217,0.30) 50%, rgba(59,130,246,0.20) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 0 60px rgba(16,185,129,0.12), 0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
          data-testid="earnings-hero"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300/80 font-medium uppercase tracking-widest">Total Earnings</span>
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span
                className="text-5xl font-black tracking-tighter"
                style={{ background: "linear-gradient(135deg, #34d399, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                data-testid="total-earnings"
              >
                {animatedEarnings.toFixed(4)}
              </span>
              <span className="text-lg font-bold text-white/60 mb-1">WLD</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              <ChevronUp size={14} />
              <span>Your content is working for you 24/7</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <MetricCard icon={Eye} label="Impressions" value={Math.round(animatedImpressions).toLocaleString()} color="bg-blue-500/20" />
          <MetricCard icon={MousePointerClick} label="Clicks" value={Math.round(animatedClicks).toLocaleString()} color="bg-violet-500/20" />
          <MetricCard icon={TrendingUp} label="CTR" value={`${animatedCTR.toFixed(2)}%`} sub="Click-through rate" color="bg-emerald-500/20" />
          <MetricCard icon={Zap} label="Active Ads" value={String(data.activeAds)} sub="Posts monetized" color="bg-amber-500/20" />
        </div>

        {/* Earnings Chart */}
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-violet-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Earnings Over Time</h2>
          </div>
          <div className="h-48" data-testid="earnings-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                <Area
                  type="monotone"
                  dataKey="earnings"
                  stroke="url(#lineGrad)"
                  strokeWidth={2}
                  fill="url(#earnGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#34d399", stroke: "rgba(255,255,255,0.3)", strokeWidth: 1 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Top Posts */}
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Top Posts</h2>
          </div>
          <div className="space-y-3" data-testid="top-posts">
            {data.topPosts.map((post, i) => (
              <div
                key={post.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/3 hover:bg-white/5 hover:border-white/10 transition-all duration-200"
                data-testid={`post-item-${post.id}`}
              >
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shrink-0 mt-0.5"
                  style={{
                    background: i === 0
                      ? "linear-gradient(135deg,#34d399,#059669)"
                      : i === 1
                        ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
                        : "rgba(255,255,255,0.08)",
                    color: i < 2 ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 leading-snug line-clamp-2">{post.content}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-emerald-400 font-semibold">{post.earnings.toFixed(4)} WLD</span>
                    <span className="text-xs text-white/30">{post.clicks} clicks</span>
                    <span className="text-xs text-white/30">{post.impressions} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Audience Insights */}
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={16} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Audience Insights</h2>
          </div>

          <div className="space-y-6" data-testid="audience-insights">
            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Countries</p>
              <div className="space-y-2">
                {data.countries.map((c) => <BarGroup key={c.label} label={c.label} pct={c.pct} />)}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Languages</p>
              <div className="space-y-2">
                {data.languages.map((l) => <BarGroup key={l.label} label={l.label} pct={l.pct} />)}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div>
              <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Interests</p>
              <div className="space-y-2">
                {data.interests.map((t) => <BarGroup key={t.label} label={t.label} pct={t.pct} />)}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Activity Feed */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Live Activity</h2>
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="space-y-3" data-testid="activity-feed">
            {data.activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                data-testid={`activity-item-${item.id}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === "click" ? "bg-emerald-400" : "bg-blue-400/50"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 leading-snug">
                    {item.type === "click"
                      ? <>User from {getFlag(item.country)}{item.country} clicked your ad <span className="text-emerald-400 font-semibold">(+{item.value.toFixed(4)} WLD)</span></>
                      : <>User from {getFlag(item.country)}{item.country} viewed your post</>
                    }
                  </p>
                </div>
                <span className="text-xs text-white/25 shrink-0">{timeAgo(item.created_at)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
