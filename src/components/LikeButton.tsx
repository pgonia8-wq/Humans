import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { ThemeContext } from '../lib/ThemeContext';

interface LikeButtonProps {
  postId: string;
  initialLikes: number;
  userId?: string | null;
}

const LikeButton: React.FC<LikeButtonProps> = ({ postId, initialLikes, userId }) => {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);

  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!userId || !postId) return;
    const checkIfLiked = async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setLiked(true);
    };
    checkIfLiked();
  }, [userId, postId]);

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (userId) {
        const { data: result } = await supabase.rpc("toggle_like", {
          p_post_id: postId,
          p_user_id: userId,
        });

        if (result && !result.liked) {
          setLiked(false);
          setLikes(result.likes ?? Math.max(likes - 1, 0));
        } else if (result && result.liked) {
          setLiked(true);
          setLikes(result.likes ?? likes + 1);
          setPulse(true);
          setTimeout(() => setPulse(false), 600);
        }
      } else {
        if (liked) { setLoading(false); return; }
        setLikes(likes + 1);
        setLiked(true);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
        await supabase
          .from('posts')
          .update({ likes_count: likes + 1 })
          .eq('id', postId);
      }
    } catch (err) {
      console.error("[LikeButton] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 select-none
        ${pulse ? "scale-110" : "scale-100"}
        ${liked
          ? "text-pink-500 bg-pink-500/10"
          : isDark
            ? "text-gray-500 hover:text-pink-400 hover:bg-pink-500/[0.09]"
            : "text-gray-400 hover:text-pink-500 hover:bg-pink-50"
        }
      `}
      style={{ transition: "transform 0.15s cubic-bezier(.34,1.56,.64,1)" }}
    >
      <svg
        className={`w-4 h-4 transition-transform duration-150 ${pulse ? "scale-125" : ""}`}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {likes > 0 && <span className="tabular-nums">{likes}</span>}
    </button>
  );
};

export default LikeButton;
