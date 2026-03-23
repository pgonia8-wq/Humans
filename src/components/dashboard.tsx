import { useEffect, useState, useCallback, useRef, memo } from "react";
import { createClient } from "@supabase/supabase-js";
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
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
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
  RefreshCw,
  Download,
  Lightbulb,
  ArrowLeft,
  Wifi,
  X,
  ChevronRight,
  BarChart2,
} from "lucide-react";

// ─────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseClient && supabaseUrl && supabaseKey) {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", MX: "🇲🇽", ES: "🇪🇸", BR: "🇧🇷", AR: "🇦🇷",
  CO: "🇨🇴", DE: "🇩🇪", FR: "🇫🇷", GB: "🇬🇧", CA: "🇨🇦",
  JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", AU: "🇦🇺", IT: "🇮🇹",
  PT: "🇵🇹", NL: "🇳🇱", SE: "🇸🇪", PL: "🇵🇱", RU: "🇷🇺",
};

function getFlag(country: string) {
  return COUNTRY_FLAGS[country?.toUpperCase()] ?? "🌍";
}

// ─────────────────────────────────────────
// DATA HELPERS (sin tocar)
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────
function useCountUp(target: number, duration = 1200, decimals = 4) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration, decimals]);

  return value;
}

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
const BG_GRADIENT =
  "radial-gradient(ellipse at 65% 0%, rgba(109,40,217,0.18) 0%, transparent 55%), " +
  "radial-gradient(ellipse at 0% 85%, rgba(16,185,129,0.12) 0%, transparent 55%), " +
  "hsl(230 15% 7%)";

const GLASS = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

const HERO_GLASS = {
  background: "linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(109,40,217,0.22) 50%, rgba(59,130,246,0.15) 100%)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 0 80px rgba(16,185,129,0.10), 0 8px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)",
};

// ─────────────────────────────────────────
// PRIMITIVE: GlassCard
// ─────────────────────────────────────────
const GlassCard = memo(function GlassCard({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden ${className}`}
      style={{ ...GLASS, ...style }}
    >
      {children}
    </div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: AppHeader
// ─────────────────────────────────────────
const AppHeader = memo(function AppHeader({
  onClose,
  isRefreshing,
}: {
  onClose?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
      style={{
        background: "rgba(10,10,20,0.72)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left: back/close */}
      <button
        onClick={onClose}
        className="flex items-center justify-center w-8 h-8 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all duration-200 active:scale-95"
        data-testid="header-back"
      >
        {onClose ? <ArrowLeft size={18} /> : <X size={18} />}
      </button>

      {/* Center: title */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-emerald-400" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">H by Humans</span>
        </div>
        <span className="text-[10px] text-white/30 tracking-wider">Creator Dashboard</span>
      </div>

      {/* Right: live indicator */}
      <div className="flex items-center gap-1.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-emerald-400"
          animate={{ opacity: isRefreshing ? [1, 0.2, 1] : [1, 0.5, 1] }}
          transition={{ duration: isRefreshing ? 0.5 : 2, repeat: Infinity }}
        />
        <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-widest">
          {isRefreshing ? "Updating" : "Live"}
        </span>
        <Wifi size={11} className="text-emerald-400/60" />
      </div>
    </div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: LoadingSkeleton
// ─────────────────────────────────────────
const SkeletonPulse = memo(function SkeletonPulse({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-xl bg-white/6 ${className}`}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
});

const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div className="px-4 space-y-4 pb-8">
      {/* hero */}
      <SkeletonPulse className="h-36 rounded-3xl" />
      {/* grid */}
      <div className="grid grid-cols-2 gap-3">
        <SkeletonPulse className="h-24" />
        <SkeletonPulse className="h-24" />
        <SkeletonPulse className="h-24" />
        <SkeletonPulse className="h-24" />
      </div>
      {/* chart */}
      <SkeletonPulse className="h-52" />
      {/* posts */}
      <SkeletonPulse className="h-64" />
      {/* audience */}
      <SkeletonPulse className="h-56" />
    </div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: EmptyStatePremium
