import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from "./FeedPage";
import { ThemeContext } from "../lib/ThemeContext";
import { LanguageContext } from "../LanguageContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";
import Inbox from "./chat/Inbox";
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, X, Send } from "lucide-react";

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

  // -------------------------
  // Fetch posts con scroll y realtime
  // -------------------------
  const fetchPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
  .from("posts")
  .select("*")
  .order("timestamp", { ascending: false });

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
  }, [hasMore]);

  // -------------------------
  // Fetch o Upsert profile
  // -------------------------
  const fetchOrUpsertProfile = useCallback(async () => {
    if (!userId) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            username: username || `user_${userId.slice(0, 8)}`, // <-- modificación: usamos username de App.tsx
            wallet: wallet || null,
            verified: verified,
            verified_at: new Date().toISOString(),
          },
          { onConflict: ["id"], returning: "representation" }
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

  useEffect(() => {
    if (!userId) return;
    fetchOrUpsertProfile();
    fetchPosts(true);
  }, [userId, fetchOrUpsertProfile, fetchPosts]);

  // -------------------------
  // Realtime posts
  // -------------------------
  useEffect(() => {
    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload) => setPosts((prev) => [payload.new, ...prev])
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) =>
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? payload.new : p))
          )
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // -------------------------
  // Scroll infinito
  // -------------------------
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

  // -------------------------
  // Mensajes no leídos
  // -------------------------
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
        () => setUnreadMessages((prev) => prev + 1)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  // -------------------------
  // Crear Post
  // -------------------------
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert(t("write_before_posting"));
      return;
    }
    if (!userId) return;

    let imageUrl = null;

    try {
      if (newPostImage) {
        const fileExt = newPostImage.name.split(".").pop() || "png";
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, newPostImage);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: newPostContent,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
        deleted_flag: false,
        visibility_score: 1,
      });

      if (error) throw error;

      setShowNewPostModal(false);
      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);

      fetchPosts(true);
    } catch (err: any) {
      console.error("Error creando post", err);
      alert(err.message);
    }
  };

  // -------------------------
  // Enviar mensaje
  // -------------------------
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

        const { data } = supabase.storage.from("message-attachments").getPublicUrl(key);
        attachmentsUrls.push(data.publicUrl);
      }

      if (!selectedChatUserId) {
        alert("Selecciona un chat antes de enviar mensaje");
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
      alert(err.message);
    }
  };

             
// Handler cuando se actualiza el perfil (avatar) //

