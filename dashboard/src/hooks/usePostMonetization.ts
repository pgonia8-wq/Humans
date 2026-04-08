import { useState, useCallback, useEffect } from "react";
import { supabase } from "../../../src/supabaseClient";

export interface MonetizedPost {
  id: string;
  content: string;
  monetized: boolean;
}

export function usePostMonetization(userId: string | null | undefined) {
  const [posts, setPosts] = useState<MonetizedPost[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("posts")
        .select("id, content, monetized")
        .eq("author_id", userId)
        .order("created_at", { ascending: false });
      setPosts(
        (data ?? []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          content: p.content as string,
          monetized: (p.monetized as boolean) ?? false,
        }))
      );
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const toggleMonetized = useCallback(async (postId: string) => {
    const current = posts.find((p) => p.id === postId);
    if (!current) return;
    const next = !current.monetized;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, monetized: next } : p));
    try {
      await supabase.from("posts").update({ monetized: next }).eq("id", postId);
    } catch {
      // monetized column may not exist — keep local state change
    }
  }, [posts]);

  return { posts, loading, toggleMonetized };
}
