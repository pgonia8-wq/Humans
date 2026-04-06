import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
  useMemo,
  lazy,
  Suspense,
} from "react";

import { supabase } from "../supabaseClient";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import FeedPage from "./FeedPage";
import { ThemeContext } from "../lib/ThemeContext";
import { LanguageContext } from "../LanguageContext";
import ActionButton from "../components/ActionButton";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageIcon,
  X,
  Send,
  Bell,
  Mail,
  Sun,
  Moon,
  Globe,
  Plus,
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Repeat2,
  CheckCircle2,
} from "lucide-react";

// URL de la token mini-app embebida. Pon VITE_TOKEN_APP_URL en tu .env
const TOKEN_APP_URL: string =
  (import.meta as any).env?.VITE_TOKEN_APP_URL ?? "";

// Lazy load — no entran en el bundle inicial
const ProfileModal = lazy(() => import("../components/ProfileModal"));
const Inbox = lazy(() => import("./chat/Inbox"));
const AutonomousGrowthBrain = lazy(() => import("../components/AutonomousGrowthBrain"));

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────
interface HomePageProps {
  username?: string | null;
  avatar?: string | null;
  userId: string | null;
  wallet: string | null;
  verified: boolean;
  error: string | null;
  verifying: boolean;
  setUserId: (id: string | null) => void;
  verifyUser: () => void;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "repost" | "verified";
  user: string;
  avatar: string;
  message: string;
  time: string;
  read: boolean;
}

