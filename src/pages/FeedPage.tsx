import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import PostCard from "../components/PostCard";
import { supabase } from "../supabaseClient";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { LanguageContext } from "../LanguageContext";
import { ThemeContext } from "../lib/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Crown,
  Zap,
  Eye,
  BarChart2,
  Shield,
  Edit3,
  MessageCircle,
  Users,
  Sparkles,
  Trophy,
  Lock,
  X,
  CheckCircle2,
  Globe,
  BookOpen,
  PenSquare,
} from "lucide-react";

const RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || "";

function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Tipos ──────────────────────────────────────────────────────────────
interface FeedPageProps {
  posts: any[];
  loading?: boolean;
  error?: string | null;
  currentUserId: string | null;
  userTier: "free" | "basic" | "premium" | "premium+";
  onUpgradeSuccess?: () => void;
  onLoadMoreGlobal?: (reset?: boolean) => void;
  globalHasMore?: boolean;
}

type FeedTab = "global" | "following" | "mine";

const TAB_PAGE_SIZE = 10;

// ── Beneficios (sin cambios) ────────────────────────────────────────────
const premiumBenefits = [
  { icon: <Edit3 size={16} />, text: "Publicaciones más largas (2,000 caracteres)" },
  { icon: <Zap size={16} />, text: "Prioridad en el feed" },
  { icon: <Star size={16} />, text: "Badge Premium exclusivo" },
  { icon: <MessageCircle size={16} />, text: "Salas Classic" },
  { icon: <Shield size={16} />, text: "Sin anuncios" },
  { icon: <Edit3 size={16} />, text: "Editar posts hasta 30 minutos" },
  { icon: <Eye size={16} />, text: "Ver visitas a tu perfil" },
  { icon: <Users size={16} />, text: "Soporte prioritario" },
];

const premiumPlusBenefits = [
  { icon: <CheckCircle2 size={16} />, text: "Todo lo incluido en Premium" },
  { icon: <Edit3 size={16} />, text: "Publicaciones ilimitadas (10,000 caracteres)" },
  { icon: <Crown size={16} />, text: "Badge dorado animado" },
  { icon: <Trophy size={16} />, text: "Salas Gold y VIP Lounge" },
  { icon: <Zap size={16} />, text: "Prioridad máxima en el feed" },
  { icon: <Eye size={16} />, text: "Ver likes y reposts anónimos" },
  { icon: <Edit3 size={16} />, text: "Editar posts sin límite de tiempo" },
  { icon: <BarChart2 size={16} />, text: "Analíticas avanzadas" },
  { icon: <Shield size={16} />, text: "Soporte VIP 24/7" },
  { icon: <Sparkles size={16} />, text: "Invitaciones exclusivas a eventos" },
];

