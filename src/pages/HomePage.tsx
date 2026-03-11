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
        .select("*")
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
     FETCH PROFILE
  ------------------------------ */

  useEffect(() => {

    if (!userId) return;

    const fetchProfile = async () => {

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      setProfile(data || null);

    };

    fetchProfile();
    fetchPosts(true);

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
          className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center cursor-pointer"
          onClick={() => setShowProfileModal(true)}
        >
          H
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

    </div>

  );

};

export default HomePage;
