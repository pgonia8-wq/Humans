import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useContext,
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
} from "lucide-react";

// Fix 3: lazy load de componentes que solo se usan bajo demanda (modales)
// No entran en el bundle inicial — se descargan cuando el usuario los abre
const ProfileModal = lazy(() => import("../components/ProfileModal"));
const Inbox = lazy(() => import("./chat/Inbox"));
// Fix 3b: AutonomousGrowthBrain se renderiza inmediatamente pero no es crítico para el primer paint
const AutonomousGrowthBrain = lazy(() => import("../components/AutonomousGrowthBrain"));

const PAGE_SIZE = 8;

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
    case "like":
      return <Heart size={13} className="text-pink-500" />;
    case "comment":
      return <MessageCircle size={13} className="text-blue-400" />;
    case "follow":
      return <UserPlus size={13} className="text-green-400" />;
    case "mention":
      return <AtSign size={13} className="text-violet-400" />;
    case "repost":
      return <Repeat2 size={13} className="text-emerald-400" />;
    case "verified":
      return <CheckCircle2 size={13} className="text-sky-400" />;
    default:
      return <Bell size={13} className="text-gray-400" />;
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
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [newMessageAttachments, setNewMessageAttachments] = useState<File[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const { theme, toggleTheme, username } = useContext(ThemeContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxChars =
    profile?.tier === "premium+"
      ? 10000
      : profile?.tier === "premium"
      ? 4000
      : 280;

  const isDark = theme === "dark";

  const fetchPosts = useCallback(
    async (reset = false) => {
      if (!hasMore && !reset) return;
      try {
        setLoading(true);
        const from = reset ? 0 : page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("timestamp", { ascending: false })
          .range(from, to);

        const newPosts = data || [];
        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        setHasMore(newPosts.length === PAGE_SIZE);

        if (reset) setPage(1);
        else setPage((prev) => prev + 1);
      } catch (err: any) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    },
    [hasMore, page],
  );

  // Fix 4: leer perfil primero (SELECT), solo hacer upsert si no existe
  // Antes: upsert (escritura) en CADA carga → ~300-500ms de latencia bloqueante
  // Ahora: SELECT rápido para usuarios existentes, upsert solo para nuevos
  const fetchOrUpsertProfile = useCallback(async () => {
    if (!userId) return;
    setProfileLoading(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (existing) {
        setProfile(existing);
        return;
      }

      // Solo llega aquí si el perfil no existe (usuarios nuevos)
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: username || `user_${userId.slice(0, 8)}`,
            wallet: wallet || null,
            verified: verified,
            verified_at: new Date().toISOString(),
          },
          { onConflict: ["id"], returning: "representation" },
        )
        .maybeSingle();
      if (error) throw error;
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
        .limit(50);
      if (data) setNotifications(data as Notification[]);
    } catch (err) {
      console.error("[HOME] Error fetching notifications:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchOrUpsertProfile();
    fetchPosts(true);
    fetchNotifications();
  }, [userId, fetchOrUpsertProfile]);

  // Fix 2: canal realtime de posts ahora gateado por userId
  // Antes: abría WebSocket en el primer render, antes de que hubiera usuario
  // Ahora: espera a que haya userId para abrir la conexión
       useEffect(() => {
  if (!userId) return;

  const channel = supabase
    .channel("global-posts")

    // ✅ INSERT (único)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => {
        setPosts((prev) => {
          // evitar duplicados
          if (prev.some((p) => p.id === payload.new.id)) {
            return prev;
          }

          // eliminar optimistic si coincide
          const withoutOptimistic = prev.filter(
            (p) =>
              !p.optimistic ||
              p.content !== payload.new.content
          );

          const updated = [payload.new, ...withoutOptimistic];

          // mantener orden
          return updated.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() -
              new Date(a.timestamp).getTime()
          );
        });
      }
    )

    // ✅ UPDATE
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "posts" },
      (payload) => {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === payload.new.id ? payload.new : p
          )
        );
      }
    )

    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 150) fetchPosts();
    };
    const el = containerRef.current;
    el?.addEventListener("scroll", handleScroll);
    return () => el?.removeEventListener("scroll", handleScroll);
  }, [fetchPosts]);

  const loadUnread = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("conversation_unread_counts")
      .select("unread")
      .eq("receiver_id", userId);

    const total = data?.reduce((sum: number, r: any) => sum + r.unread, 0) || 0;
    setUnreadMessages(total);
    setUnreadTotal(total);
  };

  useEffect(() => {
    if (!userId) return;
    loadUnread();

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

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const handleCreatePost = async () => {
  if (isPosting) return;
  if (!newPostContent.trim()) {
    setPostError(t("write_before_posting"));
    return;
  }
  if (!userId) return;

  setIsPosting(true);
  setPostError(null);

  let imageUrl = null;
  let tempId = "temp-" + Date.now(); // 👈 moverlo arriba para rollback

  try {
    // 🖼️ 1. subir imagen primero
    if (newPostImage) {
      const fileExt = newPostImage.name.split(".").pop() || "png";
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, newPostImage);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    // ✅ 2. OPTIMISTIC UI (YA con imagen correcta)
    const tempPost = {
      id: tempId,
      user_id: userId,
      content: newPostContent,
      image_url: imageUrl,
      timestamp: new Date().toISOString(),
      optimistic: true,
    };

    setPosts((prev) => [tempPost, ...prev]);

    // 🚀 3. backend
    const { error } = await supabase.functions.invoke("publish-post-user", {
      body: {
        content: newPostContent,
        image_url: imageUrl,
      },
    });

    if (error) throw error;

    // 🧹 limpiar UI
    setShowNewPostModal(false);
    setNewPostContent("");
    setNewPostImage(null);
    setImagePreview(null);

  } catch (err: any) {
    console.error("Error creando post", err);
    setPostError(err.message);

    // 🔥 rollback limpio
    setPosts((prev) => prev.filter((p) => p.id !== tempId));

  } finally {
    setIsPosting(false);
  }
};
  const handleSendMessage = async () => {
    if (!newMessage.trim() && newMessageAttachments.length === 0) return;

    try {
      let attachmentsUrls: string[] = [];

      for (const file of newMessageAttachments) {
        const key = `${userId}-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(key, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("message-attachments")
          .getPublicUrl(key);
        attachmentsUrls.push(data.publicUrl);
      }

      if (!selectedChatUserId) {
        setPostError("Selecciona un chat antes de enviar mensaje");
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: selectedChatUserId,
        content: newMessage,
        attachments: attachmentsUrls,
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;

      setNewMessage("");
      setNewMessageAttachments([]);
      loadUnread();
    } catch (err: any) {
      console.error("Error enviando mensaje", err);
      setPostError(err.message);
    }
  };

  const handleProfileUpdated = (updatedProfile: {
    id: string;
    avatar_url?: string;
  }) => {
    if (updatedProfile.avatar_url) {
      setProfile((prev: any) => ({
        ...prev,
        avatar_url: updatedProfile.avatar_url,
      }));
      setPosts((prev) =>
        prev.map((post) =>
          post.user_id === updatedProfile.id
            ? { ...post, avatar_url: updatedProfile.avatar_url }
            : post,
        ),
      );
    }
  };

  const markAllNotifsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleOpenNotifications = () => setShowNotifications(true);
  const handleCloseNotifications = () => setShowNotifications(false);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen overflow-y-auto overflow-x-hidden ${
        isDark ? "bg-[#09090b] text-white" : "bg-[#fafafa] text-black"
      }`}
    >
      {/* Fix 3b: AutonomousGrowthBrain en Suspense — no bloquea el primer paint */}
      <Suspense fallback={null}>
        <AutonomousGrowthBrain />
      </Suspense>

      {/* ── HEADER FLOTANTE ── */}
      <header
        className={`fixed top-3 left-3 right-3 z-30 flex items-center justify-between px-4 py-2.5 rounded-2xl border ${
          isDark
            ? "bg-[#09090b]/85 border-white/[0.09]"
            : "bg-white/90 border-black/[0.07]"
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
          src="https://vtjqfzpfehfofamhowjz.supabase.co/storage/v1/object/public/avatars/logoh-carbono.png"
          className="w-10 h-10 object-contain rounded-xl"
          alt="Humans Logo"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        />

        {/* Botones centrales */}
        <div className="flex items-center gap-1.5">
          {/* Nuevo Post */}
          <motion.button
            onClick={() => setShowNewPostModal(true)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: "0 0 18px rgba(139,92,246,0.35)",
            }}
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
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "text-gray-300 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
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
              onClick={handleOpenNotifications}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
                isDark
                  ? "text-gray-300 hover:text-white hover:bg-white/10"
                  : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
              }`}
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
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
              isDark
                ? "text-gray-300 hover:text-white hover:bg-white/10"
                : "text-gray-600 hover:text-gray-900 hover:bg-black/5"
            }`}
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

          {/* Idioma */}
          <motion.button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className={`h-9 px-3 flex items-center gap-1.5 rounded-full text-xs font-semibold transition-colors ${
              isDark
                ? "text-gray-300 hover:text-white bg-white/5 hover:bg-white/10"
                : "text-gray-600 hover:text-gray-900 bg-black/[0.04] hover:bg-black/[0.08]"
            }`}
          >
            <Globe size={13} />
            {language.toUpperCase()}
          </motion.button>
        </div>

        {/* Avatar */}
        <motion.div
          className={`w-9 h-9 rounded-full overflow-hidden cursor-pointer ring-2 transition-all ${
            isDark
              ? "ring-white/10 hover:ring-violet-500/60"
              : "ring-black/10 hover:ring-violet-400/60"
          }`}
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
          posts={posts}
          loading={loading}
          error={error}
          currentUserId={userId}
          userTier={profile?.tier || "free"}
          onUpgradeSuccess={() => fetchOrUpsertProfile()}
        />
      </main>

      {/* ── MODAL PERFIL — lazy, solo se descarga cuando el usuario lo abre ── */}
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
              className={
                "relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden " +
                (isDark ? "bg-gray-950 border border-white/10" : "bg-white border border-gray-200")
              }
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
                style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)" }}
              />
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    <Send size={14} className="text-white -rotate-12" />
                  </div>
                  <h2 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                    {t("create_post")}
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => setShowNewPostModal(false)}
                  className={
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors " +
                    (isDark
                      ? "text-gray-400 hover:text-white hover:bg-white/10"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")
                  }
                >
                  <X size={16} />
                </motion.button>
              </div>

              <div className="px-6">
                <div
                  className={
                    "relative rounded-2xl overflow-hidden " +
                    (isDark
                      ? "bg-gray-900 ring-1 ring-white/10 focus-within:ring-violet-500"
                      : "bg-gray-50 ring-1 ring-gray-200 focus-within:ring-violet-400")
                  }
                >
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className={
                      "w-full h-32 p-4 resize-none focus:outline-none bg-transparent text-sm leading-relaxed " +
                      (isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400")
                    }
                    placeholder={t("whats_happening")}
                    maxLength={maxChars}
                  />
                  <div
                    className={
                      "absolute bottom-3 right-3 text-xs font-medium tabular-nums " +
                      (newPostContent.length > maxChars * 0.85
                        ? "text-red-400"
                        : isDark ? "text-gray-600" : "text-gray-400")
                    }
                  >
                    {newPostContent.length}/{maxChars}
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {imagePreview && (
                  <motion.div
                    className="px-6 mt-4"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="relative group rounded-2xl overflow-hidden shadow-lg max-h-60">
                      <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-60 transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setNewPostImage(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="mx-6 mt-3 px-3 py-2 rounded-xl bg-red-900/60 border border-red-500/40 text-xs text-red-300 flex items-center justify-between gap-2"
                  >
                    <span className="truncate">⚠ {postError}</span>
                    <button
                      onClick={() => setPostError(null)}
                      className="flex-shrink-0 text-red-400 hover:text-red-200"
                    >
                      <X size={13} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 px-6 py-5 mt-2">
                <label
                  className={
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer " +
                    (isDark
                      ? "text-gray-400 hover:text-violet-400 hover:bg-violet-500/10"
                      : "text-gray-500 hover:text-violet-600 hover:bg-violet-50")
                  }
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewPostImage(e.target.files[0]);
                        setImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                  <ImageIcon size={16} />
                  <span className="hidden sm:inline">{t("add_image") || "Imagen"}</span>
                </label>
                <div className="flex-1" />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowNewPostModal(false)}
                  className={
                    "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors " +
                    (isDark ? "text-gray-300 bg-white/5 hover:bg-white/10" : "text-gray-600 bg-gray-100 hover:bg-gray-200")
                  }
                >
                  {t("cancel")}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isPosting}
                  className="relative px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: newPostContent.trim() ? "0 0 20px rgba(139,92,246,0.4)" : "none",
                    transition: "box-shadow 0.3s",
                  }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)" }}
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.5 }}
                  />
                  <span className="relative flex items-center gap-2">
                    <Send size={14} className="-rotate-12" />
                    {t("publish")}
                  </span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INBOX — lazy, solo se descarga cuando el usuario lo abre ── */}
      <AnimatePresence>
        {showInbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
            onClick={() => setShowInbox(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
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

      {/* ── MODAL NOTIFICACIONES ── */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            key="notif-overlay"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.6)" }}
            onClick={handleCloseNotifications}
          >
            <motion.div
              key="notif-modal"
              className={`relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
                isDark
                  ? "bg-[#111113] border border-white/[0.08]"
                  : "bg-white border border-gray-200/80"
              }`}
              style={{ maxHeight: "85vh" }}
              initial={{ opacity: 0, y: 60, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className={`w-10 h-1 rounded-full ${isDark ? "bg-white/20" : "bg-black/10"}`} />
              </div>

              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #6366f1)" }}
              />

              <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-white/[0.07]" : "border-gray-100"}`}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                  >
                    <Bell size={14} className="text-white" />
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
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={markAllNotifsRead}
                      className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors px-2 py-1 rounded-lg hover:bg-violet-500/10"
                    >
                      Marcar todo
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    onClick={handleCloseNotifications}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isDark
                        ? "text-gray-400 hover:text-white hover:bg-white/10"
                        : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <X size={15} />
                  </motion.button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                      <Bell size={24} className={isDark ? "text-gray-600" : "text-gray-300"} />
                    </div>
                    <p className={`text-sm font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {t("no_notifications") || "Sin notificaciones"}
                    </p>
                  </div>
                ) : (
                  <ul className="py-1">
                    {notifications.map((notif, i) => (
                      <motion.li
                        key={notif.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.22 }}
                        onClick={() =>
                          setNotifications((prev) =>
                            prev.map((n) => n.id === notif.id ? { ...n, read: true } : n)
                          )
                        }
                        className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                          !notif.read
                            ? isDark
                              ? "bg-violet-500/[0.06] hover:bg-violet-500/[0.1]"
                              : "bg-violet-50/80 hover:bg-violet-50"
                            : isDark
                            ? "hover:bg-white/[0.03]"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="relative flex-shrink-0 mt-0.5">
                          <img
                            src={notif.avatar}
                            alt={notif.user}
                            className="w-9 h-9 rounded-full object-cover"
                            style={{ background: isDark ? "#27272a" : "#e4e4e7" }}
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                              isDark ? "border-[#111113]" : "border-white"
                            } bg-[#111113]`}
                          >
                            {notifIcon(notif.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-snug ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                            <span className="font-semibold">{notif.user}</span>{" "}
                            {notif.message}
                          </p>
                          <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                            {notif.time}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-2" />
                        )}
                      </motion.li>
                    ))}
                  </ul>
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