// ─────────────────────────────────────────────
// ÍCONO DE NOTIFICACIÓN
// ─────────────────────────────────────────────
const notifIcon = (type: Notification["type"]) => {
  switch (type) {
    case "like":      return <Heart size={13} className="text-pink-500" />;
    case "comment":   return <MessageCircle size={13} className="text-blue-400" />;
    case "follow":    return <UserPlus size={13} className="text-green-400" />;
    case "mention":   return <AtSign size={13} className="text-violet-400" />;
    case "repost":    return <Repeat2 size={13} className="text-emerald-400" />;
    case "verified":  return <CheckCircle2 size={13} className="text-sky-400" />;
    default:          return <Bell size={13} className="text-gray-400" />;
  }
};

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────
const HomePage: React.FC<HomePageProps> = ({
  userId,
  wallet,
  verified,
  error,
  verifying,
  setUserId,
  verifyUser,
}) => {
  // ── Post modal ──
  const [optimisticPosts, setOptimisticPosts] = useState<any[]>([]);
  const [globalPosts, setGlobalPosts] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // ── Perfil ──
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ── Inbox ──
  const [showInbox, setShowInbox] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageAttachments, setNewMessageAttachments] = useState<File[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

  // ── Token mini-app ──
  const [showTokenApp, setShowTokenApp] = useState(false);
  // El iframe no se monta hasta 10s después del inicio para no demorar la carga
  const [tokenPreloaded, setTokenPreloaded] = useState(false);
  const tokenIframeRef = useRef<HTMLIFrameElement>(null);

  // ── Notificaciones ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Memoizado: no recalcula en cada render
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const mergedPosts = useMemo(() => {
    const map = new Map();
    [...optimisticPosts, ...globalPosts].forEach((p) => {
      map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [optimisticPosts, globalPosts]);

  const { theme, toggleTheme, username } = useContext(ThemeContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const isDark = theme === "dark";

  const maxChars =
    profile?.tier === "premium+" ? 10000
    : profile?.tier === "premium" ? 4000
    : 280;

  // ─────────────────────────────────────────────
  // PERFIL: SELECT primero, upsert solo si no existe
  // ─────────────────────────────────────────────
  const fetchOrUpsertProfile = useCallback(async () => {
    if (!userId) return;
    setProfileLoading(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, verified, tier, wallet")
        .eq("id", userId)
        .maybeSingle();

      if (existing) {
        setProfile(existing);
        return;
      }

      const { data, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: username || `user_${userId.slice(0, 8)}`,
            wallet: wallet || null,
            verified,
            verified_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        )
        .select("id, username, avatar_url, verified, tier, wallet")
        .maybeSingle();

      if (upsertError) throw upsertError;
      setProfile(data);
    } catch (err: any) {
      console.error("[HOME] profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [userId, username, wallet, verified]);

  // ─────────────────────────────────────────────
  // NOTIFICACIONES
  // ─────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, user, avatar, message, time, read")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) setNotifications(data as Notification[]);
    } catch (err) {
      console.error("[HOME] Error fetching notifications:", err);
    }
  }, [userId]);

  // ─────────────────────────────────────────────
  // MENSAJES NO LEÍDOS
  // ─────────────────────────────────────────────
  const loadUnread = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("conversation_unread_counts")
      .select("unread")
      .eq("receiver_id", userId)
      .limit(200);

    const total = data?.reduce((sum: number, r: any) => sum + (r.unread || 0), 0) || 0;
    setUnreadMessages(total);
    setUnreadTotal(total);
  }, [userId]);

  const globalCursor = useRef<string | null>(null);
  const globalFetching = useRef(false);
  const [globalHasMore, setGlobalHasMore] = useState(true);

  const fetchGlobalPosts = useCallback(async (reset = false) => {
    if (globalFetching.current) return;
    if (!globalHasMore && !reset) return;

    globalFetching.current = true;

    if (reset) {
      globalCursor.current = null;
      setGlobalPosts([]);
      setGlobalHasMore(true);
    }

    setGlobalLoading(true);

    try {
      let query = supabase
        .from("posts")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(10);

      if (globalCursor.current) {
        query = query.lt("timestamp", globalCursor.current);
      }

      const { data, error } = await query;
      if (error) throw error;

      const newPosts = data || [];

      setGlobalPosts((prev) =>
        reset ? newPosts : [...prev, ...newPosts]
      );

      setGlobalHasMore(newPosts.length === 10);

      if (newPosts.length > 0) {
        globalCursor.current = newPosts[newPosts.length - 1].timestamp;
      }
    } catch (err) {
      console.error("[HOME] Global fetch error:", err);
    } finally {
      setGlobalLoading(false);
      globalFetching.current = false;
    }
  }, [globalHasMore]);

  // ─────────────────────────────────────────────
  // TOKEN MINI-APP — bridge postMessage
  // ─────────────────────────────────────────────
  const injectTokenContext = useCallback(() => {
    const win = tokenIframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: "WORLD_APP_CONTEXT",
        payload: {
          userId: userId ?? "",
          username: profile?.username ?? username ?? "",
          profilePicture: profile?.avatar_url ?? "",
          verificationLevel: verified ? "orb" : "device",
          balanceWld: 0,
          balanceUsdc: 0,
        },
      },
      TOKEN_APP_URL || "*"
    );
  }, [userId, profile, username, verified]);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      const { type, payload } = e.data as { type: string; payload?: any };

      if (type === "MINI_APP_READY") {
        injectTokenContext();
        return;
      }

      if (type === "REQUEST_PAYMENT") {
        const win = tokenIframeRef.current?.contentWindow;
        if (!win) return;
        try {
          const payRes = await MiniKit.commandsAsync.pay({
            reference: crypto.randomUUID(),
            to: payload.to,
            tokens: [
              {
                symbol: Tokens.WLD,
                token_amount: tokenToDecimals(
                  payload.amount,
                  Tokens.WLD
                ).toString(),
              },
            ],
            description: payload.description || "Token Market",
          });
          if (payRes?.finalPayload?.status === "success") {
            win.postMessage(
              {
                type: "PAYMENT_RESULT",
                payload: {
                  success: true,
                  transactionId:
                    payRes.finalPayload.transaction_id,
                },
              },
              TOKEN_APP_URL || "*"
            );
          } else {
            win.postMessage(
              {
                type: "PAYMENT_RESULT",
                payload: {
                  success: false,
                  error: "Payment cancelled",
                },
              },
              TOKEN_APP_URL || "*"
            );
          }
        } catch (err: any) {
          tokenIframeRef.current?.contentWindow?.postMessage(
            {
              type: "PAYMENT_RESULT",
              payload: { success: false, error: err.message },
            },
            TOKEN_APP_URL || "*"
          );
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [injectTokenContext]);

  // Permite montar el iframe 10s después del inicio (no bloquea la carga inicial)
  useEffect(() => {
    const timer = setTimeout(() => setTokenPreloaded(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  // ─────────────────────────────────────────────
  // INICIALIZACIÓN al tener userId
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchOrUpsertProfile();
    fetchNotifications();
    loadUnread();
    setTimeout(() => {
      fetchGlobalPosts();
    }, 10000);
  }, [userId]);

  // ─────────────────────────────────────────────
  // REALTIME: mensajes no leídos
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => setUnreadMessages((prev) => prev + 1),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ─────────────────────────────────────────────
  // CREAR POST — FIX MÓVIL
  //
  // Problema: en móvil, supabase.functions.invoke puede fallar si el token de
  // autenticación no está disponible inmediatamente o la Edge Function no existe.
  // Solución: intentar primero con Edge Function. Si falla, hacer INSERT directo
  // respetando exactamente las columnas de la tabla posts:
  //   id, user_id, content, timestamp, deleted_flag, visibility_score, likes,
  //   comments, reposts, boosted_until, tags, tips_total, boost_score, views,
  //   created_at, likes_count, replies_count, image_url, reposted_post_id,
  //   is_ad, monetized, is_boosted, campaign_id
  // ─────────────────────────────────────────────
  const handleCreatePost = async () => {
    if (isPosting) return;
    if (!newPostContent.trim()) {
      setPostError(t("write_before_posting"));
      return;
    }
    if (!userId) return;

    setIsPosting(true);
    setPostError(null);

    let imageUrl: string | null = null;
    const tempId = `temp-${Date.now()}`;

    try {
      // 1. Subir imagen primero (si la hay)
      if (newPostImage) {
        const fileExt = newPostImage.name.split(".").pop() || "png";
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, newPostImage, {
            cacheControl: "3600",
            contentType: newPostImage.type || `image/${fileExt}`,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      // 2. Optimistic UI (se muestra inmediatamente)
      const tempPost = {
        id: tempId,
        user_id: userId,
        content: newPostContent,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
        username: profile?.username || username,
        avatar_url: profile?.avatar_url || null,
        verified: profile?.verified || false,
        tier: profile?.tier || "free",
        optimistic: true,
      };

      setOptimisticPosts((prev) => [tempPost, ...prev]);

      // 3. Intentar Edge Function primero
      let posted = false;
      try {
        const { error: fnError } = await supabase.functions.invoke("publish-post-user", {
          body: { content: newPostContent, image_url: imageUrl },
        });
        if (!fnError) {
          posted = true;
        } else {
          console.warn("[HOME] Edge Function falló, usando INSERT directo:", fnError.message);
        }
      } catch (fnErr: any) {
        console.warn("[HOME] Edge Function no disponible, usando INSERT directo:", fnErr?.message);
      }

      // 4. Fallback: INSERT directo si la Edge Function falló
      //    Solo columnas existentes en la tabla posts
      if (!posted) {
        const now = new Date().toISOString();
        const { error: insertError } = await supabase.from("posts").insert({
          user_id: userId,
          content: newPostContent,
          image_url: imageUrl,
          timestamp: now,
          created_at: now,
          deleted_flag: false,
          visibility_score: 0,
          likes: 0,
          comments: 0,
          reposts: 0,
          tips_total: 0,
          boost_score: 0,
          views: 0,
          likes_count: 0,
          replies_count: 0,
          is_ad: false,
          monetized: false,
          is_boosted: false,
        });
        if (insertError) throw insertError;
      }

      // 5. Limpiar UI
      setShowNewPostModal(false);
      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);

    } catch (err: any) {
      console.error("[HOME] Error creando post:", err);
      setPostError(err.message || "Error al publicar");
      // Rollback: remover el optimistic
      setOptimisticPosts((prev) => prev.filter((p) => p.id !== tempId));
    } finally {
      setIsPosting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && newMessageAttachments.length === 0) return;
    try {
      const attachmentsUrls: string[] = [];
      for (const file of newMessageAttachments) {
        const key = `${userId}-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(key, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("message-attachments").getPublicUrl(key);
        attachmentsUrls.push(data.publicUrl);
      }
      if (!selectedChatUserId) return;
      await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: selectedChatUserId,
        content: newMessage,
        attachments: attachmentsUrls,
        timestamp: new Date().toISOString(),
      });
      setNewMessage("");
      setNewMessageAttachments([]);
      loadUnread();
    } catch (err: any) {
      console.error("[HOME] Error enviando mensaje:", err);
    }
  };

  const handleProfileUpdated = (updatedProfile: { id: string; avatar_url?: string }) => {
    if (updatedProfile.avatar_url) {
      setProfile((prev: any) => ({ ...prev, avatar_url: updatedProfile.avatar_url }));
    }
  };

  const markAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className={`min-h-screen overflow-y-auto overflow-x-hidden ${isDark ? "bg-[#09090b] text-white" : "bg-[#fafafa] text-black"}`}>
      <Suspense fallback={null}>
        <AutonomousGrowthBrain />
      </Suspense>

      {/* ── HEADER FLOTANTE ── */}
      <header
        className={`fixed top-3 left-3 right-3 z-30 flex items-center justify-between px-4 py-2.5 rounded-2xl border ${
          isDark ? "bg-[#09090b]/85 border-white/[0.09]" : "bg-white/90 border-black/[0.07]"
        }`}
        style={{
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)"
            : "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Logo */}
        <motion.img
          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/logoh-carbono.png`}
          className="w-10 h-10 object-contain rounded-xl"
          alt="Humans Logo"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        />

        {/* Controles centrales */}
        <div className="flex items-center gap-1.5">
          {/* Nuevo Post */}
          <motion.button
            onClick={() => setShowNewPostModal(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", boxShadow: "0 0 18px rgba(139,92,246,0.35)" }}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">{t("post") || "Post"}</span>
          </motion.button>

          {/* Inbox */}
          <div className="relative">
            <motion.button
              onClick={() => { setShowInbox(true); setUnreadMessages(0); }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"}`}
            >
              <Mail size={19} />
            </motion.button>
            <AnimatePresence>
              {unreadTotal > 0 && (
                <motion.span
                  key="mail-badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none shadow-md"
                >
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Notificaciones */}
          <div className="relative">
            <motion.button
              onClick={() => setShowNotifications(true)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"}`}
            >
              <motion.div
                animate={unreadNotifCount > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Bell size={19} />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {unreadNotifCount > 0 && (
                <motion.span
                  key="bell-badge"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-violet-500 text-white text-[10px] font-bold px-1 leading-none shadow-md"
                >
                  {unreadNotifCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Tema */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDark ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"}`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={theme}
                initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 30, scale: 0.6 }}
                transition={{ duration: 0.2 }}
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {/* Token mini-app */}
          <motion.button
            onClick={() => setShowTokenApp(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className={`w-9 h-9 flex items-center justify-center rounded-full text-base transition-colors ${isDark ? "text-gray-300 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-black/5"}`}
            title="Token Market"
          >
            🪙
          </motion.button>

          {/* Idioma */}
          <motion.button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className={`h-9 px-3 flex items-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${isDark ? "text-gray-300 hover:text-white bg-white/5 hover:bg-white/10" : "text-gray-600 hover:text-gray-900 bg-black/[0.04] hover:bg-black/[0.08]"}`}
          >
            <Globe size={13} />
            {language.toUpperCase()}
          </motion.button>
        </div>

        {/* Avatar */}
        <motion.div
          className={`w-9 h-9 rounded-full overflow-hidden cursor-pointer ring-2 transition-all ${isDark ? "ring-white/10 hover:ring-violet-500/60" : "ring-black/10 hover:ring-violet-400/60"}`}
          onClick={() => setShowProfileModal(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          style={{ background: isDark ? "#27272a" : "#e4e4e7" }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff" }}
            >
              {(username || "H")[0].toUpperCase()}
            </div>
          )}
        </motion.div>
      </header>

      {/* ── FEED ── */}
      <main className="w-full px-2 pt-20 pb-6 flex justify-center">
        <FeedPage
          posts={mergedPosts}
          loading={globalLoading}
          error={error}
          currentUserId={userId}
          userTier={profile?.tier || "free"}
          onUpgradeSuccess={fetchOrUpsertProfile}
          onLoadMoreGlobal={fetchGlobalPosts}
          globalHasMore={globalHasMore}
        />
      </main>

      {/* ── MODALES ── */}

      {showProfileModal && (
        <Suspense fallback={null}>
          <ProfileModal
            currentUserId={userId}
            onClose={() => setShowProfileModal(false)}
            onProfileUpdated={handleProfileUpdated}
          />
        </Suspense>
      )}

      {/* Modal crear post */}
      <AnimatePresence>
        {showNewPostModal && (
          <motion.div
            key="create-post-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.82)" }}
            onClick={() => setShowNewPostModal(false)}
          >
            <motion.div
              key="create-post-modal"
              className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${isDark ? "bg-gray-950 border border-white/10" : "bg-white border border-gray-200"}`}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)" }} />
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    <Send size={14} className="text-white -rotate-12" />
                  </div>
                  <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>{t("create_post")}</h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => setShowNewPostModal(false)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                >
                  <X size={16} />
                </motion.button>
              </div>

              <div className="px-6">
                <div className={`relative rounded-2xl overflow-hidden ${isDark ? "bg-gray-900 ring-1 ring-white/10 focus-within:ring-violet-500" : "bg-gray-50 ring-1 ring-gray-200 focus-within:ring-violet-400"}`}>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className={`w-full h-32 p-4 resize-none focus:outline-none bg-transparent text-sm leading-relaxed ${isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`}
                    placeholder={t("whats_happening")}
                    maxLength={maxChars}
                    autoFocus
                  />
                  <div className={`absolute bottom-3 right-3 text-xs font-medium tabular-nums ${newPostContent.length > maxChars * 0.85 ? "text-red-400" : isDark ? "text-gray-600" : "text-gray-400"}`}>
                    {newPostContent.length}/{maxChars}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {imagePreview && (
                  <motion.div className="px-6 mt-4" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                    <div className="relative group rounded-2xl overflow-hidden shadow-lg max-h-60">
                      <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-60" />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setNewPostImage(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} className="text-white" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {postError && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="mx-6 mt-3 px-3 py-2 rounded-xl bg-red-900/60 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">⚠ {postError}</span>
                    <button onClick={() => setPostError(null)} className="flex-shrink-0 text-red-400 hover:text-red-200"><X size={13} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 px-6 py-5 mt-2">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${isDark ? "text-gray-400 hover:text-violet-400 hover:bg-violet-500/10" : "text-gray-500 hover:text-violet-600 hover:bg-violet-50"}`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewPostImage(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                      // Reset el input para poder volver a seleccionar el mismo archivo
                      e.target.value = "";
                    }}
                  />
                  <ImageIcon size={16} />
                  <span className="hidden sm:inline">{t("add_image") || "Imagen"}</span>
                </label>
                <div className="flex-1" />
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowNewPostModal(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isDark ? "text-gray-300 bg-white/5 hover:bg-white/10" : "text-gray-600 bg-gray-100 hover:bg-gray-200"}`}
                >
                  {t("cancel")}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isPosting}
                  className="relative px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: newPostContent.trim() ? "0 0 20px rgba(139,92,246,0.4)" : "none",
                  }}
                >
                  <span className="relative flex items-center gap-2">
                    {isPosting ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <Send size={14} className="-rotate-12" />
                    )}
                    {t("publish")}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inbox */}
      <AnimatePresence>
        {showInbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
            onClick={() => setShowInbox(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="w-full max-w-md bg-[#111113] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {userId && (
                <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-500 text-sm">Cargando...</div>}>
                  <Inbox
                    isOpen={true}
                    onClose={() => setShowInbox(false)}
                    currentUserId={userId}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    newMessageAttachments={newMessageAttachments}
                    setNewMessageAttachments={setNewMessageAttachments}
                    selectedChatUserId={selectedChatUserId}
                    setSelectedChatUserId={setSelectedChatUserId}
                    onSendMessage={handleSendMessage}
                  />
                </Suspense>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notificaciones */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            key="notif-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              key="notif-modal"
              className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${isDark ? "bg-[#111113] border border-white/[0.08]" : "bg-white border border-gray-200/80"}`}
              style={{ maxHeight: "85vh" }}
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)" }} />

              <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-white/[0.07]" : "border-gray-100"}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                    <Bell size={14} className="text-white" />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{t("notifications") || "Notificaciones"}</h2>
                    {unreadNotifCount > 0 && <p className="text-xs text-violet-400 font-medium">{unreadNotifCount} sin leer</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <button onClick={markAllNotifsRead} className="text-xs font-medium text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg hover:bg-violet-500/10">
                      Marcar todo
                    </button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowNotifications(false)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                  >
                    <X size={15} />
                  </motion.button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="text-3xl mb-2">🔔</span>
                    <p className="text-sm text-gray-500">Sin notificaciones</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-5 py-3.5 border-b transition-colors ${
                        isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-gray-50 hover:bg-gray-50"
                      } ${!notif.read ? (isDark ? "bg-violet-500/[0.04]" : "bg-violet-50/50") : ""}`}
                    >
                      <div className="relative flex-shrink-0">
                        {notif.avatar ? (
                          <img src={notif.avatar} className="w-9 h-9 rounded-full object-cover" alt={notif.user} />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                            {(notif.user || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${isDark ? "bg-[#111113]" : "bg-white"}`}>
                          {notifIcon(notif.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                          <span className="font-semibold">{notif.user}</span>{" "}
                          <span className={isDark ? "text-gray-400" : "text-gray-600"}>{notif.message}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.time}</p>
                      </div>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── TOKEN MINI-APP OVERLAY ── */}
      <AnimatePresence>
        {showTokenApp && (
          <motion.div
            key="token-app-overlay"
            className="fixed inset-0 z-50 flex flex-col"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            style={{ background: "#0d0e14" }}
          >
            {/* Barra superior con botón cerrar */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span className="text-white font-semibold text-sm flex items-center gap-2">
                🪙 Token Market
              </span>
              <motion.button
                onClick={() => setShowTokenApp(false)}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={16} />
              </motion.button>
            </div>

            {/* iframe de la token app — solo se monta tras el delay de 10s */}
            {!tokenPreloaded ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                <p className="text-gray-400 text-sm">Preparando Token Market…</p>
              </div>
            ) : TOKEN_APP_URL ? (
              <iframe
                ref={tokenIframeRef}
                src={TOKEN_APP_URL}
                className="flex-1 w-full border-0"
                allow="camera; microphone; payment"
                title="Token Market"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center px-6">
                <span className="text-4xl">🪙</span>
                <p className="text-white font-semibold text-lg">Token Market</p>
                <p className="text-gray-400 text-sm max-w-xs">
                  Define <code className="bg-white/10 px-1 rounded text-violet-300">VITE_TOKEN_APP_URL</code> en tu{" "}
                  <code className="bg-white/10 px-1 rounded text-violet-300">.env</code> con la URL donde está desplegada la token app.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
