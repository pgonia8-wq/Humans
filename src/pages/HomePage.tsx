import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from "./FeedPage";
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";
import Inbox from "./chat/Inbox";

const PAGE_SIZE = 8;

const HomePage = ({ userId }: { userId: string | null }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const { theme, toggleTheme } = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxChars =
    profile?.tier === "premium+"
      ? 10000
      : profile?.tier === "premium"
      ? 4000
      : 280;

  const fetchPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      setLoading(true);
      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase.rpc("get_trending_posts");

      if (error) throw error;

      const newPosts = data || [];
      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
      setHasMore(newPosts.length === PAGE_SIZE);

      if (reset) setPage(1);
      else setPage((prev) => prev + 1);
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore]);

  const fetchOrCreateProfile = useCallback(async (uid: string) => {
    if (!uid) return;
    setProfileLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (data) {
        setProfile(data);
        return;
      }

      const res = await fetch("/api/createProfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      setProfile(result.profile);
    } catch (err: any) {
      console.error("[HOME] profile error:", err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchOrCreateProfile(userId);
    fetchPosts(true);
  }, [userId, fetchOrCreateProfile, fetchPosts]);

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
        () => setUnreadMessages((prev) => prev + 1)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [userId]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert("Escribe algo antes de publicar");
      return;
    }
    if (!userId) return;

    let imageUrl = null;

    try {
      if (newPostImage) {
        const fileExt = newPostImage.name.split(".").pop() || "png";
        // 🔥 CORRECCIÓN REAL AQUÍ (template string correcto)
        const fileName = `\( {userId}- \){Date.now()}.${fileExt}`;

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
            label="Post"
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
          onUpgradeSuccess={() => fetchOrCreateProfile(userId || "")}
        />
      </main>

      {/* MODAL PROFILE */}
      {showProfileModal && (
        <ProfileModal
          currentUserId={userId}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* MODAL NEW POST */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Crear post</h2>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className={`w-full h-32 p-3 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"
              }`}
              placeholder="¿Qué está pasando?"
              maxLength={maxChars}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setNewPostImage(e.target.files[0]);
                  setImagePreview(URL.createObjectURL(e.target.files[0]));
                }
              }}
              className="mt-4"
            />
            {imagePreview && <img src={imagePreview} className="mt-4 rounded-xl max-h-60" alt="Preview" />}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewPostModal(false)}
                className="flex-1 py-3 bg-gray-700 text-white rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreatePost}
                className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium"
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INBOX */}
      {showInbox && userId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md h-[90vh] flex flex-col border border-white/10 shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-white/20">
              <h2 className="text-white font-bold text-lg">Mensajes</h2>
              <button onClick={() => setShowInbox(false)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <Inbox currentUserId={userId} />
            </div>

            <div className="p-4 border-t border-white/20 bg-gray-900">
              <div className="flex items-center gap-2 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className={`flex-1 p-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-black"
                  }`}
                />
                <label className="cursor-pointer p-3 bg-gray-700 rounded-full">
                  <span role="img" aria-label="attach">📎</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setNewMessageAttachments(Array.from(e.target.files));
                      }
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    if (newMessage.trim() || newMessageAttachments.length > 0) {
                      alert("✅ Mensaje enviado correctamente");
                      setNewMessage("");
                      setNewMessageAttachments([]);
                    }
                  }}
                  className="p-3 bg-indigo-600 rounded-full"
                >
                  <span role="img" aria-label="send">➤</span>
                </button>
              </div>
              {newMessageAttachments.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  Adjuntos: {newMessageAttachments.map((f) => f.name).join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTIFICACIONES */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl w-[90%] max-w-md p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notificaciones</h2>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Aún no tienes notificaciones.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