const sortPosts = (posts: any[]) => {
  const now = Date.now();
  return [...posts].sort((a, b) => {
    const calculateScore = (post: any) => {
      const ageHours = Math.max((now - new Date(post.timestamp || post.created_at || 0).getTime()) / 3600000, 0.1);
      const likes = post.likes || 0;
      const comments = post.comments || 0;
      const reposts = post.reposts || 0;
      const tipsTotal = post.tips_total || 0;
      const tipsCount = post.tips_count || 0;
      const boostScore = post.boost_score || 0;
      const views = post.views || 0;
      const engagement =
        likes * 2 +
        comments * 4 +
        reposts * 3 +
        tipsTotal * 8 +
        tipsCount * 5 +
        views * 0.05;
      const velocity = engagement / ageHours;
      const recencyDecay = Math.exp(-ageHours / 36);
      const activeBoost =
        post.boosted_until && new Date(post.boosted_until) > new Date()
          ? 20 + boostScore * 0.5
          : boostScore * 0.1;
      const tagScore = Array.isArray(post.tags) ? post.tags.length * 0.5 : 0;
      return (engagement * recencyDecay) + (velocity * 0.6) + activeBoost + tagScore;
    };
    return calculateScore(b) - calculateScore(a);
  });
};

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════
const FeedPage: React.FC<FeedPageProps> = ({
  posts,
  loading,
  error,
  currentUserId,
  userTier,
  onUpgradeSuccess,
  onLoadMoreGlobal,
  globalHasMore,
}) => {
  const { t } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  // ── Estado upgrade (sin cambios) ──────────────────────────────────────
  const [showUpgradeOptions, setShowUpgradeOptions] = useState(false);
  const [selectedTier, setSelectedTier] = useState<"premium" | "premium+" | null>(null);
  const [showSlideModal, setShowSlideModal] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [price, setPrice] = useState(0);

  // ── Estado de tabs (NUEVO) ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<FeedTab>("global");
  const loaderRef = useRef<HTMLDivElement | null>(null);
  // Tab: Siguiendo
  const [followingPosts, setFollowingPosts] = useState<any[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const followingCursor = useRef<string | null>(null);
  const followingFetching = useRef(false);

  // Tab: Mis posts
  const [minePosts, setMinePosts] = useState<any[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [mineHasMore, setMineHasMore] = useState(true);
  const mineCursor = useRef<string | null>(null);
  const mineFetching = useRef(false);

  // Ref del scroll para infinite scroll por tab
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ── Fetch: Siguiendo (cursor-based, escala a 1M+) ─────────────────────
  const fetchFollowing = useCallback(
    async (reset = false) => {
      if (!currentUserId) return;
      if (followingFetching.current) return;
      if (!followingHasMore && !reset) return;

      followingFetching.current = true;
      if (reset) {
        followingCursor.current = null;
        setFollowingPosts([]);
        setFollowingHasMore(true);
      }
      setFollowingLoading(true);

      try {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUserId)
          .limit(500);

        const ids = (follows || []).map((f: any) => f.following_id);

        if (ids.length === 0) {
          setFollowingPosts([]);
          setFollowingHasMore(false);
          setFollowingLoading(false);
          followingFetching.current = false;
          return;
        }

        let query = supabase
          .from("posts")
          .select("*")
          .in("user_id", ids)
          .eq("deleted_flag", false)
          .order("timestamp", { ascending: false })
          .limit(TAB_PAGE_SIZE);

        if (followingCursor.current) {
          query = query.lt("timestamp", followingCursor.current);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const newPosts = data || [];
        setFollowingPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        setFollowingHasMore(newPosts.length === TAB_PAGE_SIZE);

        if (newPosts.length > 0) {
          followingCursor.current = newPosts[newPosts.length - 1].timestamp;
        }
      } catch (err) {
        console.error("[FeedPage] Error fetching following:", err);
      } finally {
        setFollowingLoading(false);
        followingFetching.current = false;
      }
    },
    [currentUserId, followingHasMore],
  );

  // ── Fetch: Mis posts (cursor-based, escala a 1M+) ─────────────────────
  const fetchMine = useCallback(
    async (reset = false) => {
      if (!currentUserId) return;
      if (mineFetching.current) return;
      if (!mineHasMore && !reset) return;

      mineFetching.current = true;
      if (reset) {
        mineCursor.current = null;
        setMinePosts([]);
        setMineHasMore(true);
      }
      setMineLoading(true);

      try {
        let query = supabase
          .from("posts")
          .select("*")
          .eq("user_id", currentUserId)
          .eq("deleted_flag", false)
          .order("timestamp", { ascending: false })
          .limit(TAB_PAGE_SIZE);

        if (mineCursor.current) {
          query = query.lt("timestamp", mineCursor.current);
        }

        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;

        const newPosts = data || [];
        setMinePosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        setMineHasMore(newPosts.length === TAB_PAGE_SIZE);

        if (newPosts.length > 0) {
          mineCursor.current = newPosts[newPosts.length - 1].timestamp;
        }
      } catch (err) {
        console.error("[FeedPage] Error fetching mine:", err);
      } finally {
        setMineLoading(false);
        mineFetching.current = false;
      }
    },
    [currentUserId, mineHasMore],
  );

  // ── Cargar tab al cambiar ─────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "following") fetchFollowing(true);
    if (activeTab === "mine") fetchMine(true);
    if (activeTab === "global") onLoadMoreGlobal?.();
  }, [activeTab, currentUserId]);

  // ── Infinite scroll por tab (window-level) ───────────────────────────
  useEffect(() => {
    if (activeTab === "global") return;

    let throttle: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (throttle) return;
      throttle = setTimeout(() => {
        throttle = null;
        const scrolled = window.scrollY + window.innerHeight;
        const total = document.documentElement.scrollHeight;
        if (scrolled >= total - 300) {
          if (activeTab === "following") fetchFollowing();
          if (activeTab === "mine") fetchMine();
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (throttle) clearTimeout(throttle);
    };
  }, [activeTab, fetchFollowing, fetchMine]);

  useEffect(() => {
    if (activeTab !== "global") return;
    if (!onLoadMoreGlobal) return;
    if (!globalHasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMoreGlobal();
        }
      },
      {
        root: null,
        rootMargin: "300px",
        threshold: 0,
      }
    );

    const current = loaderRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [activeTab, onLoadMoreGlobal, globalHasMore]);

  // ── Qué posts mostrar según tab activo ───────────────────────────────
  const activePosts =
    activeTab === "global"
      ? sortPosts(posts)
      : activeTab === "following"
      ? sortPosts(followingPosts)
      : sortPosts(minePosts);

  const activeLoading =
    activeTab === "global"
      ? loading
      : activeTab === "following"
      ? followingLoading
      : mineLoading;

  const activeHasMore =
    activeTab === "following"
      ? followingHasMore
      : activeTab === "mine"
      ? mineHasMore
      : globalHasMore;

  // ── Upgrade logic (sin cambios) ───────────────────────────────────────
  useEffect(() => {
    if (!selectedTier) return;
    const fetchSlots = async () => {
      const { count } = await supabase
        .from("upgrades")
        .select("*", { count: "exact", head: true })
        .eq("tier", selectedTier);
      const limit = selectedTier === "premium" ? 10000 : 3000;
      const used = count || 0;
      const calculatedPrice =
        used < limit
          ? selectedTier === "premium" ? 10 : 15
          : selectedTier === "premium" ? 20 : 35;
      setPrice(calculatedPrice);
    };
    fetchSlots();
  }, [selectedTier]);

  const handleUpgrade = () => setShowUpgradeOptions(true);
  const selectTier = (tier: "premium" | "premium+") => {
    setSelectedTier(tier);
    setShowSlideModal(true);
  };
  const cancelUpgrade = () => {
    setShowSlideModal(false);
    setSelectedTier(null);
    setShowUpgradeOptions(false);
    setUpgradeError(null);
  };

  const confirmUpgrade = async () => {
    setUpgradeError(null);
    if (!price) {
      setUpgradeError(t ? t("calculando_precio") : "Calculando precio, intenta nuevamente.");
      return;
    }
    if (!currentUserId || !selectedTier) {
      setUpgradeError(t ? t("no_usuario_o_tier") : "No se encontró tu ID o tier seleccionado");
      return;
    }
    if (!MiniKit.isInstalled()) {
      setUpgradeError(t ? t("minikit_no_detectado") : "MiniKit no detectado dentro de World App");
      return;
    }
    setLoadingUpgrade(true);
    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference(),
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(price, Tokens.WLD).toString(),
          },
        ],
        description: `Upgrade ${selectedTier}`,
      });
      if (payRes?.finalPayload?.status !== "success") {
        cancelUpgrade();
        return;
      }
      const transactionId = payRes?.finalPayload?.transaction_id;
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, tier: selectedTier, transactionId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || (t ? t("error_upgrade") : "Error al procesar upgrade"));
      }
      setUpgradeError(
        t ? t("upgrade_exitoso") + ` ${selectedTier}` : `Upgrade ${selectedTier} exitoso`,
      );
      onUpgradeSuccess?.();
      cancelUpgrade();
    } catch (err: any) {
      setUpgradeError(err.message || (t ? t("error_upgrade") : "Error en el upgrade"));
    } finally {
      setLoadingUpgrade(false);
    }
  };

  const isPremiumPlus = selectedTier === "premium+";
  const benefits = isPremiumPlus ? premiumPlusBenefits : premiumBenefits;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={scrollRef}
      className={`flex flex-col w-full max-w-xl mx-auto px-0 overflow-y-auto ${
        isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f8f9fa] text-gray-900"
      }`}
    >
      <div className="px-4 pt-4">
        {/* ── TABS ─────────────────────────────────────────────────── */}
        <div
          className={`flex rounded-2xl mb-4 p-1.5 gap-1 ${
            isDark ? "bg-[#111113] border border-white/[0.06]" : "bg-white border border-gray-100 shadow-sm"
          }`}
        >
          {([
            { key: "global",    label: t("tab_global"),    icon: <Globe size={13} /> },
            { key: "following", label: t("tab_following"), icon: <Users size={13} /> },
            { key: "mine",      label: t("tab_mine"),      icon: <PenSquare size={13} /> },
          ] as { key: FeedTab; label: string; icon: React.ReactNode }[]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === key
                  ? "text-white shadow-md"
                  : isDark
                    ? "text-gray-500 hover:text-gray-300"
                    : "text-gray-400 hover:text-gray-600"
              }`}
              style={
                activeTab === key
                  ? { background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 2px 12px rgba(99,102,241,0.40)" }
                  : undefined
              }
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── WHY STAY BANNER ──────────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-4 relative overflow-hidden"
            style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(99,102,241,0.13) 0%, rgba(168,85,247,0.10) 100%)"
                : "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.07) 100%)",
              border: isDark ? "1px solid rgba(99,102,241,0.24)" : "1px solid rgba(99,102,241,0.18)",
              boxShadow: isDark ? "0 2px 16px rgba(99,102,241,0.08)" : "none",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.28), rgba(168,85,247,0.22))", border: "1px solid rgba(168,85,247,0.20)" }}
            >
              <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className={`text-xs font-medium leading-snug ${isDark ? "text-violet-300/90" : "text-indigo-700"}`}>
              {(() => { const txt = t ? t("earn_wld_banner") : null; return (txt && txt !== "earn_wld_banner") ? txt : "Gana WLD publicando y conectando con humanos reales"; })()}
            </p>
          </div>

        {/* ── UPGRADE BUTTON ───────────────────────────────────────── */}
          <div className="mb-5">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 12px 40px rgba(168,85,247,0.55)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleUpgrade}
              className="relative w-full py-4 rounded-2xl font-bold text-white tracking-wide text-sm overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 45%, #a855f7 75%, #c084fc 100%)",
                boxShadow: "0 6px 28px rgba(99,102,241,0.45), inset 0 0 0 1px rgba(255,255,255,0.10)",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.13) 50%, transparent 65%)",
                  animation: "shimmerSlide 2.6s linear infinite",
                }}
              />
              <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
                <Sparkles size={15} className="opacity-95" />
                <span>✦ {t ? t("upgrade") : "Upgrade Premium"}</span>
              </span>
            </motion.button>
          </div>

        {/* ── UPGRADE OPTIONS ───────────────────────────────────────── */}
        <AnimatePresence>
          {showUpgradeOptions && (
            <motion.div
              key="upgrade-options"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex gap-3 mb-5 overflow-hidden"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectTier("premium")}
                className="flex-1 py-5 rounded-2xl font-bold flex flex-col items-center gap-2 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #a78bfa 100%)",
                  boxShadow: "0 8px 32px rgba(99,60,220,0.35)",
                }}
              >
                <Star size={24} className="text-yellow-300 drop-shadow" />
                <span className="text-white text-base tracking-wide">Premium</span>
                <span className="text-indigo-200 text-xs font-normal">{t("acceso_prioritario")}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectTier("premium+")}
                className="flex-1 py-5 rounded-2xl font-bold flex flex-col items-center gap-2 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #b45309 0%, #d97706 40%, #fbbf24 80%, #fde68a 100%)",
                  boxShadow: "0 8px 32px rgba(217,119,6,0.40)",
                }}
              >
                <Crown size={24} className="text-white drop-shadow" />
                <span className="text-white text-base tracking-wide">Premium+</span>
                <span className="text-yellow-100 text-xs font-normal">{t("nivel_maximo_vip")}</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── POSTS según tab activo ───────────────────────────────── */}
      {activeLoading && activePosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: "#a855f7", borderRightColor: "#6366f1" }}
          />
          <p className={`text-xs font-medium ${isDark ? "text-gray-600" : "text-gray-400"}`}>
            {t ? t("cargando") : "Cargando..."}
          </p>
        </div>
      ) : error && activeTab === "global" ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
          <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <X size={18} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-400">{error}</p>
        </div>
      ) : activePosts.length === 0 && !activeLoading ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))", border: "1px solid rgba(99,102,241,0.18)" }}
          >
            <span className="text-3xl">
              {activeTab === "following" ? "👥" : activeTab === "mine" ? "✍️" : "🌍"}
            </span>
          </div>
          <div>
            <p className={`text-base font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
              {activeTab === "following"
                ? t("no_posts_following")
                : activeTab === "mine"
                ? t("no_posts_mine")
                : t("no_posts_global")}
            </p>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              {activeTab === "following"
                ? "Sigue a alguien para ver sus posts aquí."
                : activeTab === "mine"
                ? "Publica algo y aparecerá aquí."
                : "Sé el primero en publicar."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {activePosts.map((post, idx) => (
            <div key={post.id}>
              <PostCard post={post} currentUserId={currentUserId} />
              {idx < activePosts.length - 1 && (
                <div className={`mx-4 h-px ${isDark ? "bg-white/[0.05]" : "bg-gray-100"}`} />
              )}
            </div>
          ))}
          {activeTab === "global" && <div ref={loaderRef} className="h-10" />}

          {/* Loader de más posts */}
          {activeLoading && activePosts.length > 0 && (
            <div className="flex justify-center py-6">
              <div
                className="w-6 h-6 rounded-full border-2 border-transparent animate-spin"
                style={{ borderTopColor: "#a855f7", borderRightColor: "#6366f1" }}
              />
            </div>
          )}

          {/* End of feed */}
          {!activeHasMore && activePosts.length > 0 && !activeLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <div
                className="w-8 h-8 rounded-2xl flex items-center justify-center mb-1"
                style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(168,85,247,0.12))", border: "1px solid rgba(99,102,241,0.15)" }}
              >
                <span className="font-black text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(135deg,#6366f1,#a855f7)", fontSize: 13 }}>H</span>
              </div>
              <p className={`text-xs font-medium ${isDark ? "text-gray-700" : "text-gray-400"}`}>
                Has visto todo por ahora
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── SLIDE MODAL (upgrade details) ─────────────────────────── */}
      <AnimatePresence>
        {showSlideModal && selectedTier && (
          <motion.div
            key="slide-modal-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.75)" }}
            onClick={cancelUpgrade}
          >
            <motion.div
              key="slide-modal"
              className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
                isDark ? "bg-[#111113] border border-white/[0.08]" : "bg-white border border-gray-200"
              }`}
              style={{ maxHeight: "88vh" }}
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient accent top */}
              <div
                className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl"
                style={{
                  background: isPremiumPlus
                    ? "linear-gradient(90deg, #b45309, #fbbf24)"
                    : "linear-gradient(90deg, #6366f1, #a855f7)",
                }}
              />

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-7 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: isPremiumPlus
                        ? "linear-gradient(135deg, #b45309, #fbbf24)"
                        : "linear-gradient(135deg, #6366f1, #a855f7)",
                    }}
                  >
                    {isPremiumPlus
                      ? <Crown size={18} className="text-white" />
                      : <Star size={18} className="text-white" />
                    }
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                      {selectedTier === "premium+" ? "Premium+" : "Premium"}
                    </h2>
                    {price > 0 && (
                      <p className={`text-xs font-semibold ${isPremiumPlus ? "text-yellow-400" : "text-indigo-400"}`}>
                        {price} WLD / mes
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={cancelUpgrade}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                    isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Benefits list */}
              <div className="px-6 pb-4 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-2.5">
                  {benefits.map((b, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                        isDark
                          ? "bg-white/[0.03] border-white/[0.06]"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{
                          background: isPremiumPlus
                            ? "linear-gradient(135deg, rgba(180,83,9,0.2), rgba(251,191,36,0.2))"
                            : "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))",
                        }}
                      >
                        <span className={isPremiumPlus ? "text-yellow-400" : "text-indigo-400"}>
                          {b.icon}
                        </span>
                      </div>
                      <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {b.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {upgradeError && (
                <div className="mx-6 mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
                  {upgradeError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 px-6 pb-8 pt-2">
                <button
                  onClick={cancelUpgrade}
                  className={`flex-1 py-3 rounded-2xl text-sm font-medium border transition ${
                    isDark
                      ? "border-white/10 text-gray-400 hover:bg-white/[0.04]"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmUpgrade}
                  disabled={loadingUpgrade || !price}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isPremiumPlus
                      ? "linear-gradient(135deg, #b45309, #fbbf24)"
                      : "linear-gradient(135deg, #6366f1, #a855f7)",
                    boxShadow: isPremiumPlus
                      ? "0 4px 20px rgba(217,119,6,0.40)"
                      : "0 4px 20px rgba(99,102,241,0.40)",
                  }}
                >
                  {loadingUpgrade ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Procesando...
                    </span>
                  ) : price > 0 ? (
                    `Activar por ${price} WLD`
                  ) : (
                    "Calculando..."
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeedPage;
