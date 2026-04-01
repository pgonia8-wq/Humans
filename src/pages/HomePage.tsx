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
  Sparkles,
} from "lucide-react";

const ProfileModal = lazy(() => import("../components/ProfileModal"));
const Inbox = lazy(() => import("./chat/Inbox"));
const AutonomousGrowthBrain = lazy(() => import("../components/AutonomousGrowthBrain"));

interface HomePageProps {
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

const HomePage: React.FC<HomePageProps> = ({
  userId,
  wallet,
  verified,
  error,
  verifying,
  setUserId,
  verifyUser,
}) => {
  const [optimisticPosts, setOptimisticPosts] = useState<any[]>([]);
  const [globalPosts, setGlobalPosts] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [showInbox, setShowInbox] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageAttachments, setNewMessageAttachments] = useState<File[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const mergedPosts = useMemo(() => {
    const map = new Map();
    [...optimisticPosts, ...globalPosts].forEach((p) => { map.set(p.id, p); });
    return Array.from(map.values());
  }, [optimisticPosts, globalPosts]);

  const { theme, toggleTheme, username } = useContext(ThemeContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const isDark = theme === "dark";

  const maxChars =
    profile?.tier === "premium+" ? 10000
    : profile?.tier === "premium" ? 4000
    : 280;

  const charPercent = Math.min((newPostContent.length / maxChars) * 100, 100);
  const charWarning = newPostContent.length > maxChars * 0.85;

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
      setGlobalPosts((prev) => reset ? newPosts : [...prev, ...newPosts]);
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

  useEffect(() => {
    if (!userId) return;
    fetchOrUpsertProfile();
    fetchNotifications();
    loadUnread();
    setTimeout(() => { fetchGlobalPosts(); }, 10000);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        () => setUnreadMessages((prev) => prev + 1),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // ── CREAR POST: insert directo a Supabase, sin Edge Function ──
  const handleCreatePost = async () => {
    if (isPosting) return;
    if (!newPostContent.trim()) {
      setPostError(t("write_before_posting") || "Escribe algo antes de publicar.");
      return;
    }
    if (!userId) return;

    setIsPosting(true);
    setPostError(null);

    let imageUrl: string | null = null;
    const tempId = `temp-${Date.now()}`;

    try {
      // 1. Subir imagen primero si la hay
      if (newPostImage) {
        const ext = newPostImage.name.split(".").pop()?.toLowerCase() || "jpg";
        const safeName = newPostImage.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileName = `${userId}-${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, newPostImage, { contentType: newPostImage.type });

        if (uploadError) throw new Error(`Error subiendo imagen: ${uploadError.message}`);

        const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      // 2. Optimistic UI
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

      // 3. Insert directo en Supabase (sin Edge Function)
      const { error: insertError } = await supabase.from("posts").insert({
        user_id: userId,
        content: newPostContent.trim(),
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
        username: profile?.username || username || `user_${userId.slice(0, 8)}`,
        avatar_url: profile?.avatar_url || null,
        verified: profile?.verified || false,
        tier: profile?.tier || "free",
      });

      if (insertError) throw new Error(insertError.message);

      // 4. Limpiar UI
      setShowNewPostModal(false);
      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);

    } catch (err: any) {
      console.error("[HOME] Error creando post:", err);
      setPostError(err.message || "Error al publicar");
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

  const handleClosePostModal = () => {
    setShowNewPostModal(false);
    setNewPostContent("");
    setNewPostImage(null);
    setImagePreview(null);
    setPostError(null);
  };

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
        <motion.img
          src="https://vtjqfzpfehfofamhowjz.supabase.co/storage/v1/object/public/avatars/logoh-carbono.png"
          className="w-10 h-10 object-contain rounded-xl"
          alt="Humans Logo"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        />

        <div className="flex items-center gap-1.5">
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
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none shadow-md"
                >
                  {unreadTotal > 99 ? "99+" : unreadTotal}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

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
                  initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-violet-500 text-white text-[10px] font-bold px-1 leading-none shadow-md"
                >
                  {unreadNotifCount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

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

      {/* ── MODAL CREAR POST ── */}
      <AnimatePresence>
        {showNewPostModal && (
          <motion.div
            key="create-post-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(16px)", background: "rgba(0,0,0,0.75)" }}
            onClick={handleClosePostModal}
          >
            <motion.div
              key="create-post-modal"
              className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden"
              initial={{ opacity: 0, y: 60, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: isDark
                  ? "linear-gradient(160deg, #0f0f18 0%, #0c0c14 100%)"
                  : "linear-gradient(160deg, #ffffff 0%, #f8f7ff 100%)",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(99,102,241,0.15)",
                boxShadow: isDark
                  ? "0 -8px 60px rgba(139,92,246,0.12), 0 0 0 1px rgba(255,255,255,0.04)"
                  : "0 -8px 60px rgba(99,102,241,0.10), 0 0 0 1px rgba(99,102,241,0.08)",
              }}
            >
              {/* Barra superior de color */}
              <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #c084fc)" }} />

              {/* Header del modal */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  {/* Avatar propio */}
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-violet-500/30 flex-shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                        {(profile?.username || username || "H")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                      {profile?.username || username || "Usuario"}
                    </p>
                    <p className="text-xs text-violet-400 font-medium flex items-center gap-1">
                      <Sparkles size={10} />
                      {t("create_post") || "Nuevo post"}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={handleClosePostModal}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isDark ? "text-gray-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                >
                  <X size={16} />
                </motion.button>
              </div>

              {/* Área de texto */}
              <div className="px-5 pb-2">
                <div
                  className="relative rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.04)" : "rgba(99,102,241,0.04)",
                    border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(99,102,241,0.12)",
                  }}
                >
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className={`w-full min-h-[120px] p-4 pb-10 resize-none focus:outline-none bg-transparent text-sm leading-relaxed ${isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400"}`}
                    placeholder={t("whats_happening") || "¿Qué está pasando?"}
                    maxLength={maxChars}
                    autoFocus
                  />
                  {/* Barra de progreso de caracteres */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden"
                    style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <motion.div
                      className="h-full rounded-b-2xl"
                      style={{
                        background: charWarning
                          ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                          : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                      }}
                      animate={{ width: `${charPercent}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  {/* Contador de caracteres */}
                  <div className={`absolute bottom-3 right-3 text-[11px] font-semibold tabular-nums transition-colors ${
                    charWarning ? "text-red-400" : isDark ? "text-gray-600" : "text-gray-400"
                  }`}>
                    {newPostContent.length}/{maxChars}
                  </div>
                </div>
              </div>

              {/* Preview de imagen */}
              <AnimatePresence>
                {imagePreview && (
                  <motion.div
                    className="px-5 pb-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="relative group rounded-2xl overflow-hidden shadow-lg ring-1 ring-violet-500/20">
                      <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-56" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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

              {/* Error */}
              <AnimatePresence>
                {postError && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="mx-5 mb-2 px-4 py-2.5 rounded-xl flex items-center justify-between gap-2"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
                  >
                    <span className="text-red-400 text-xs truncate">⚠ {postError}</span>
                    <button onClick={() => setPostError(null)} className="flex-shrink-0 text-red-400/60 hover:text-red-300">
                      <X size={13} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer de acciones */}
              <div
                className="flex items-center gap-2 px-5 py-4"
                style={{
                  borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(99,102,241,0.08)",
                }}
              >
                {/* Adjuntar imagen */}
                <label
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isDark
                      ? "text-gray-400 hover:text-violet-300 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/20"
                      : "text-gray-500 hover:text-violet-600 hover:bg-violet-50 border border-transparent hover:border-violet-200"
                  }`}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setNewPostImage(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                  <ImageIcon size={15} />
                  <span>{t("add_image") || "Imagen"}</span>
                </label>

                <div className="flex-1" />

                {/* Cancelar */}
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleClosePostModal}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isDark ? "text-gray-400 hover:text-white hover:bg-white/8" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {t("cancel") || "Cancelar"}
                </motion.button>

                {/* Publicar */}
                <motion.button
                  whileHover={newPostContent.trim() && !isPosting ? { scale: 1.04 } : {}}
                  whileTap={newPostContent.trim() && !isPosting ? { scale: 0.97 } : {}}
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isPosting}
                  className="relative px-5 py-2 rounded-xl text-sm font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: newPostContent.trim() && !isPosting
                      ? "0 0 24px rgba(139,92,246,0.45), 0 2px 8px rgba(99,102,241,0.3)"
                      : "none",
                  }}
                >
                  {/* Shimmer animado mientras está activo */}
                  {!isPosting && newPostContent.trim() && (
                    <motion.div
                      className="absolute inset-0 -skew-x-12 opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
                    />
                  )}
                  <span className="relative flex items-center gap-2">
                    {isPosting ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <Send size={14} className="-rotate-12" />
                    )}
                    {isPosting ? (t("publishing") || "Publicando…") : (t("publish") || "Publicar")}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INBOX ── */}
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

      {/* ── NOTIFICACIONES ── */}
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
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#111113] flex items-center justify-center">
                          {notifIcon(notif.type)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          <span className="font-semibold">{notif.user}</span>{" "}
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{notif.time}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
