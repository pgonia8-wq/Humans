import React, { useState, useEffect, useContext } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { useFollow } from "../lib/useFollow";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";

interface PostCardProps {
  post: any;
  currentUserId: string | null;
}

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId }) => {
  const { theme } = useContext(ThemeContext);

  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [comments, setComments] = useState(post.comments || 0);
  const [reposts, setReposts] = useState(post.reposts || 0);
  const [commentInput, setCommentInput] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"like" | "comment" | "repost" | "tip" | "boost" | "follow" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isFollowing, toggleFollow } = useFollow(currentUserId, post.user_id);

  // Real-time para likes, comments, reposts
  useEffect(() => {
    if (!post.id) return;

    const channel = supabase
      .channel(`post-${post.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts", filter: `id=eq.${post.id}` },
        (payload) => {
          if (payload.new.likes !== likes) setLikes(payload.new.likes);
          if (payload.new.comments !== comments) setComments(payload.new.comments);
          if (payload.new.reposts !== reposts) setReposts(payload.new.reposts);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [post.id, likes, comments, reposts]);

  const handleLike = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    setLoadingAction("like");

    try {
      const newLikes = liked ? likes - 1 : likes + 1;
      const { error } = await supabase
        .from("posts")
        .update({ likes: newLikes })
        .eq("id", post.id);

      if (error) throw error;

      setLiked(!liked);
      setLikes(newLikes);
    } catch (err: any) {
      setError("Error al dar like: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleComment = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    if (!commentInput.trim()) return setError("Escribe un comentario");

    setLoadingAction("comment");

    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          content: commentInput.trim(),
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      await supabase
        .from("posts")
        .update({ comments: comments + 1 })
        .eq("id", post.id);

      setCommentInput("");
      setShowCommentInput(false);
      setComments(comments + 1);
    } catch (err: any) {
      setError("Error al comentar: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRepost = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    if (!confirm("¿Repostear este post?")) return;

    setLoadingAction("repost");

    try {
      const { error } = await supabase
        .from("reposts")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          timestamp: new Date().toISOString(),
        });

      if (error) throw error;

      await supabase
        .from("posts")
        .update({ reposts: reposts + 1 })
        .eq("id", post.id);

      setReposts(reposts + 1);
    } catch (err: any) {
      setError("Error al repostear: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTip = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    if (!confirm("¿Enviar 1 WLD como tip?")) return;

    setLoadingAction("tip");

    try {
      const payRes = await MiniKit.commandsAsync.pay({
        amount: 1,
        currency: "WLD",
        recipient: RECEIVER,
      });

      if (payRes.status !== "success") throw new Error("Pago fallido");

      alert("¡Tip enviado!");
    } catch (err: any) {
      setError("Error en tip: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBoost = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    if (!confirm("¿Enviar 5 WLD como boost?")) return;

    setLoadingAction("boost");

    try {
      const payRes = await MiniKit.commandsAsync.pay({
        amount: 5,
        currency: "WLD",
        recipient: RECEIVER,
      });

      if (payRes.status !== "success") throw new Error("Pago fallido");

      alert("¡Boost enviado!");
    } catch (err: any) {
      setError("Error en boost: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"} border border-gray-700 mb-4 shadow-md`}>
      {/* Header del post */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-600">
          {post.profiles?.avatar_url ? (
            <img src={post.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
              {post.profiles?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="font-bold text-lg">
            {post.profiles?.username || `@anon-${post.user_id.slice(0, 8)}`}
          </p>
          <p className="text-sm text-gray-500">@{post.user_id.slice(0, 8)}</p>
        </div>

        {/* Botón Seguir */}
        {currentUserId && currentUserId !== post.user_id && (
          <button
            onClick={toggleFollow}
            className={`ml-auto px-4 py-1 rounded-full text-sm font-medium transition ${
              isFollowing
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isFollowing ? "Siguiendo" : "Seguir"}
          </button>
        )}
      </div>

      {/* Contenido */}
      <p className="text-white whitespace-pre-wrap mb-4 leading-relaxed">{post.content}</p>

      {/* Acciones */}
      <div className="flex justify-between items-center text-gray-400 text-sm mt-4">
        <div className="flex gap-8">
          {/* Like */}
          <button
            onClick={handleLike}
            disabled={loadingAction === "like"}
            className={`flex items-center gap-1 transition ${liked ? "text-red-500" : "hover:text-red-500"}`}
          >
            {liked ? "❤️" : "♡"} {likes}
          </button>

          {/* Comentar */}
          <button
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="flex items-center gap-1 hover:text-blue-500 transition"
          >
            💬 {comments}
          </button>

          {/* Repost */}
          <button
            onClick={handleRepost}
            disabled={loadingAction === "repost"}
            className="flex items-center gap-1 hover:text-green-500 transition"
          >
            🔁 {reposts}
          </button>
        </div>

        {/* Tip y Boost */}
        <div className="flex gap-3">
          <button
            onClick={handleTip}
            disabled={loadingAction === "tip"}
            className="px-4 py-1 bg-yellow-600 text-white rounded-full text-xs hover:bg-yellow-700 transition disabled:opacity-50"
          >
            Tip 1 WLD
          </button>
          <button
            onClick={handleBoost}
            disabled={loadingAction === "boost"}
            className="px-4 py-1 bg-purple-600 text-white rounded-full text-xs hover:bg-purple-700 transition disabled:opacity-50"
          >
            Boost 5 WLD
          </button>
        </div>
      </div>

      {/* Input comentario */}
      {showCommentInput && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder="Escribe un comentario..."
            className="flex-1 bg-gray-800 p-2 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleComment}
            disabled={loadingAction === "comment" || !commentInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {loadingAction === "comment" ? "..." : "Enviar"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default PostCard;