const handleProfileUpdated = (updatedProfile: { id: string; avatar_url?: string }) => {
  if (updatedProfile.avatar_url) {
    // Actualiza avatar en HomePage
    setProfile((prev: any) => ({ ...prev, avatar_url: updatedProfile.avatar_url }));
    
    // Actualiza avatar en posts
    setPosts(prev =>
      prev.map(post =>
        post.user_id === updatedProfile.id
          ? { ...post, avatar_url: updatedProfile.avatar_url }
          : post
      )
    );
  }
};
  // -------------------------
  // Render
  // -------------------------
  return (
    <div
      ref={containerRef}
      className={`min-h-screen overflow-y-auto overflow-x-hidden ${
        theme === "dark" ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {/* HEADER */}
      <header className="sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b border-white/10 backdrop-blur-xl">
        <img src="/logo.png" className="w-11 h-11 object-contain" alt="Logo" />

        <div className="flex gap-3">
          <ActionButton
            labelKey="post"
            onClick={() => setShowNewPostModal(true)}
            className="px-5 py-2 bg-gray-800 rounded-full"
          />

          <div className="relative">
            <button
              onClick={() => {
                setShowInbox(true);
                setUnreadMessages(0);
              }}
              className="px-3 py-2 bg-indigo-700 rounded-full text-white text-lg"
            >
              ✉️
            </button>
            {unreadTotal > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-xs px-1 rounded-full">
                {unreadTotal}
              </span>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gray-700 rounded-full"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          <button
            onClick={() => setLanguage(language === "es" ? "en" : "es")}
            className="px-4 py-2 bg-gray-600 text-white rounded-full"
          >
            {language.toUpperCase()}
          </button>
        </div>

        <div
          className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 cursor-pointer"
          onClick={() => setShowProfileModal(true)}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">H</div>
          )}
        </div>
      </header>

      {/* FEED */}
      <main className="w-full px-2 py-6 flex justify-center">
        <FeedPage
          posts={posts}
          loading={loading}
          error={error}
          currentUserId={userId}
          userTier={profile?.tier || "free"}
          onUpgradeSuccess={() => fetchOrUpsertProfile()}
        />
      </main>

      {/* MODALS */}
      {showProfileModal && (
        <ProfileModal
          currentUserId={userId}
          onClose={() => setShowProfileModal(false)}
           onProfileUpdated={handleProfileUpdated}
          />
      )}

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
          (theme === "dark"
            ? "bg-gray-950 border border-white/10"
            : "bg-white border border-gray-200")
        }
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 24 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradiente decorativo superior */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t-3xl"
          style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)" }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
            >
              <Send size={14} className="text-white -rotate-12" />
            </div>
            <h2
              className={
                "text-lg font-bold tracking-tight " +
                (theme === "dark" ? "text-white" : "text-gray-900")
              }
            >
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
              (theme === "dark"
                ? "text-gray-400 hover:text-white hover:bg-white/10"
                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")
            }
          >
            <X size={16} />
          </motion.button>
        </div>

        {/* Textarea */}
        <div className="px-6">
          <div
            className={
              "relative rounded-2xl overflow-hidden " +
              (theme === "dark"
                ? "bg-gray-900 ring-1 ring-white/10 focus-within:ring-violet-500"
                : "bg-gray-50 ring-1 ring-gray-200 focus-within:ring-violet-400")
            }
            style={{ transition: "box-shadow 0.2s" }}
          >
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className={
                "w-full h-32 p-4 resize-none focus:outline-none bg-transparent text-sm leading-relaxed " +
                (theme === "dark"
                  ? "text-white placeholder-gray-500"
                  : "text-gray-900 placeholder-gray-400")
              }
              placeholder={t("whats_happening")}
              maxLength={maxChars}
            />
            <div
              className={
                "absolute bottom-3 right-3 text-xs font-medium tabular-nums " +
                (newPostContent.length > maxChars * 0.85
                  ? "text-red-400"
                  : theme === "dark"
                  ? "text-gray-600"
                  : "text-gray-400")
              }
            >
              {newPostContent.length}/{maxChars}
            </div>
          </div>
        </div>

        {/* Preview de imagen */}
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
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full object-cover max-h-60 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setNewPostImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <X size={12} className="text-white" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <label
  className={
    "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer " +
    (theme === "dark"
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
        

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-5 mt-2">
          
            <ImageIcon size={16} />
            <span className="hidden sm:inline">{t("add_image") || "Imagen"}</span>
          </motion.button>

          <div className="flex-1" />

          {/* Cancelar */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewPostModal(false)}
            className={
              "px-4 py-2.5 rounded-xl text-sm font-medium transition-colors " +
              (theme === "dark"
                ? "text-gray-300 bg-white/5 hover:bg-white/10"
                : "text-gray-600 bg-gray-100 hover:bg-gray-200")
            }
          >
            {t("cancel")}
          </motion.button>

          {/* Publicar */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleCreatePost}
            disabled={!newPostContent.trim()}
            className="relative px-5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: newPostContent.trim()
                ? "0 0 20px rgba(139,92,246,0.4)"
                : "none",
              transition: "box-shadow 0.3s",
            }}
          >
            <motion.span
              className="absolute inset-0 rounded-xl"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
              }}
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
      
            {userId && (
  <Inbox
    isOpen={showInbox}
    onClose={() => setShowInbox(false)}
    currentUserId={userId}
  />
)}

      
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-[90%] max-w-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t("notifications")}</h2>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <p className={`${theme === "dark" ? "text-gray-400" : "text-black"} text-sm`}>
                {t("no_notifications")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
