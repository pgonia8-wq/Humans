import React, { useState, useEffect, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { useFollow } from "../lib/useFollow";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useLanguage } from "../LanguageContext";
import GlobalChatRoom from "../pages/chat/GlobalChatRoom";

// Helper para mostrar la hora relativa
const getRelativeTime = (timestamp: string | null) => {
  if (!timestamp) return "Desconocida";

  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "hace 1 minuto";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} ${diffMin === 1 ? "minuto" : "minutos"}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} ${diffH === 1 ? "hora" : "horas"}`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD} ${diffD === 1 ? "día" : "días"}`;
};
interface PostCardProps {
  post: any;
  currentUserId: string | null;
}

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId }) => {
  const { theme, username: globalUsername } = useContext(ThemeContext);
  const { t } = useLanguage();
  const postRef = useRef<HTMLDivElement | null>(null);
  const viewRegistered = useRef(false);
 
  const [showGlobalChat, setShowGlobalChat] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [comments, setComments] = useState(post.comments || 0);
  const [reposts, setReposts] = useState(post.reposts || 0);
  const [commentInput, setCommentInput] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    "like" | "comment" | "repost" | "tip" | "boost" | "follow" | "subscription" | null
  >(null);
// --- STATES ---
const [originalPost, setOriginalPost] = useState<any | null>(null);
const [hasChatAccess, setHasChatAccess] = useState(false);
const [checkingAccess, setCheckingAccess] = useState(true);

// Check chat access
// --- USEEFFECTS ---
useEffect(() => {
  const checkChatAccess = async () => {
    if (!currentUserId) {
      setCheckingAccess(false);
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("product") // 👈 columna correcta
      .eq("user_id", currentUserId)
      .in("product", ["chat_classic", "chat_gold"]) // 👈 valores reales
      .maybeSingle();

    if (error) {
      console.error("Error consultando suscripción:", error);
    }

    if (data) {
      setHasChatAccess(true);
    }

    setCheckingAccess(false);
  };

  checkChatAccess();
}, [currentUserId]);

useEffect(() => {
  const fetchOriginalPost = async () => {
    if (!post || !post.reposted_post_id) return;

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", post.reposted_post_id)
      .single();

    if (error) {
      console.error("Error fetching original post:", error);
    } else {
      setOriginalPost(data); // usa el state existente
    }
  };

  fetchOriginalPost();
}, [post && post.reposted_post_id]);
  const [error, setError] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState<number | "">(1);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [quoteInput, setQuoteInput] = useState("");

  const { isFollowing, toggleFollow } = useFollow(currentUserId, post.user_id);
   // Estado para el perfil del autor del post
  const [postProfile, setPostProfile] = useState<{ username: string; avatar_url: string } | null>(null);
    // Cargar perfil del autor del post desde profiles
  useEffect(() => {
    const fetchPostProfile = async () => {
     if (!post.user_id) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", post.user_id)
          .single();
        if (error) throw error;
        setPostProfile(data);
      } catch (err) {
       console.error("Error cargando perfil del post:", err);
        setPostProfile({ username: "Desconocido", avatar_url: "" });
      }
    };
    fetchPostProfile();
  }, [post.user_id]);
  
  // Registrar vistas
  useEffect(() => {
    if (!postRef.current || viewRegistered.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !viewRegistered.current) {
          viewRegistered.current = true;
          try {
            await supabase.rpc("increment_post_views", { post_id_input: post.id });
          } catch (err) {
            console.error(t("error_registrando_view"), err);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [post.id, t]);

  // Real-time updates
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
          const { data: commentsData } = await supabase
            .from("comments")
            .select("*")
            .eq("post_id", post.id)
            .order("timestamp", { ascending: false })
            .limit(10);

          if (!commentsData || commentsData.length === 0) {
            setCommentsList([]);
            return;
          }

          const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds);

          const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});

          const enriched = commentsData.map((c: any) => ({
            ...c,
            profiles: profilesMap[c.user_id] || null,
          }));
          setCommentsList(enriched);
        } catch (err: any) {
          console.error(t("error_cargando_comentarios"), err);
          setError(t("error_cargando_comentarios"));
        } finally {
          setLoadingComments(false);
        }
      };
      fetchComments();
    }
  }, [showComments, post.id, t]);

  // Handlers
  
