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
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"like" | "comment" | "repost" | "tip" | "boost" | "follow" | "subscription" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState(1); // Editable, mínimo 1 WLD

  const { isFollowing, toggleFollow } = useFollow(currentUserId, post.user_id);

  // Real-time
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

  // Cargar comentarios
  useEffect(() => {
    if (showComments && post.id) {
      const fetchComments = async () => {
        setLoadingComments(true);
        try {
          const { data, error } = await supabase
            .from("comments_with_profiles")
            .select("*")
            .eq("post_id", post.id)
            .order("timestamp", { ascending: false })
            .limit(10);

          if (error) throw error;
          setCommentsList(data || []);
        } catch (err: any) {
          console.error("Error cargando comentarios:", err);
          setError("No se pudieron cargar los comentarios");
        } finally {
          setLoadingComments(false);
        }
      };
      fetchComments();
    }
  }, [showComments, post.id]);

  const handleLike = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    setLoadingAction("like");

    try {
      const { data: existing } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existing) {
        await supabase.from("likes").delete().eq("id", existing.id);
        await supabase.from("posts").update({ likes: likes - 1 }).eq("id", post.id);
        setLiked(false);
        setLikes(likes - 1);
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
        await supabase.from("posts").update({ likes: likes + 1 }).eq("id", post.id);
        setLiked(true);
        setLikes(likes + 1);
      }
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
      const { error } = await supabase.from("comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: commentInput.trim(),
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase.from("posts").update({ comments: comments + 1 }).eq("id", post.id);

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
      const { error } = await supabase.from("reposts").insert({
        post_id: post.id,
        user_id: currentUserId,
        timestamp: new Date().toISOString(),
      });

      if (error) throw error;

      await supabase.from("posts").update({ reposts: reposts + 1 }).eq("id", post.id);

      setReposts(reposts + 1);
    } catch (err: any) {
      setError("Error al repostear: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  // --- PAGOS CORREGIDOS SEGÚN HOME ---
  const confirmTip = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    if (tipAmount < 1) return setError("El mínimo es 1 WLD");

    setLoadingAction("tip");
    try {
      const reference = `tip-${post.id}-${Date.now()}`;
      const amount = tokenToDecimals(tipAmount, Tokens.WLD).toString();

      const res = await MiniKit.commandsAsync.pay({
        reference,
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
        description: "Tip a post",
      });

      if (res?.finalPayload?.status === "success") {
        alert("¡Tip enviado!");
      } else {
        alert("Pago fallido");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago");
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmBoost = async () => {
    if (!currentUserId) return setError("Debes estar logueado");

    setLoadingAction("boost");
    try {
      const reference = `boost-${post.id}-${Date.now()}`;
      const amount = tokenToDecimals(5, Tokens.WLD).toString();

      const res = await MiniKit.commandsAsync.pay({
        reference,
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
        description: "Boost a post",
      });

      if (res?.finalPayload?.status === "success") {
        alert("¡Boost enviado!");
      } else {
        alert("Pago fallido");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el boost");
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmSubscription = async () => {
    if (!currentUserId) return setError("Debes estar logueado");

    setLoadingAction("subscription");
    try {
      const reference = `sub-chat-${post.id}-${Date.now()}`;
      const amount = tokenToDecimals(5, Tokens.WLD).toString();

      const res = await MiniKit.commandsAsync.pay({
        reference,
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: amount }],
        description: "Suscripción Chat Creadores de Tokens",
      });

      if (res?.finalPayload?.status === "success") {
        window.location.href = "/chat/tokens";
      } else {
        alert("Pago cancelado");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago");
    } finally {
      setLoadingAction(null);
    }
  };
  // --- FIN PAGOS CORREGIDOS ---

  const openUserProfile = () => {
    window.location.href = `/profile/${post.user_id}`;
  };

  return (
    <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"} border border-gray-700 mb-4 shadow-md`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-600 cursor-pointer"
          onClick={openUserProfile}
        >
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
          <p className="text-xs text-gray-400">
            {new Date(post.timestamp).toLocaleString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>

        {currentUserId && currentUserId !== post.user_id && (
          <button
            onClick={toggleFollow}
            className={`ml-auto px-4 py-1 rounded-full text-sm font-medium transition ${
              isFollowing ? "bg-gray-700 text-gray-300" : "bg-purple-600 text-white"
            } hover:opacity-90`}
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
          <button
            onClick={handleLike}
            disabled={loadingAction === "like"}
            className={`flex items-center gap-1 ${liked ? "text-red-500" : "hover:text-red-500"}`}
          >
            {liked ? "❤️" : "♡"} {likes}
          </button>

          <button
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="flex items-center gap-1 hover:text-blue-500"
          >
            💬 {comments}
          </button>

          <button
            onClick={handleRepost}
            disabled={loadingAction === "repost"}
            className="flex items-center gap-1 hover:text-green-500"
          >
            🔁 {reposts}
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              value={tipAmount}
              onChange={(e) => setTipAmount(Math.max(1, Number(e.target.value)))}
              className="w-16 p-1 bg-gray-800 text-white rounded text-sm"
            />
            <button
              onClick={confirmTip}
              disabled={loadingAction === "tip"}
              className="px-4 py-1 bg-yellow-600 text-white rounded-full text-xs hover:bg-yellow-700 disabled:opacity-50"
            >
              Tip
            </button>
          </div>

          <button
            onClick={confirmBoost}
            disabled={loadingAction === "boost"}
            className="px-4 py-1 bg-purple-600 text-white rounded-full text-xs hover:bg-purple-700 disabled:opacity-50"
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

      {/* Lista de comentarios */}
      {comments > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {showComments ? "Ocultar" : "Ver"} {comments} comentario{comments !== 1 ? "s" : ""}
          </button>

          {showComments && (
            <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
              {loadingComments ? (
                <p className="text-gray-500 text-sm">Cargando comentarios...</p>
              ) : commentsList.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay comentarios aún</p>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="bg-gray-800 p-3 rounded text-sm">
                    <p className="font-bold">
                      {c.username || `@anon-${c.user_id.slice(0,8)}`}
                    </p>
                    <p className="text-gray-300">{c.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(c.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Chat Exclusivo Creadores de Tokens */}
      {currentUserId && (
        <button
          onClick={confirmSubscription}
          className="w-full py-2 bg-indigo-600 text-white rounded-full mt-4 hover:bg-indigo-700 text-sm font-medium transition"
        >
          Chat Exclusivo Creadores de Tokens (5 WLD)
        </button>
      )}

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default PostCard;
