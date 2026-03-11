import { useUser } from "../context/UserContext";
import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from "./FeedPage";
import { ThemeContext } from "../lib/ThemeContext";
import ProfileModal from "../components/ProfileModal";
import ActionButton from "../components/ActionButton";
import ChatPage from "./chat/ChatPage";

const PAGE_SIZE = 8;

const HomePage = ({ userId }: { userId: string | null }) => {
  const { setUser } = useUser();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");

  const { theme } = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  const [chatTargetId, setChatTargetId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const maxChars =
    profile?.tier === "premium+" ? 10000 : profile?.tier === "premium" ? 4000 : 280;

  // 🔹 Fetch posts con fix de loading
  const fetchPosts = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      try {
        setLoading(true);
        const from = reset ? 0 : page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("timestamp", { ascending: false })
          .range(from, to);

        if (error) throw error;

        const newPosts = data || [];
        setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]));
        setHasMore(newPosts.length === PAGE_SIZE);

        setPage(reset ? 1 : page + 1);
      } catch (err: any) {
        console.error("[HOME] Error fetching posts:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [page, hasMore, loading]
  );

  // 🔹 Fetch o crear profile
  const fetchOrCreateProfile = useCallback(
    async (uid: string) => {
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
          setUser({ tier: data.tier });
          return;
        }

        const res = await fetch("/api/createProfile.mjs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: uid }),
        });

        const result = await res.json();

        if (!result.success) throw new Error(result.error || "Error creando profile");

        setProfile(result.profile);
        setUser({ tier: result.profile.tier });
      } catch (err: any) {
        console.error("[HOME] Profile error:", err);
        setError(err.message);
      }
    },
    [setUser]
  );

  // 🔹 Init user & profile
  useEffect(() => {
    setUser({ userId });
    if (userId) fetchOrCreateProfile(userId);
    fetchPosts(true);
  }, [userId, fetchOrCreateProfile, fetchPosts, setUser]);

  // 🔹 Scroll listener (backup)
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) fetchPosts();
    };

    containerRef.current?.addEventListener("scroll", handleScroll);
    return () => containerRef.current?.removeEventListener("scroll", handleScroll);
  }, [fetchPosts]);

  // 🔹 IntersectionObserver para scroll infinito
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts();
        }
      },
      {
        root: containerRef.current,
        rootMargin: "300px",
      }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [fetchPosts]);

  // 🔹 Crear post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      alert("Escribe algo antes de publicar");
      return;
    }
    if (!userId) {
      alert("No se encontró tu ID");
      return;
    }

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: newPostContent.trim(),
        timestamp: new Date().toISOString(),
        deleted_flag: false,
        visibility_score: 1,
      });
      if (error) throw error;

      setShowNewPostModal(false);
      setNewPostContent("");
      fetchPosts(true);
    } catch (err: any) {
      console.error("[POST ERROR]", err);
      alert("Error publicando: " + err.message);
    }
  };

  // 🔹 Abrir chat desde ProfileModal
  const openChatFromModal = async (otherUserId: string) => {
    if (!userId) return;

    try {
      let { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1.eq.${userId},user2.eq.${userId}`)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({ user1: userId, user2: otherUserId })
          .select()
          .single();
        if (error) throw error;
        conversation = newConv;
      }

      setConversationId(conversation.id);
      setChatTargetId(otherUserId);
      setShowProfileModal(false);
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  const handleRefresh = () => fetchPosts(true);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen overflow-y-auto ${
        theme === "dark" ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      <header className="sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between border-b border-white/10 bg-black/90 backdrop-blur-xl">
        Humans
        <div className="flex gap-3">
          <ActionButton
            label="Post"
            onClick={() => setShowNewPostModal(true)}
            className="px-5 py-2 bg-gradient-to-r from-gray-800 to-gray-700 rounded-full"
          />
          <button
            onClick={() => (window.location.href = "/chat")}
            className="px-5 py-2 bg-gradient-to-r from-indigo-700 to-purple-700 rounded-full"
          >
            Chat
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">🔔</div>
            <span className="absolute -top-1 -right-1 bg-red-600 text-xs rounded-full px-1.5 py-0.5">3</span>
          </div>
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold cursor-pointer"
            onClick={() => setShowProfileModal(true)}
          >
            H
          </div>
        </div>
      </header>

      <div className="text-center py-4 text-gray-400 text-sm cursor-pointer" onClick={handleRefresh}>
        Tirar para refrescar
      </div>

      <main className="w-full px-2 py-6 flex justify-center">
        <div className="w-full max-w-xl">
          <FeedPage
            posts={posts}
            loading={loading}
            error={error}
            currentUserId={userId}
            userTier={profile?.tier || "free"}
            onUpgradeSuccess={() => fetchOrCreateProfile(userId || "")}
          />

          <div
            ref={loaderRef}
            className="h-10 flex items-center justify-center text-gray-500 text-sm"
          >
            {loading ? "Cargando..." : hasMore ? "" : "No hay más posts"}
          </div>
        </div>
      </main>

      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Nuevo Post</h2>
            <textarea
              value={newPostContent}
              onChange={(e) =>
                e.target.value.length <= maxChars && setNewPostContent(e.target.value)
              }
              className="w-full bg-black border border-gray-700 rounded-xl p-4 min-h-[140px]"
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
                  className="px-6 py-2 bg-purple-600 rounded-full"
                >
                  Publicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && profile && (
        <ProfileModal
          id={userId}
          currentUserId={userId}
          onClose={() => setShowProfileModal(false)}
          showUpgradeButton={profile.tier === "free"}
          onOpenChat={openChatFromModal}
        />
      )}

      {conversationId && chatTargetId && (
        <ChatPage
          currentUserId={userId}
          conversationId={conversationId}
          otherUserId={chatTargetId}
          onClose={() => {
            setConversationId(null);
            setChatTargetId(null);
          }}
        />
      )}
    </div>
  );
};

export default HomePage;