const handleLike = async () => {
  if (!currentUserId) return setError(t("debes_estar_logueado"));
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
    setError(t("error_al_dar_like") + ": " + err.message);
  } finally {
    setLoadingAction(null);
  }
};

  const handleComment = async () => {
  if (!currentUserId) return setError(t("debes_estar_logueado"));
  if (!commentInput.trim()) return setError(t("escribe_comentario"));
  setLoadingAction("comment");
  try {
    // Insertar comentario en Supabase
    const { data: newComment, error } = await supabase
      .from("comments")
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        content: commentInput.trim(),
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;

    // Actualizar contador de comentarios en posts
    await supabase
      .from("posts")
      .update({ comments: comments + 1 })
      .eq("id", post.id);

    // Actualizar estado local
    setCommentInput("");
    setShowCommentInput(false);
    setComments(comments + 1);

    // Enriquecer el comentario con perfil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", currentUserId)
      .single();

    setCommentsList([
      { ...newComment, profiles: profileData },
      ...commentsList,
    ]);
  } catch (err: any) {
    setError(t("error_al_comentar") + ": " + err.message);
  } finally {
    setLoadingAction(null);
  }
};
  
const handleRepost = () => {
  if (!currentUserId) {
    setError(t("debes_estar_logueado"));
    return;
  }
  setShowRepostModal(true);
};

const confirmRepost = async () => {
  if (!currentUserId) return setError(t("debes_estar_logueado"));

  setLoadingAction("repost");
  setShowRepostModal(false);

  try {
    const { error } = await supabase.from("posts").insert({
      user_id: currentUserId,
      content: post.content,
      reposted_post_id: post.id,
      timestamp: new Date().toISOString(),
    });

    if (error) throw error;

    await supabase
      .from("posts")
      .update({ reposts: reposts + 1 })
      .eq("id", post.id);

    setReposts((prev) => prev + 1);

  } catch (err: any) {
    setError(t("error_al_repostear") + ": " + (err.message || ""));
  } finally {
    setLoadingAction(null);
  }
};
  const confirmQuote = async () => {
    if (!currentUserId) return setError(t("debes_estar_logueado"));
    if (!quoteInput.trim()) return setError(t("escribe_para_citar"));
    setLoadingAction("repost");
    setShowRepostModal(false);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: currentUserId,
        content: quoteInput.trim(),
        quoted_post_id: post.id,
        timestamp: new Date().toISOString(),
      });
      if (error) throw error;
      alert(t("post_citado"));
      setQuoteInput("");
    } catch (err: any) {
      setError(t("error_al_citar") + ": " + err.message);
    } finally {
      setLoadingAction(null);
    }
  };
// --- HANDLE TIP ---
const handleTip = async () => {
  if (!currentUserId) return setError(t("debes_estar_logueado"));
  setLoadingAction("tip");
  setError(null);

  // Validar cantidad mínima
  if (tipAmount === "" || Number(tipAmount) < 1) {
    setError(t("min_wld"));
    setLoadingAction(null);
    return;
  }

  // Validar que el post no sea de usuario free
  if (post.tier === "free") {
    setError(t("no_tips_para_free"));
    setLoadingAction(null);
    return;
  }

  try {
    const amount = Number(tipAmount);

    const payRes = await MiniKit.commandsAsync.pay({
      reference: `tip-${post.id}-${Date.now()}`.slice(0, 36), // <= 36 chars
      to: RECEIVER,
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(amount, Tokens.WLD).toString(),
        },
      ],
      description: t("tip"),
    });

    if (payRes?.finalPayload?.status === "success") {
      setTipAmount(1); // opcional: reset al valor por defecto
    } else {
      setError(t("pago_cancelado"));
    }
  } catch (err: any) {
    setError(t("error_procesar_pago") + ": " + (err.message || t("pago_cancelado")));
  } finally {
    setLoadingAction(null);
  }
};

// --- HANDLE BOOST ---
const handleBoost = async () => {
  if (!currentUserId) return setError(t("debes_estar_logueado"));
  setLoadingAction("boost");
  setError(null);

  try {
    const payRes = await MiniKit.commandsAsync.pay({
      reference: `boost-${post.id}-${Date.now()}`.slice(0, 36), // <= 36 chars
      to: RECEIVER,
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(5, Tokens.WLD).toString(),
        },
      ],
      description: t("boost_5_wld"),
    });

    if (payRes?.finalPayload?.status !== "success") {
      setError(t("pago_cancelado"));
    }
  } catch (err: any) {
    setError(t("error_procesar_pago") + ": " + (err.message || t("pago_cancelado")));
  } finally {
    setLoadingAction(null);
  }
};

