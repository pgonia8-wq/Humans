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

import useBodyScrollLock from "../lib/useBodyScrollLock";
import { supabase } from "../supabaseClient";
import { MiniKit, Tokens, tokenToDecimals, VerificationLevel } from "@worldcoin/minikit-js";
import FeedPage from "./FeedPage";
import { ThemeContext } from "../lib/ThemeContext";
import { LanguageContext } from "../LanguageContext";
import ActionButton from "../components/ActionButton";
import NotificationBanner from "../components/NotificationBanner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImageIcon,
  X,
  Send,
  Bell,
  Mail,
  Plus,
  Heart,
  MessageCircle,
  UserPlus,
  AtSign,
  Repeat2,
  CheckCircle2,
  BarChart2,
} from "lucide-react";


// Lazy load — no entran en el bundle inicial
const ProfileModal = lazy(() => import("../components/ProfileModal"));
const Inbox = lazy(() => import("./chat/Inbox"));
const GlobalChatRoom = lazy(() => import("./chat/GlobalChatRoom"));
const AutonomousGrowthBrain = lazy(() => import("../components/AutonomousGrowthBrain"));
const ScannerBrain = lazy(() => import("../components/ScannerBrain"));
// Shell nuevo (estética token/): drop-in replacement de TradeCenterPage.
// Mantiene API idéntica de props. El antiguo queda en disco como fallback.
const TradeCenterPage = lazy(() => import("../trade-shell/TradeShell"));

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
  verifyOrb: () => Promise<{ success: boolean; proof?: any }>;
  /** Single source of truth desde App: profile.verification_level === "orb" */
  isOrbVerified: boolean;
  /** Callback para sincronizar el estado global tras verificación exitosa */
  onOrbVerifiedChange: (ok: boolean) => void;
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
    case "follow":    return <UserPlus size={13} className="text-emerald-400" />;
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
  verifyOrb,
  isOrbVerified,
  onOrbVerifiedChange,
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

  // ── Chat header ──
  const [hasChatAccessHeader, setHasChatAccessHeader] = useState(false);
  const [checkingAccessHeader, setCheckingAccessHeader] = useState(true);
  const [showGlobalChatHeader, setShowGlobalChatHeader] = useState(false);
  const [headerChatLoading, setHeaderChatLoading] = useState(false);

  // ── Notificaciones ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTradeCenter, setShowTradeCenter] = useState(false);

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
        .select("id, username, avatar_url, verified, tier, wallet, verification_level")
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
        .eq("deleted_flag", false)
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
  // INICIALIZACIÓN al tener userId
  // ─────────────────────────────────────────────
  // Posts públicos — cargan de inmediato sin necesitar userId
    useEffect(() => {
      fetchGlobalPosts();
    }, []);

    useEffect(() => {
      if (!userId) return;
      fetchOrUpsertProfile();
      fetchNotifications();
      loadUnread();
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
  // CREAR POST
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

      // 3. Crear post via API (usa service_role, evita RLS)
      const createRes = await fetch("/api/createPost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          content: newPostContent,
          image_url: imageUrl,
        }),
      });
      let createData: any = {};
      try {
        createData = await createRes.json();
      } catch {
        throw new Error(`Error del servidor (${createRes.status}): respuesta inválida`);
      }
      if (!createRes.ok) {
        throw new Error(createData.error || "Error al publicar");
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

  // ── Verifica acceso al chat global desde header ──
  useEffect(() => {
    const checkChatAccess = async () => {
      if (!userId) { setCheckingAccessHeader(false); return; }
      try {
        const { data } = await supabase
          .from("subscriptions")
          .select("product")
          .eq("user_id", userId)
          .in("product", ["chat_classic", "chat_gold"])
          .limit(1);
        if (data && data.length > 0) setHasChatAccessHeader(true);
      } catch {}
      setCheckingAccessHeader(false);
    };
    checkChatAccess();
  }, [userId]);

  const handleHeaderChat = async () => {
    if (!userId || checkingAccessHeader) return;
    if (hasChatAccessHeader) { setShowGlobalChatHeader(true); return; }
    if (!MiniKit.isInstalled()) return;
    setHeaderChatLoading(true);
    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: crypto.randomUUID(),
        to: import.meta.env.VITE_PAYMENT_RECEIVER || "",
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: t("chat_exclusivo") || "Chat Exclusivo",
      });
      if (payRes?.finalPayload?.status === "success") {
        const verifyRes = await fetch("/api/verifyPayment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: payRes.finalPayload.transaction_id, userId, action: "chat_classic" }),
        });
        if (verifyRes.ok) { setHasChatAccessHeader(true); setShowGlobalChatHeader(true); }
      }
    } catch {}
    finally { setHeaderChatLoading(false); }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  // iOS scroll-bounce fix: bloquea body cuando hay modales abiertos
  useBodyScrollLock(
    showNewPostModal ||
    showProfileModal ||
    showInbox ||
    showNotifications ||
    showGlobalChatHeader ||
    showTradeCenter ||
    selectedChatUserId !== null
  );

  return (
    <div
      className={`min-h-screen overflow-y-auto overflow-x-hidden ${isDark ? "text-white" : "text-black"}`}
      style={isDark ? {
        background: [
          "radial-gradient(ellipse at 12% 18%, rgba(99,102,241,0.22) 0%, transparent 52%)",
          "radial-gradient(ellipse at 88% 72%, rgba(168,85,247,0.18) 0%, transparent 52%)",
          "radial-gradient(ellipse at 62% 10%, rgba(6,182,212,0.14) 0%, transparent 44%)",
          "radial-gradient(ellipse at 35% 88%, rgba(16,185,129,0.10) 0%, transparent 44%)",
          "#06060d",
        ].join(","),
      } : {
        background: [
          "radial-gradient(ellipse at 12% 18%, rgba(99,102,241,0.12) 0%, transparent 52%)",
          "radial-gradient(ellipse at 88% 72%, rgba(168,85,247,0.09) 0%, transparent 52%)",
          "radial-gradient(ellipse at 62% 10%, rgba(6,182,212,0.08) 0%, transparent 44%)",
          "#f2f2fb",
        ].join(","),
      }}
    >
      {userId && <NotificationBanner userId={userId} />}
      <Suspense fallback={null}>
        <AutonomousGrowthBrain />
      </Suspense>
      <Suspense fallback={null}>
        <ScannerBrain userId={userId} />
      </Suspense>

      {/* ── BANNER VERIFICACIÓN ── */}
      {!verified && (
        <div style={{
          position: "fixed",
          bottom: 80,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
          pointerEvents: "none",
        }}>
          <button
            onClick={verifyUser}
            disabled={verifying}
            style={{
              pointerEvents: "auto",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "15px 28px",
              fontSize: 15,
              fontWeight: 700,
              cursor: verifying ? "not-allowed" : "pointer",
              boxShadow: "0 6px 28px rgba(99,102,241,0.50)",
              opacity: verifying ? 0.7 : 1,
              width: "100%",
              maxWidth: 360,
              letterSpacing: "0.01em",
            }}
          >
            {verifying ? "Verificando..." : "✦ Verificate con World ID"}
          </button>
        </div>
      )}

      {/* ── HEADER FLOTANTE ── */}
      <header
        className={`fixed top-3 left-3 right-3 z-30 flex items-center gap-1.5 px-2 py-2 rounded-2xl border ${
          isDark ? "bg-[#0a0a0a]/92 border-white/[0.09]" : "bg-white/95 border-black/[0.07]"
        }`}
        style={{
          backdropFilter: "blur(36px)",
          WebkitBackdropFilter: "blur(36px)",
          boxShadow: isDark
            ? "0 25px 50px -12px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.40)"
            : "0 25px 50px -12px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,1), inset 0 -1px 0 rgba(0,0,0,0.04)",
        }}
      >
        {/* ── BOTÓN +Post ── */}
        <motion.button
          onClick={() => setShowNewPostModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 h-10 flex items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
            color: "#ffffff",
          }}
        >
          <Plus size={17} />
        </motion.button>

        {/* ── BOTÓN Mail ── */}
        <div className="relative flex-1">
          <motion.button
            onClick={() => { setShowInbox(true); setUnreadMessages(0); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full h-10 flex items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
              color: "#ffffff",
            }}
          >
            <Mail size={17} />
          </motion.button>
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </div>

        {/* ── BOTÓN Campana ── */}
        <div className="relative flex-1">
          <motion.button
            onClick={() => { setShowNotifications(true); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full h-10 flex items-center justify-center rounded-xl"
            style={{
              background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
              color: "#ffffff",
            }}
          >
            <Bell size={17} />
          </motion.button>
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
            </span>
          )}
        </div>

        {/* ── BOTÓN Chat global ── */}
        <motion.button
          onClick={handleHeaderChat}
          disabled={headerChatLoading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 h-10 flex items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
            color: "#ffffff",
          }}
        >
          {headerChatLoading
            ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <MessageCircle size={17} />
          }
        </motion.button>

        {/* ── BOTÓN Trade ── */}
        <motion.button
          onClick={() => setShowTradeCenter(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 h-10 flex items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(160deg, #2c2c2c 0%, #1a1a1a 45%, #0f0f0f 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.45)",
            color: "#ffffff",
          }}
        >
          <BarChart2 size={17} />
        </motion.button>

        {/* ── AVATAR / Perfil ── */}
        <motion.button
          onClick={() => setShowProfileModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden"
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              {(profile?.username || username || "H")[0].toUpperCase()}
            </div>
          )}
        </motion.button>
      </header>

      {/* ── FEED ── */}
      <main className="pt-20 pb-8">
        <FeedPage
          posts={mergedPosts}
          loading={globalLoading}
          currentUserId={userId}
          userTier={profile?.tier || "free"}
          onUpgradeSuccess={fetchOrUpsertProfile}
          onLoadMoreGlobal={fetchGlobalPosts}
          globalHasMore={globalHasMore}
        />
      </main>

      {/* ── MODAL NUEVO POST ── */}
      <AnimatePresence>
        {showNewPostModal && (
          <motion.div
            key="new-post-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.65)" }}
            onClick={() => { setShowNewPostModal(false); setPostError(null); }}
          >
            <motion.div
              key="new-post-modal"
              className={`relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
                isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-100"
              }`}
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gradient accent top */}
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, #6366f1, #a855f7, #a78bfa)" }} />

              {/* Header */}
              <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-white/[0.07]" : "border-gray-100"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                    <Send size={15} className="text-white" />
                  </div>
                  <h2 className={`text-base font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                    {t("new_post") || "Nueva publicación"}
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowNewPostModal(false); setPostError(null); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <X size={15} />
                </motion.button>
              </div>

              {/* Body */}
              <div className="px-5 pt-4 pb-3">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  maxLength={maxChars}
                  placeholder={t("whats_on_mind") || "¿Qué está pasando?"}
                  rows={4}
                  className={`w-full resize-none text-sm leading-relaxed focus:outline-none bg-transparent ${
                    isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"
                  }`}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${newPostContent.length > maxChars * 0.9 ? "text-red-400" : isDark ? "text-gray-700" : "text-gray-300"}`}>
                    {newPostContent.length}/{maxChars}
                  </span>
                </div>

                {/* Image preview */}
                {imagePreview && (
                  <div className="relative mt-3 rounded-2xl overflow-hidden">
                    <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-2xl" />
                    <button
                      onClick={() => { setNewPostImage(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {postError && (
                  <p className="text-xs text-red-400 mt-2 text-center">{postError}</p>
                )}
              </div>

              {/* Footer actions */}
              <div className={`flex items-center justify-between px-5 py-3 border-t ${isDark ? "border-white/[0.07]" : "border-gray-100"}`}>
                <label className={`cursor-pointer p-2 rounded-xl transition-colors ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}>
                  <ImageIcon size={18} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setNewPostImage(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreatePost}
                  disabled={isPosting || !newPostContent.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 transition"
                  style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
                >
                  {isPosting ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {isPosting ? (t("publishing") || "Publicando...") : (t("publish") || "Publicar")}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {showProfileModal && userId && (
          <motion.div
            key="profile-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.65)" }}
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              key="profile-modal"
              className="relative w-full sm:max-w-sm"
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Suspense fallback={
                <div className="h-64 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#a855f7", borderRightColor: "#6366f1" }} />
                </div>
              }>
                <ProfileModal
                  userId={userId}
                  onClose={() => setShowProfileModal(false)}
                  onProfileUpdated={handleProfileUpdated}
                  currentUserId={userId}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inbox */}
      <AnimatePresence>
        {showInbox && (
          <motion.div
            key="inbox-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.65)" }}
            onClick={() => setShowInbox(false)}
          >
            <motion.div
              key="inbox-modal"
              className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
                isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-100"
              }`}
              style={{ maxHeight: "85vh" }}
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {userId && (
                <Suspense fallback={
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#a855f7", borderRightColor: "#6366f1" }} />
                  </div>
                }>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.65)" }}
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              key="notif-modal"
              className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
                isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-100"
              }`}
              style={{ maxHeight: "85vh" }}
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top gradient accent */}
              <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, #6366f1, #a855f7, #a78bfa)" }} />

              {/* Header */}
              <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-white/[0.07]" : "border-gray-100"}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                    <Bell size={15} className="text-white" />
                  </div>
                  <div>
                    <h2 className={`text-base font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                      {t("notifications") || "Notificaciones"}
                    </h2>
                    {unreadNotifCount > 0 && (
                      <p className="text-xs text-violet-400 font-medium">{unreadNotifCount} sin leer</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={markAllNotifsRead}
                      className="text-xs font-medium text-violet-400 hover:text-violet-300 px-2 py-1 rounded-lg hover:bg-violet-500/10 transition"
                    >
                      Marcar todo
                    </button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowNotifications(false)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <X size={15} />
                  </motion.button>
                </div>
              </div>

              {/* Notifications list */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))", border: "1px solid rgba(99,102,241,0.18)" }}
                    >
                      <Bell size={22} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isDark ? "text-gray-400" : "text-gray-600"}`}>Sin notificaciones</p>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Las actividades aparecerán aquí</p>
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-5 py-3.5 border-b transition-colors ${
                        isDark ? "border-white/[0.04] hover:bg-white/[0.02]" : "border-gray-50 hover:bg-gray-50/70"
                      } ${!notif.read ? (isDark ? "bg-violet-500/[0.04]" : "bg-violet-50/40") : ""}`}
                    >
                      <div className="relative flex-shrink-0">
                        {notif.avatar ? (
                          <img src={notif.avatar} className="w-9 h-9 rounded-full object-cover" alt={notif.user} />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
                          >
                            {(notif.user || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                          isDark ? "bg-[#111113]" : "bg-white"
                        }`}>
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
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: "#a855f7" }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GLOBAL CHAT (desde header) ── */}
      {showGlobalChatHeader && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center"
          onClick={() => setShowGlobalChatHeader(false)}
        >
          <div
            className="w-full h-full max-w-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center w-full h-full gap-3">
                <div className="w-10 h-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
              </div>
            }>
              <GlobalChatRoom
                isOpen={true}
                currentUserId={userId}
                onClose={() => setShowGlobalChatHeader(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
        {/* ── TRADE CENTER OVERLAY ── */}
        <Suspense fallback={null}>
          <TradeCenterPage
            isOpen={showTradeCenter}
            onClose={() => setShowTradeCenter(false)}
            userId={userId ?? ""}
            walletAddress={wallet}
            verifyOrb={verifyOrb}
            isOrbVerified={isOrbVerified}
            onOrbVerifiedChange={onOrbVerifiedChange}
          />
        </Suspense>
      </div>
    );
  };

export default HomePage;