// ─────────────────────────────────────────
const EmptyStatePremium = memo(function EmptyStatePremium({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="w-20 h-20 rounded-3xl mb-6 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.2), rgba(16,185,129,0.2))", border: "1px solid rgba(255,255,255,0.08)" }}
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <BarChart2 size={32} className="text-violet-400" />
      </motion.div>
      <h3 className="text-lg font-bold text-white/80 mb-2">Sin datos aún</h3>
      <p className="text-sm text-white/35 max-w-xs leading-relaxed mb-6">
        Crea contenido y activa anuncios para comenzar a ver tus ganancias aquí.
      </p>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 active:scale-95"
          style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.5), rgba(16,185,129,0.4))", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      )}
    </motion.div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: SectionBlock
// ─────────────────────────────────────────
const SectionBlock = memo(function SectionBlock({
  icon: Icon,
  title,
  iconColor,
  children,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  iconColor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={`p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className={iconColor} />
        <h2 className="text-xs font-semibold text-white/60 uppercase tracking-widest">{title}</h2>
      </div>
      {children}
    </GlassCard>
  );
});

// ─────────────────────────────────────────
// COMPONENT: StatCardPro
// ─────────────────────────────────────────
const StatCardPro = memo(function StatCardPro({
  icon: Icon,
  label,
  value,
  sub,
  accentColor,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-2xl overflow-hidden cursor-default p-4"
      style={GLASS}
      data-testid={`stat-card-${label.toLowerCase()}`}
    >
      {/* accent glow top-right */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl"
        style={{ background: accentColor }}
      />
      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-1.5">{label}</p>
          <p className="text-2xl font-black text-white tracking-tight leading-none">{value}</p>
          {sub && <p className="text-[10px] text-white/25 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}22`, border: `1px solid ${accentColor}33` }}
        >
          <Icon size={17} style={{ color: accentColor }} />
        </div>
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: AnimatedBar
// ─────────────────────────────────────────
const AnimatedBar = memo(function AnimatedBar({ label, pct, delay = 0 }: { label: string; pct: number; delay?: number }) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <span className="text-sm text-white/65 w-32 truncate shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #7c3aed, #34d399)" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
        />
      </div>
      <span className="text-[10px] text-white/30 w-9 text-right shrink-0 font-medium">{pct}%</span>
    </motion.div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: AnimatedChartWrapper
// ─────────────────────────────────────────
const AnimatedChartWrapper = memo(function AnimatedChartWrapper({
  chartData,
}: {
  chartData: ChartPoint[];
}) {
  const tooltipStyle = {
    backgroundColor: "rgba(8,8,18,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    backdropFilter: "blur(16px)",
    color: "#fff",
    fontSize: 11,
    padding: "8px 14px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  };

  if (!chartData.length) {
    return (
      <div className="h-44 flex items-center justify-center">
        <p className="text-white/20 text-sm">Sin datos de ganancias aún</p>
      </div>
    );
  }

  return (
    <motion.div
      className="h-44"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.06)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="earnings"
            stroke="url(#lineGrad)"
            strokeWidth={2}
            fill="url(#earnGrad)"
            dot={false}
            activeDot={{ r: 5, fill: "#34d399", stroke: "rgba(255,255,255,0.2)", strokeWidth: 1, filter: "url(#glow)" }}
            isAnimationActive={true}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

// ─────────────────────────────────────────
// COMPONENT: FAB (Floating Action Button)
// ─────────────────────────────────────────
const FAB = memo(function FAB({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { icon: RefreshCw, label: "Refresh", color: "#34d399", onClick: () => { onRefresh(); setOpen(false); } },
    { icon: Download, label: "Export", color: "#60a5fa", onClick: () => setOpen(false) },
    { icon: Lightbulb, label: "Insights", color: "#a78bfa", onClick: () => setOpen(false) },
  ];

  return (
    <div className="fixed bottom-6 right-5 z-40 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {open && actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 12, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.8 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            onClick={a.onClick}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl active:scale-95 transition-transform"
            style={{ background: "rgba(10,10,22,0.85)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}
          >
            <a.icon size={14} style={{ color: a.color }} />
            <span className="text-xs text-white/70 font-medium">{a.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.92 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
        style={{
          background: "linear-gradient(135deg, #7c3aed, #059669)",
          boxShadow: "0 4px 24px rgba(109,40,217,0.45)",
        }}
        data-testid="fab-button"
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          <Sparkles size={18} className="text-white" />
        </motion.div>
      </motion.button>
    </div>
  );
});

// ─────────────────────────────────────────
// MAIN COMPONENT: Dashboard
// ─────────────────────────────────────────
export default function Dashboard({
  currentUserId,
  onClose,
}: {
  currentUserId?: string | null;
  onClose?: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(!!currentUserId);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!currentUserId) return;
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchDashboardData(currentUserId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los datos.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const animatedEarnings = useCountUp(data?.totalEarnings ?? 0, 1400);
  const animatedClicks = useCountUp(data?.clicks ?? 0, 1000, 0);
  const animatedImpressions = useCountUp(data?.impressions ?? 0, 1000, 0);
  const animatedCTR = useCountUp(data?.ctr ?? 0, 1000, 2);

  // ── No user
  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(230 15% 7%)" }}>
        <GlassCard className="p-8 text-center max-w-xs">
          <p className="text-white/60 font-semibold mb-1">Sin sesión activa</p>
          <p className="text-white/30 text-sm">Inicia sesión con World App para ver tu dashboard.</p>
        </GlassCard>
      </div>
    );
  }

  // ── Layout container (scroll interno)
  return (
    <motion.div
      className="flex flex-col text-white"
      style={{
        background: BG_GRADIENT,
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        position: "relative",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      data-testid="dashboard-root"
    >
      {/* Sticky header */}
      <AppHeader onClose={onClose} isRefreshing={isRefreshing} />

      {/* Scrollable content */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
        data-testid="dashboard-scroll"
      >
        {/* ── Loading */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pt-4"
            >
              <LoadingSkeleton />
            </motion.div>
          )}

          {/* ── Error */}
          {!loading && error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center min-h-[60vh] px-6"
            >
              <GlassCard className="p-7 text-center max-w-sm w-full">
                <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                  <X size={22} className="text-red-400" />
                </div>
                <p className="text-red-400 font-semibold mb-2 text-sm">Error de conexión</p>
                <p className="text-white/35 text-xs mb-5 leading-relaxed">{error}</p>
                <button
                  onClick={() => load()}
                  className="px-5 py-2.5 rounded-xl bg-violet-600/80 hover:bg-violet-500/80 text-white text-sm font-medium transition-all active:scale-95"
                >
                  Reintentar
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* ── Content */}
          {!loading && !error && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="px-4 pt-4 pb-28 space-y-4"
            >
              {/* ── Hero Earnings */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="relative rounded-3xl overflow-hidden p-6"
                style={HERO_GLASS}
                data-testid="earnings-hero"
              >
                {/* glows */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-violet-500/8 blur-3xl pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-emerald-400"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[10px] text-emerald-300/70 font-semibold uppercase tracking-widest">Total Earnings</span>
                  </div>

                  <div className="flex items-end gap-2 mb-3">
                    <span
                      className="text-5xl font-black tracking-tighter leading-none"
                      style={{
                        background: "linear-gradient(135deg, #34d399 0%, #a78bfa 50%, #60a5fa 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        filter: "drop-shadow(0 0 20px rgba(52,211,153,0.3))",
                      }}
                      data-testid="total-earnings"
                    >
                      {animatedEarnings.toFixed(4)}
                    </span>
                    <span className="text-base font-bold text-white/50 mb-1.5">WLD</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                    <ChevronUp size={12} />
                    <span>Tu contenido trabaja para ti 24/7</span>
                  </div>
                </div>
              </motion.div>

              {/* ── Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCardPro icon={Eye} label="Impressions" value={Math.round(animatedImpressions).toLocaleString()} accentColor="#60a5fa" delay={0.05} />
                <StatCardPro icon={MousePointerClick} label="Clicks" value={Math.round(animatedClicks).toLocaleString()} accentColor="#a78bfa" delay={0.1} />
                <StatCardPro icon={TrendingUp} label="CTR" value={`${animatedCTR.toFixed(2)}%`} sub="Click-through rate" accentColor="#34d399" delay={0.15} />
                <StatCardPro icon={Zap} label="Active Ads" value={String(data?.activeAds ?? 0)} sub="Posts monetizados" accentColor="#fbbf24" delay={0.2} />
              </div>

              {/* ── Chart */}
              <SectionBlock icon={BarChart3} title="Ganancias en el Tiempo" iconColor="text-violet-400">
                <AnimatedChartWrapper chartData={data?.chartData ?? []} />
              </SectionBlock>

              {/* ── Top Posts */}
              <SectionBlock icon={Activity} title="Top Posts" iconColor="text-emerald-400">
                {(!data?.topPosts?.length) ? (
                  <EmptyStatePremium />
                ) : (
                  <div className="space-y-2.5" data-testid="top-posts">
                    {data.topPosts.map((post, i) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.06 }}
                        className="flex items-start gap-3 p-3.5 rounded-xl transition-all duration-200"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                        data-testid={`post-item-${post.id}`}
                      >
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shrink-0 mt-0.5"
                          style={{
                            background: i === 0
                              ? "linear-gradient(135deg,#34d399,#059669)"
                              : i === 1
                                ? "linear-gradient(135deg,#a78bfa,#7c3aed)"
                                : i === 2
                                  ? "linear-gradient(135deg,#60a5fa,#2563eb)"
                                  : "rgba(255,255,255,0.07)",
                            color: i < 3 ? "#fff" : "rgba(255,255,255,0.35)",
                          }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/75 leading-snug line-clamp-2">{post.content}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-emerald-400 font-bold">{post.earnings.toFixed(4)} WLD</span>
                            <span className="text-[10px] text-white/25">{post.clicks} clicks</span>
                            <span className="text-[10px] text-white/25">{post.impressions} views</span>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-white/15 shrink-0 mt-1" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionBlock>

              {/* ── Audience Insights */}
              <SectionBlock icon={Globe} title="Audience Insights" iconColor="text-blue-400">
                {(!data?.countries?.length && !data?.languages?.length) ? (
                  <EmptyStatePremium />
                ) : (
                  <div className="space-y-5" data-testid="audience-insights">
                    {!!data.countries.length && (
                      <div>
                        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5 font-semibold">Países</p>
                        <div className="space-y-2">
                          {data.countries.map((c, i) => <AnimatedBar key={c.label} label={c.label} pct={c.pct} delay={i * 0.08} />)}
                        </div>
                      </div>
                    )}
                    {!!data.languages.length && (
                      <>
                        <div className="h-px bg-white/5" />
                        <div>
                          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5 font-semibold">Idiomas</p>
                          <div className="space-y-2">
                            {data.languages.map((l, i) => <AnimatedBar key={l.label} label={l.label} pct={l.pct} delay={i * 0.08} />)}
                          </div>
                        </div>
                      </>
                    )}
                    {!!data.interests.length && (
                      <>
                        <div className="h-px bg-white/5" />
                        <div>
                          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5 font-semibold">Intereses</p>
                          <div className="space-y-2">
                            {data.interests.map((t, i) => <AnimatedBar key={t.label} label={t.label} pct={t.pct} delay={i * 0.08} />)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </SectionBlock>

              {/* ── Activity Feed */}
              <SectionBlock icon={Clock} title="Live Activity" iconColor="text-amber-400">
                <div className="flex items-center gap-1.5 mb-3 -mt-1">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-medium">En vivo</span>
                </div>

                {(!data?.activity?.length) ? (
                  <EmptyStatePremium />
                ) : (
                  <div className="space-y-0" data-testid="activity-feed">
                    {data.activity.map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04 }}
                        className="flex items-center gap-3 py-2.5 border-b last:border-0"
                        style={{ borderColor: "rgba(255,255,255,0.04)" }}
                        data-testid={`activity-item-${item.id}`}
                      >
                        <motion.div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.type === "click" ? "bg-emerald-400" : "bg-blue-400/40"}`}
                          animate={item.type === "click" ? { scale: [1, 1.4, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        />
                        <p className="text-xs text-white/60 flex-1 leading-snug">
                          {item.type === "click" ? (
                            <>Usuario de {getFlag(item.country)}{item.country} hizo clic en tu anuncio{" "}
                              <span className="text-emerald-400 font-bold">(+{item.value.toFixed(4)} WLD)</span>
                            </>
                          ) : (
                            <>Usuario de {getFlag(item.country)}{item.country} vio tu post</>
                          )}
                        </p>
                        <span className="text-[9px] text-white/20 shrink-0 font-medium">{timeAgo(item.created_at)}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </SectionBlock>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FAB */}
      <FAB onRefresh={() => load(true)} />
    </motion.div>
  );
}