// --- HANDLE CHAT CREADORES ---
const handleChatCreadores = async () => {
  if (!currentUserId) {
    setError(t("debes_estar_logueado"));
    return;
  }

  if (checkingAccess) {
    console.log("Aún verificando acceso, espera un momento...");
    return;
  }

  console.log("handleChatCreadores ejecutado", {
    hasChatAccess,
    checkingAccess,
    currentUserId
  });

  // ── YA TIENE ACCESO ──
  if (hasChatAccess) {
    console.log("Usuario ya tiene acceso → mostrando chat overlay");
    setShowGlobalChat(true);
    return;
  }

  // ── NO TIENE ACCESO → PROCESO DE PAGO ──
  setLoadingAction("subscription");
  setError(null);

  try {
    console.log("Iniciando pago para chat exclusivo...");

    const payRes = await MiniKit.commandsAsync.pay({
      reference: `chat-${Date.now()}`.slice(0, 36),
      to: RECEIVER,
      tokens: [
        {
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(5, Tokens.WLD).toString(),
        },
      ],
      description: t("chat_exclusivo"),
    });

    console.log("Resultado del pago:", payRes);

    if (payRes?.finalPayload?.status === "success") {
      console.log("Pago exitoso → guardando suscripción en DB");

      const { error: dbError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: currentUserId,
          product: "chat_classic", // o "chat_gold" si es el caso
        });

      if (dbError) {
        console.error("Error al guardar suscripción:", dbError);
        setError("Pago recibido, pero hubo un error al guardar. Contacta soporte.");
        return;
      }

      console.log("Suscripción guardada exitosamente");

      // Actualizamos estados
      setHasChatAccess(true);
      setShowGlobalChat(true);           // ← MOSTRAMOS EL CHAT
      setLoadingAction(null);
    } else {
      console.log("Pago no completado o cancelado");
      setError(t("pago_cancelado"));
      setLoadingAction(null);
    }
  } catch (err: any) {
    console.error("Error completo en handleChatCreadores:", err);
    setError(
      t("error_procesar_pago") + ": " + (err.message || t("pago_cancelado"))
    );
    setLoadingAction(null);
  }
};
         

  
  const openUserProfile = () => {
    window.location.href = `/profile/${post.user_id}`;
  };

  return (
    <div
      ref={postRef}
      className={`p-4 rounded-xl ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-100"
      } border border-gray-700 mb-4 shadow-md`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border-2 border-purple-600 cursor-pointer"
          onClick={openUserProfile}
        >
          {postProfile?.avatar_url ? (
  <img
     src={postProfile.avatar_url}
    alt={t("avatar")}
    className="w-full h-full object-cover"
   />
 ) : (
   <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold">
    {postProfile?.username?.[0]?.toUpperCase() || "?"}
  </div>
 )}
        </div>

        <div className="flex-1">
          <p className="font-bold text-lg">
  {postProfile?.username} {currentUserId === post.user_id ? "(Tú)" : ""}
</p>
<p className="text-sm text-gray-500">
  @{postProfile?.username}
</p>
          <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-900"}`}>
            {getRelativeTime(post.timestamp)}
         </p>
        </div>


        
        {currentUserId && currentUserId !== post.user_id && (
          <button
            onClick={toggleFollow}
            className={`ml-auto px-4 py-1 rounded-full text-sm font-medium transition ${
              isFollowing
                ? "bg-gray-700 text-gray-300"
                : "bg-purple-600 text-white"
            } hover:opacity-90`}
          >
            {isFollowing ? t("siguiendo") : t("seguir")}
          </button>
        )}
      </div>

      {/* Content */}

{post.reposted_post_id && (
  <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
    <span>🔁</span>
    <span>
      Reposteado por <b>@{postProfile?.username}</b>
    </span>
  </div>
)}

<p className={`whitespace-pre-wrap mb-4 leading-relaxed ${
  theme === "dark" ? "text-white" : "text-gray-900"
}`}>
  {post.content}
</p>

{originalPost && (
  <div className="mt-3 p-3 border border-gray-700 rounded-xl">
    <p className="text-sm text-gray-300">
      {originalPost.content}
    </p>

    {originalPost.image_url && (
      <img
        src={originalPost.image_url}
        className="mt-2 rounded-lg"
        alt="original"
      />
    )}
  </div>
)}

      {/* Actions */}
      <div className="flex justify-between items-center text-gray-400 text-sm mt-4">
        <div className="flex gap-8">
          <button
            onClick={handleLike}
            disabled={loadingAction === "like"}
            className={`flex items-center gap-1 transition ${
              liked ? "text-red-500" : "hover:text-red-500"
            }`}
          >
            {liked ? "❤️" : "♡"} {likes}
          </button>

          <button
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="flex items-center gap-1 hover:text-blue-500 transition"
          >
            💬 {comments}
          </button>

          <button
            onClick={handleRepost}
            disabled={loadingAction === "repost"}
            className="flex items-center gap-1 hover:text-green-500 transition"
          >
            🔁 {reposts}
          </button>
        </div>

        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="0.1"
              value={tipAmount}
              onChange={(e) =>
                setTipAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-16 p-1 bg-gray-800 text-white rounded text-sm"
              placeholder="1"
            />
            <button
              onClick={handleTip}
              disabled={loadingAction === "tip"}
              className="px-4 py-1 bg-yellow-600 text-white rounded-full text-xs hover:bg-yellow-700 transition disabled:opacity-50"
            >
              {t("tip")}
            </button>
          </div>

          <button
            onClick={handleBoost}
            disabled={loadingAction === "boost"}
            className="px-4 py-1 bg-purple-600 text-white rounded-full text-xs hover:bg-purple-700 transition disabled:opacity-50"
          >
            {t("boost_5_wld")}
          </button>
        </div>
      </div>

      {/* Comment input */}
      {showCommentInput && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            placeholder={t("escribe_comentario")}
            className="flex-1 bg-gray-800 p-2 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleComment}
            disabled={loadingAction === "comment" || !commentInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {loadingAction === "comment" ? "..." : t("enviar")}
          </button>
        </div>
      )}

      {/* Comments list */}
      {comments > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-purple-400 hover:text-purple-300 text-sm font-medium flex items-center gap-1 transition"
          >
            {showComments
              ? t("ocultar_comentarios")
              : t("ver_comentarios")}{" "}
            {comments}
          </button>

          {showComments && (
            <div className="mt-2 space-y-3 max-h-60 overflow-y-auto">
              {loadingComments ? (
                <p className="text-gray-500 text-sm">
                  {t("cargando_comentarios")}
                </p>
              ) : commentsList.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {t("no_hay_comentarios")}
                </p>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="bg-gray-800 p-3 rounded text-sm">
                    <p className="font-bold">
                      {globalUsername || c.profiles?.username}
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

      {currentUserId && (
        <button
          onClick={handleChatCreadores}
          disabled={loadingAction === "subscription" || checkingAccess}
          className="w-full py-2 bg-indigo-600 text-white rounded-full mt-4 hover:bg-indigo-700 text-sm font-medium transition disabled:opacity-50"
        >
          {loadingAction === "subscription" ? "Procesando..." : t("chat_exclusivo")}
        </button>
      )}

      {error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-gray-900 p-6 rounded-xl max-w-sm w-full text-center">
            <p className="text-white mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showRepostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-white text-xl font-bold mb-4 text-center">
              {t("repost")}
            </h3>

            <div className="flex flex-col gap-4">
              <button
                onClick={confirmRepost}
                className="py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
              >
                {t("repost")}
              </button>

              <button
                onClick={confirmQuote}
                className="py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition"
              >
                {t("citar_post")}
              </button>

              <input
                type="text"
                value={quoteInput}
                onChange={(e) => setQuoteInput(e.target.value)}
                placeholder={t("escribe_para_citar")}
                className="w-full p-2 rounded bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              <button
                onClick={() => setShowRepostModal(false)}
                className="py-3 text-gray-400 hover:text-gray-300 transition"
              >
                {t("cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGlobalChat && (
        <div className="fixed inset-0 z-[99999] bg-black/95 flex flex-col">
          <button
            onClick={() => setShowGlobalChat(false)}
            className="absolute top-5 right-5 z-20 bg-gray-900/90 text-white px-6 py-3 rounded-full backdrop-blur-md border border-gray-700 shadow-2xl text-base font-medium hover:bg-gray-800 transition"
          >
            ← Volver al feed
          </button>

          <div className="flex-1 pt-16 overflow-hidden">
            <GlobalChatRoom currentUserId={currentUserId!} roomId="premium_global_chat" />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
            
