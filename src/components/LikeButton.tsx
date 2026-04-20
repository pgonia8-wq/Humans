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
            setLikes(result.likes ?? likes - 1);
          } else if (result && result.liked) {
            setLiked(true);
            setLikes(result.likes ?? likes + 1);
            setPulse(true);
            setTimeout(() => setPulse(false), 600);
          }
        } else {
          setLiked((prev) => !prev);
          setLikes((prev) => prev + (liked ? -1 : 1));
          if (!liked) {
            setPulse(true);
            setTimeout(() => setPulse(false), 600);
          }
        }
      } catch (err) {
        console.error("Like error:", err);
      } finally {
        setLoading(false);
      }
    };

    return (
      <button
        onClick={handleLike}
        disabled={loading}
        className={[
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
          "transition-all duration-150 hover:scale-105 active:scale-[0.97]",
          "select-none",
          liked
            ? "text-pink-500 bg-pink-500/10"
            : isDark
              ? "text-gray-500 hover:text-pink-400 hover:bg-pink-500/[0.09]"
              : "text-gray-400 hover:text-pink-500 hover:bg-pink-50",
          loading ? "opacity-60 cursor-wait" : "",
          pulse ? "scale-110" : "",
        ].join(" ")}
        style={pulse ? { transition: "transform 0.15s cubic-bezier(0.34,1.56,0.64,1)" } : undefined}
      >
        <svg
          className="w-4 h-4 flex-shrink-0"
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
        {likes > 0 && (
          <span className="tabular-nums leading-none">{likes}</span>
        )}
      </button>
    );
  };

  export default LikeButton;
  
