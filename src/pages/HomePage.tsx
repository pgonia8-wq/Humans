import React, { useEffect, useState, useRef, useCallback, useContext } from "react";
import { supabase } from "../supabaseClient";
import FeedPage from './FeedPage';
import { ThemeContext } from "../lib/ThemeContext";

const PAGE_SIZE = 8;

interface Post {
  id: string;
  content?: string;
  timestamp: string;
  user_id?: string;
  [key: string]: any;
}

const HomePage = ({ userId }: { userId: string }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [userTier, setUserTier] = useState<"free" | "basic" | "premium" | "premium+">("free");

  const { theme } = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    try {
      setLoading(true);
      const from = reset ? 0 : page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log("[HOME] fetchPosts:", { from, to });

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
  }, [page, hasMore]);

  useEffect(() => {
    console.log("[HOME] userId recibido:", userId);

    const fetchTier = async () => {
      try {
        const { data: profile, error: tierError } = await supabase
          .from("profiles")
          .select("tier")
          .eq("id", userId)
          .single();

        if (tierError) {
          console.error("[HOME] Error al obtener tier:", tierError);
          return;
        }

        console.log("[HOME] Tier obtenido:", profile?.tier);
        setUserTier(profile?.tier || "free");
      } catch (err: any) {
        console.error("[HOME] Exception al cargar tier:", err);
      }
    };

    fetchTier();
    fetchPosts(true);
  }, [fetchPosts, userId]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchPosts();
      }
    };
    containerRef.current?.addEventListener("scroll", handleScroll);
    return () => containerRef.current?.removeEventListener("scroll", handleScroll);
  }, [fetchPosts]);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen overflow-y-auto antialiased ${theme === "dark" ? "bg-black text-white" : "bg-white text-black"}`}
      style={{ overflowX: "hidden" }}
    >
      <FeedPage posts={posts} loading={loading} error={error} currentUserId={userId} userTier={userTier} />
    </div>
  );
};

export default HomePage;
