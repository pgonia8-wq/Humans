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

  // Estados para post
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments || 0);
  const [reposts, setReposts] = useState(post.reposts || 0);
  const [commentInput, setCommentInput] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"like"|"comment"|"repost"|"tip"|"boost"|"follow"|null>(null);
  const [error, setError] = useState<string|null>(null);

  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const [showTipBoostModal, setShowTipBoostModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(1); // WLD
  const [boostAmount, setBoostAmount] = useState(5); // WLD

  const { isFollowing, toggleFollow } = useFollow(currentUserId, post.user_id);

  // Cargar comentarios
  useEffect(() => {
    if (!showComments || !post.id) return;
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true })
          .limit(10);
        if (error) throw error;
        setCommentsList(data || []);
      } catch (err: any) {
        console.error("Error cargando comentarios:", err);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [showComments, post.id]);

  // Handle Like con tabla likes
  const handleLike = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    setLoadingAction("like");

    try {
      const { data: existingLike } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existingLike) {
        await supabase.from("likes").delete().eq("id", existingLike.id);
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
      await supabase.from("comments").insert({
        post_id: post.id,
        user_id: currentUserId,
        content: commentInput.trim(),
        created_at: new Date().toISOString(),
      });
      await supabase.from("posts").update({ comments: commentsCount + 1 }).eq("id", post.id);
      setCommentInput("");
      setCommentsCount(commentsCount + 1);
      setShowCommentInput(false);
      if (showComments) setCommentsList(prev => [...prev, { user_id: currentUserId, content: commentInput.trim(), id: Date.now() }]);
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
      await supabase.from("reposts").insert({ post_id: post.id, user_id: currentUserId, created_at: new Date().toISOString() });
      await supabase.from("posts").update({ reposts: reposts + 1 }).eq("id", post.id);
      setReposts(reposts + 1);
    } catch (err: any) {
      setError("Error al repostear: " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };

  const confirmTip = async () => {
    try {
      const res = await MiniKit.commandsAsync.pay({
        reference: `tip-${post.id}-${Date.now()}`,
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(tipAmount, Tokens.WLD).toString() }],
        description: "Tip a post",
      });
      if (res?.finalPayload?.status === "success") {
        alert("¡Tip enviado!");
        setShowTipBoostModal(false);
      } else {
        alert("Pago fallido");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago");
    }
  };

  const confirmBoost = async () => {
    try {
      const res = await MiniKit.commandsAsync.pay({
        reference: `boost-${post.id}-${Date.now()}`,
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(boostAmount, Tokens.WLD).toString() }],
        description: "Boost a post",
      });
      if (res?.finalPayload?.status === "success") {
        alert("¡Boost enviado!");
        setShowTipBoostModal(false);
      } else {
        alert("Pago fallido");
      }
    } catch (err) {
      console.error(err);
      alert("Error al procesar el pago");
    }
  };

  return (
    <div className={`p-4 rounded-xl ${theme==="dark"?"bg-gray-900":"bg-gray-100"} border border-gray-700 mb-4 shadow-md`}>
      {/* Header del post */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-600">
          {post.profiles?.avatar_url ? (
            <img src={post.profiles.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
              {post.profiles?.username?.[0]?.toUpperCase()||"?"}
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="font-bold text-lg">{post.profiles?.username||`@anon-${post.user_id.slice(0,8)}`}</p>
          <p className="text-sm text-gray-500">@{post.user_id.slice(0,8)}</p>
        </div>

        {/* Botón Seguir */}
        {currentUserId && currentUserId!==post.user_id && (
          <button
            onClick={toggleFollow}
            className={`ml-auto px-4 py-1 rounded-full text-sm font-medium transition ${isFollowing?"bg-gray-700 text-gray-300 hover:bg-gray-600":"bg-purple-600 text-white hover:bg-purple-700"}`}>
            {isFollowing?"Siguiendo":"Seguir"}
          </button>
        )}
      </div>

      {/* Contenido */}
      <p className="text-white whitespace-pre-wrap mb-4 leading-relaxed">{post.content}</p>

      {/* Acciones */}
      <div className="flex justify-between items-center text-gray-400 text-sm mt-4">
        <div className="flex gap-8">
          {/* Like */}
          <button onClick={handleLike} disabled={loadingAction==="like"} className={`flex items-center gap-1 transition ${liked?"text-red-500":"hover:text-red-500"}`}>
            {liked?"❤️":"♡"} {likes}
          </button>

          {/* Comentar */}
          <button onClick={()=>setShowCommentInput(!showCommentInput)} className="flex items-center gap-1 hover:text-blue-500 transition">
            💬 {commentsCount}
          </button>

          {/* Repost */}
          <button onClick={handleRepost} disabled={loadingAction==="repost"} className="flex items-center gap-1 hover:text-green-500 transition">
            🔁 {reposts}
          </button>
        </div>

        {/* Tip / Boost */}
        <div className="flex gap-3">
          <button onClick={()=>setShowTipBoostModal(true)} className="px-4 py-1 bg-yellow-600 text-white rounded-full text-xs hover:bg-yellow-700 transition">
            Tip / Boost
          </button>
        </div>
      </div>

      {/* Input Comentario */}
      {showCommentInput && (
        <div className="mt-4 flex gap-2">
          <input type="text" value={commentInput} onChange={e=>setCommentInput(e.target.value)} placeholder="Escribe un comentario..." className="flex-1 bg-gray-800 p-2 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button onClick={handleComment} disabled={loadingAction==="comment"||!commentInput.trim()} className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50">
            {loadingAction==="comment"?"...":"Enviar"}
          </button>
        </div>
      )}

      {/* Ver comentarios */}
      {commentsCount>0 && (
        <div className="mt-2">
          <button onClick={()=>setShowComments(!showComments)} className="text-blue-400 hover:text-blue-300 text-sm">
            {showComments?"Ocultar":"Ver"} {commentsCount} comentario{commentsCount!==1?"s":""}
          </button>

          {showComments && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {loadingComments ? <p className="text-gray-500 text-sm">Cargando comentarios...</p> :
                commentsList.map(c=>(
                  <div key={c.id} className="bg-gray-800 p-2 rounded text-sm">
                    <p className="font-bold">{c.user_id}</p>
                    <p className="text-gray-300">{c.content}</p>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Chat Token */}
      {currentUserId && (
        <button
          onClick={()=>window.location.href="/chat/premium"}
          className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
        >
          Chat Exclusivo Creadores de Tokens (5 WLD / mes)
        </button>
      )}

      {/* Modal Tip/Boost */}
      {showTipBoostModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-2">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-white/10 space-y-4 relative">
            <h3 className="text-white text-lg font-bold">Tip o Boost</h3>

            <div className="flex flex-col gap-2">
              <label className="text-gray-400">Cantidad Tip (WLD)</label>
              <input type="number" value={tipAmount} onChange={e=>setTipAmount(Number(e.target.value))} className="w-full p-2 rounded bg-gray-800 text-white" />

              <label className="text-gray-400">Cantidad Boost (WLD)</label>
              <input type="number" value={boostAmount} onChange={e=>setBoostAmount(Number(e.target.value))} className="w-full p-2 rounded bg-gray-800 text-white" />
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={confirmTip} className="flex-1 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Pagar Tip</button>
              <button onClick={confirmBoost} className="flex-1 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Pagar Boost</button>
            </div>

            <button onClick={()=>setShowTipBoostModal(false)} className="mt-4 w-full py-2 bg-gray-700 text-white rounded hover:bg-gray-600">Cancelar</button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};

export default PostCard;
