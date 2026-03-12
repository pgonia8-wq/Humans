import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from './FeedPage';
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";
import Inbox from "./chat/Inbox";

const PAGE_SIZE = 8;

// Post de prueba permanente
const DUMMY_POST = {
  id: "dummy-1",
  user_id: "test-user",
  content: "Este es un post de prueba.",
  timestamp: new Date().toISOString(),
  likes: 0,
  comments: 0,
  reposts: 0,
  deleted_flag: false,
  visibility_score: 1,
};

const HomePage = ({ userId }: { userId: string | null }) => {

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [profile, setProfile] = useState<any>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showInbox, setShowInbox] = useState(false);

  const [newPostContent, setNewPostContent] = useState("");

  const [unreadMessages, setUnreadMessages] = useState(0);

  const { theme, toggleTheme } = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement>(null);

  const maxChars =
    profile?.tier === "premium+"
      ? 10000
      : profile?.tier === "premium"
      ? 4000
      : 280;

  /* ------------------------------
     FETCH POSTS
  ------------------------------ */

  const fetchPosts = useCallback(async (reset = false) => {

    if (!hasMore && !reset) return;

    try {

      setLoading(true);

      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles (
            id,
            username,
            avatar_url
          )
        `)
        .order("timestamp", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const newPosts = data || [];

      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);

      setHasMore(newPosts.length === PAGE_SIZE);

      if (reset) setPage(1);
      else setPage(prev => prev + 1);

    } catch (err: any) {

      console.error(err);
      setError(err.message);

    } finally {

      setLoading(false);

    }

  }, [page, hasMore]);

  /* ------------------------------
     FETCH OR CREATE PROFILE
  ------------------------------ */

  const fetchOrCreateProfile = useCallback(async (uid: string) => {
    if (!uid) return;

    try {
      const { data, error: selectError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (selectError) throw selectError;

      if (data) {
        setProfile(data);
        return;
      }

      console.log("[HOME] No existe profile, creando...");

      const res = await fetch("/api/createProfile.mjs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid })
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Error creando profile");

      setProfile(result.profile);
    } catch (err: any) {
      console.error("[HOME] Profile error:", err);
      setError(err.message);
    }
  }, []);

  // 🔹 Init user & profile
  useEffect(() => {
    if (!userId) return;

    fetchOrCreateProfile(userId);
    fetchPosts(true);
  }, [userId, fetchOrCreateProfile, fetchPosts]);

  /* ------------------------------
     AVATAR UPDATED EVENT
  ------------------------------ */

  useEffect(() => {

    const handler = (e: any) => {

      const { userId: changedId, avatarUrl } = e.detail;

      if (changedId === userId) {
        setProfile((prev: any) => ({
          ...prev,
          avatar_url: avatarUrl
        }));
      }

      setPosts(prev =>
        prev.map(post =>
          post.user_id === changedId
            ? {
                ...post,
                profiles: {
                  ...post.profiles,
                  avatar_url: avatarUrl
                }
              }
            : post
        )
      );

    };

    window.addEventListener("avatarUpdated", handler);

    return () => window.removeEventListener("avatarUpdated", handler);

  }, [userId]);

  /* ------------------------------
     REALTIME POSTS
  ------------------------------ */

  useEffect(() => {

    const channel = supabase
      .channel("realtime-posts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "posts"
        },
        (payload) => {

          setPosts(prev => [payload.new, ...prev]);

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, []);

  /* ------------------------------
     SCROLL INFINITO
  ------------------------------ */

  useEffect(() => {

    const handleScroll = () => {

      if (!containerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

      if (scrollTop + clientHeight >= scrollHeight - 150) {
        fetchPosts();
      }

    };

    const el = containerRef.current;

    el?.addEventListener("scroll", handleScroll);

    return () => el?.removeEventListener("scroll", handleScroll);

  }, [fetchPosts]);

  /* ------------------------------
     CONTADOR MENSAJES
  ------------------------------ */

  const loadUnread = async () => {

    if (!userId) return;

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("read_flag", false);

    setUnreadMessages(count || 0);

  };

  /* ------------------------------
     REALTIME MENSAJES
  ------------------------------ */

  useEffect(() => {

    if (!userId) return;

    loadUnread();

    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`
        },
        () => {

          setUnreadMessages(prev => prev + 1);

        }
      )
      .subscribe();

    return () => {

      supabase.removeChannel(channel);

    };

  }, [userId]);

  /* ------------------------------
     CREAR POST
  ------------------------------ */

  const handleCreatePost = async () => {

    if (!newPostContent.trim()) {
      alert("Escribe algo antes de publicar");
      return;
    }

    if (!userId) {
      alert("No se encontró tu ID.");
      return;
    }

    const { error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        content: newPostContent.trim(),
        timestamp: new Date().toISOString(),
        deleted_flag: false,
        visibility_score: 1
      });

    if (error) {
      alert(error.message);
      return;
    }

    setShowNewPostModal(false);
    setNewPostContent("");
    fetchPosts(true);  // Refresca feed

  };

  /* ------------------------------
     UI
  ------------------------------ */

  return (

    <div
      ref={containerRef}
      className={`min-h-screen overflow-y-auto ${
        theme === "dark"
          ? "bg-black text-white"
          : "bg-white text-black"
      }`}
    >

      {/* HEADER */}

      <header className="sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b border-white/10 backdrop-blur-xl">

        <img src="/logo.png" className="w-11 h-11 object-contain"/>

        <div className="flex gap-3">

          <ActionButton
            label="Post"
            onClick={() => setShowNewPostModal(true)}
            className="px-5 py-2 bg-gray-800 rounded-full"
          />

          <button
            onClick={() => {
              setShowInbox(true);
              setUnreadMessages(0);
            }}
            className="relative px-5 py-2 bg-indigo-700 rounded-full"
          >

            Mensajes

            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-xs px-2 rounded-full">
                {unreadMessages}
              </span>
            )}

          </button>

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
            <img
              src={profile.avatar_url}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              H
            </div>
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

      {/* INBOX */}

      {showInbox && userId && (

        <Inbox
          currentUserId={userId}
          onClose={() => setShowInbox(false)}
        />

      )}

      {/* PROFILE */}

      {showProfileModal && (

        <ProfileModal
          id={userId}
          currentUserId={userId}
          onClose={() => setShowProfileModal(false)}
          showUpgradeButton={profile?.tier === "free"}
        />

      )}

      {/* MODAL NUEVO POST (INLINE - Opción 1) */}

      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10">
            <h2 className="text-xl font-bold mb-4 text-white">Nuevo Post</h2>
            <textarea
              value={newPostContent}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setNewPostContent(e.target.value);
                }
              }}
              className="w-full bg-black border border-gray-700 rounded-xl p-4 min-h-[140px] text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="¿Qué estás pensando?"
              maxLength={maxChars}
            />
            <div className="flex justify-between mt-4 text-sm text-gray-400">
              <span>{newPostContent.length} / {maxChars}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="px-5 py-2 bg-gray-800 rounded-full"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePost}
                  className="px-6 py-2 bg-purple-600 rounded-full font-medium"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>

  );

};

export default HomePage;
