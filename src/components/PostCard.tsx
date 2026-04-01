import React, { useState, useEffect, useContext, useRef } from "react";
import { trackImpression, trackClick } from "../../dashboard/src/lib/tracking";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { useFollow } from "../lib/useFollow";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useLanguage } from "../LanguageContext";
import GlobalChatRoom from "../pages/chat/GlobalChatRoom";
import ProfileModal from "./ProfileModal";

// [E3] Helper para generar UUID v4 válido para referencias de pago Worldcoin
function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const getRelativeTime = (timestamp: string | null) => {
  if (!timestamp) return "Desconocida";
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "ahora mismo";
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
const CPC_BY_COUNTRY: Record<string, number> = {
  US: 0.08,
  GB: 0.07,
  DE: 0.07,
  FR: 0.06,
  ES: 0.05,
  MX: 0.04,
  AR: 0.03,
  IN: 0.02,
  DEFAULT: 0.03,
};

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId }) => {
  const [userData, setUserData] = useState<any>(null);

  // [E13] hasClicked se usa ahora para trackClick en anuncios
  const hasClicked = useRef(false);
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (!post?.id || !post.is_ad || !userData || hasTrackedImpression.current) return;

    hasTrackedImpression.current = true;

    trackImpression({
      postId: post.id,
      campaignId: post.campaign_id,
      userData,
    });
  }, [post?.id, userData]);

  const { theme, username: globalUsername } = useContext(ThemeContext);
  const { t } = useLanguage();
  const postRef = useRef<HTMLDivElement | null>(null);
  const viewRegistered = useRef(false);
  const isAd = post.is_ad === true;
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

  const [originalPost, setOriginalPost] = useState<any | null>(null);
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [quoteInput, setQuoteInput] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);

  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);

  // [E5] Corregido: usar .limit(1) en lugar de .maybeSingle() para evitar error
  useEffect(() => {
    const checkChatAccess = async () => {
      if (!currentUserId) {
        setCheckingAccess(false);
        return;
      }
      const { data, error } = await supabase
        .from("subscriptions")
        .select("product")
        .eq("user_id", currentUserId)
        .in("product", ["chat_classic", "chat_gold"])
        .limit(1);
      if (error) {
        console.error("Error consultando suscripción:", error);
      }
      if (data && data.length > 0) {
        setHasChatAccess(true);
      }
      setCheckingAccess(false);
    };
    checkChatAccess();
  }, [currentUserId]);

  useEffect(() => {
    const checkIfBlocked = async () => {
      if (!currentUserId || !post.user_id) return;
      const { data } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", post.user_id)
        .maybeSingle();
      if (data) setBlocked(true);
    };
    checkIfBlocked();
  }, [currentUserId, post.user_id]);

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
        setOriginalPost(data);
      }
    };
    fetchOriginalPost();
  // [E1] Corregido: dependencia inválida `post && post.reposted_post_id` → `post?.reposted_post_id`
  }, [post?.reposted_post_id]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!currentUserId) return;

      const { data } = await supabase
        .from("profiles")
        .select("country, language, interests")
        .eq("id", currentUserId)
        .single();

      setUserData(data);
    };

    fetchUser();
  }, [currentUserId]);

  const [error, setError] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState<number | "">(1);
  const [showRepostModal, setShowRepostModal] = useState(false);

  const { isFollowing, toggleFollow } = useFollow(currentUserId, post.user_id);
  const [postProfile, setPostProfile] = useState<{ username: string; avatar_url: string } | null>(null);

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

  // [E6] Verificar si el usuario actual ya dio like al montar el componente
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentUserId || !post.id) return;
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (data) setLiked(true);
    };
    checkIfLiked();
  }, [currentUserId, post.id]);

  useEffect(() => {
    if (!postRef.current || viewRegistered.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !viewRegistered.current) {
          viewRegistered.current = true;

          try {
            if (isAd) {
              await supabase.rpc("increment_ad_impression", {
                campaign_id_input: post.campaign_id,
                cost_per_impression: "0.01"
              });
            } else {
              await supabase.rpc("increment_post_views", {
                post_id_input: post.id
              });
            }
          } catch (err) {
            console.error("Error:", err);
          }

          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(postRef.current);
    return () => observer.disconnect();
  // [E2] Corregido: eliminado `t` de las dependencias
  }, [post.id]);

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

  const handleLike = async () => {
    if (!currentUserId) return setError(t("debes_estar_logueado"));
    setError(null);
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
        setLikes((prev: number) => prev - 1);
      } else {
        await supabase.from("likes").insert({ post_id: post.id, user_id: currentUserId });
        await supabase.from("posts").update({ likes: likes + 1 }).eq("id", post.id);
        setLiked(true);
        setLikes((prev: number) => prev + 1);
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
    setError(null);
    setLoadingAction("comment");
    try {
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

      await supabase
        .from("posts")
        .update({ comments: comments + 1 })
        .eq("id", post.id);

      setCommentInput("");
      setShowCommentInput(false);
      setShowComments(true);
      setComments((prev: number) => prev + 1);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", currentUserId)
        .single();

      setCommentsList((prev) => [
        { ...newComment, profiles: profileData },
        ...prev,
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
    setError(null);
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
    setError(null);
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

  const handleTip = async () => {
    if (!currentUserId) return setError(t("debes_estar_logueado"));
    setLoadingAction("tip");
    setError(null);
    if (tipAmount === "" || Number(tipAmount) < 1) {
      setError(t("min_wld"));
      setLoadingAction(null);
      return;
    }
    if (post.tier === "free") {
      setError(t("no_tips_para_free"));
      setLoadingAction(null);
      return;
    }
    if (!MiniKit.isInstalled()) {
      setError("World App no detectada. Abre esta app desde World App.");
      setLoadingAction(null);
      return;
    }
    try {
      const amount = Number(tipAmount);
      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference(),
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
        setTipAmount(1);
      } else {
        setError(t("pago_cancelado"));
      }
    } catch (err: any) {
      setError(t("error_procesar_pago") + ": " + (err.message || t("pago_cancelado")));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBoost = async () => {
    if (!currentUserId) return setError(t("debes_estar_logueado"));

    if (!MiniKit.isInstalled()) {
      setError("World App no detectada. Abre esta app desde World App.");
      return;
    }

    setLoadingAction("boost");
    setError(null);

    try {
      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference(),
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(5, Tokens.WLD).toString(),
          },
        ],
        description: t("boost_5_wld"),
      });

      if (payRes?.finalPayload?.status === "success") {
        await supabase
          .from("posts")
          .update({
            is_boosted: true,
            boosted_until: new Date(Date.now() + 86400000).toISOString()
          })
          .eq("id", post.id);
      } else {
        setError(t("pago_cancelado"));
      }

    } catch (err: any) {
      setError(t("error_procesar_pago") + ": " + (err.message || t("pago_cancelado")));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChatCreadores = async () => {
    if (!currentUserId) {
      setError(t("debes_estar_logueado"));
      return;
    }
    if (checkingAccess) {
      console.log("Aún verificando acceso, espera un momento...");
      return;
    }
    console.log("handleChatCreadores ejecutado", { hasChatAccess, checkingAccess, currentUserId });
    if (hasChatAccess) {
      console.log("Usuario ya tiene acceso → mostrando chat overlay");
      setShowGlobalChat(true);
      return;
    }
    if (!MiniKit.isInstalled()) {
      setError("World App no detectada. Abre esta app desde World App.");
      return;
    }
    setLoadingAction("subscription");
    setError(null);
    try {
      console.log("Iniciando pago para chat exclusivo...");
      const payRes = await MiniKit.commandsAsync.pay({
        reference: generatePayReference(),
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
            product: "chat_classic",
          });
        if (dbError) {
          console.error("Error al guardar suscripción:", dbError);
          setError("Pago recibido, pero hubo un error al guardar. Contacta soporte.");
          return;
        }
        console.log("Suscripción guardada exitosamente");
        setHasChatAccess(true);
        setShowGlobalChat(true);
        setLoadingAction(null);
      } else {
        console.log("Pago no completado o cancelado");
        setError(t("pago_cancelado"));
        setLoadingAction(null);
      }
    } catch (err: any) {
      console.error("Error completo en handleChatCreadores:", err);
      setError(t("error_procesar_pago") + ": " + (err.message || t("pago_cancelado")));
      setLoadingAction(null);
    }
  };

  const handleReport = async () => {
    if (!currentUserId) return setError(t("debes_estar_logueado"));
    if (!reportReason.trim()) return;
    try {
      await supabase.from("reports").insert({
        reporter_id: currentUserId,
        reported_user_id: post.user_id,
        post_id: post.id,
        reason: reportReason.trim(),
        timestamp: new Date().toISOString(),
      });
      setReportSent(true);
      setReportReason("");
      setTimeout(() => {
        setShowReportModal(false);
        setReportSent(false);
      }, 2000);
    } catch (err: any) {
      setError("Error al enviar reporte: " + err.message);
    }
  };

  const handleBlock = async () => {
    if (!currentUserId) return setError(t("debes_estar_logueado"));
    try {
      await supabase.from("blocks").insert({
        blocker_id: currentUserId,
        blocked_id: post.user_id,
        timestamp: new Date().toISOString(),
      });
      setBlocked(true);
      setShowOptionsMenu(false);
    } catch (err: any) {
      setError("Error al bloquear usuario: " + err.message);
    }
  };

  const handleUnblock = async () => {
    if (!currentUserId) return;
    try {
      await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", post.user_id);
      setBlocked(false);
    } catch (err: any) {
      setError("Error al desbloquear: " + err.message);
    }
  };

  const openUserProfile = () => {
    setProfileModalUserId(post.user_id);
  };

  // [E14] Corregido: trackClick se llama al hacer clic en contenido de anuncio
  const handleAdClick = () => {
    if (!isAd || !post?.id || hasClicked.current) return;
    hasClicked.current = true;
    trackClick({
      postId: post.id,
      campaignId: post.campaign_id,
      userData,
    });
  };

  const isDark = theme === "dark";

  if (blocked) return (
    <div className={`w-full max-w-full px-4 py-3 border-b flex items-center justify-between gap-3 text-sm ${isDark ? "bg-black border-gray-800" : "bg-white border-gray-100"}`}>
      <span className={isDark ? "text-gray-600" : "text-gray-400"}>
        Has bloqueado a este usuario.
      </span>
      <button
        onClick={handleUnblock}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
          isDark
            ? "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
            : "border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
        }`}
      >
        Desbloquear
      </button>
    </div>
  );

  return (
    <div
      ref={postRef}
      className={`
        relative w-full max-w-full overflow-hidden px-4 pt-5 pb-6 mb-0
        border-b transition-colors
        ${isDark
          ? "bg-black border-gray-800 hover:bg-gray-950"
          : "bg-white border-gray-100 hover:bg-gray-50"
        }
      `}
      onClick={isAd ? handleAdClick : undefined}
    >

      {/* Repost banner */}
      {post.reposted_post_id && (
        <div className="flex items-center gap-2 mb-3 ml-10 text-xs text-gray-500 font-medium">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
          </svg>
          <span className="truncate">Reposteado por <b>@{postProfile?.username}</b></span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 min-w-0">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 cursor-pointer ring-2 ring-transparent hover:ring-purple-500 transition"
          style={{ background: isDark ? "#1f2937" : "#e5e7eb" }}
          onClick={openUserProfile}
        >
          {postProfile?.avatar_url ? (
            <img
              src={postProfile.avatar_url}
              alt={t("avatar")}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold bg-purple-600">
              {postProfile?.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          {/* Author row */}
          <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span
                className={`font-bold text-sm leading-tight cursor-pointer hover:underline truncate ${isDark ? "text-white" : "text-gray-900"}`}
                onClick={openUserProfile}
              >
                {postProfile?.username}
                {currentUserId === post.user_id && (
                  <span className="ml-1 text-xs font-normal text-gray-500">(Tú)</span>
                )}
              </span>
              <span className="text-gray-500 text-sm truncate">@{postProfile?.username}</span>
              <span className="text-gray-500 text-xs">·</span>
              <span className="text-gray-500 text-xs flex-shrink-0">{getRelativeTime(post.timestamp)}</span>
            </div>

            {currentUserId && currentUserId !== post.user_id && (
              <button
                onClick={toggleFollow}
                className={`
                  ml-auto flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all
                  ${isFollowing
                    ? isDark
                      ? "border-gray-600 text-gray-300 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10"
                      : "border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-500"
                    : isDark
                      ? "border-purple-500 text-purple-400 hover:bg-purple-500/10"
                      : "border-purple-400 text-purple-600 hover:bg-purple-50"
                  }
                `}
              >
                {loadingAction === "follow"
                  ? "..."
                  : isFollowing
                    ? t("following")
                    : t("follow")}
              </button>
            )}
          </div>

          {/* Post content */}
          <p className={`mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${isDark ? "text-gray-100" : "text-gray-800"}`}>
            {post.content}
          </p>

          {/* Post image */}
          {post.image_url && (
            <div
              className="mt-3 rounded-2xl overflow-hidden border border-gray-100/10 cursor-zoom-in"
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(true); }}
            >
              <img
                src={post.image_url}
                alt="post"
                className="w-full object-cover max-h-96"
              />
            </div>
          )}

          {/* Original post preview (repost) */}
          {originalPost && (
            <div className={`mt-3 p-3 rounded-xl border text-sm ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
              <p className={`font-semibold text-xs mb-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                @{originalPost.username || "usuario"}
              </p>
              <p className={`break-words ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {originalPost.content}
              </p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center flex-wrap gap-1 mt-3 -ml-1">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={loadingAction === "like"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                liked
                  ? "text-red-500 bg-red-500/10"
                  : isDark
                    ? "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {likes > 0 && <span>{likes}</span>}
            </button>

            {/* Comment */}
            <button
              onClick={() => {
                setShowCommentInput((v) => !v);
                setShowComments((v) => !v);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isDark
                  ? "text-gray-500 hover:text-blue-400 hover:bg-blue-500/10"
                  : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              {comments > 0 && <span>{comments}</span>}
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              disabled={loadingAction === "repost"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isDark
                  ? "text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                  : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-50"
              }`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
              </svg>
              {reposts > 0 && <span>{reposts}</span>}
            </button>

            {/* Tip */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value === "" ? "" : Number(e.target.value))}
                className={`w-12 text-xs text-center rounded-lg border px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                  isDark
                    ? "bg-gray-900 border-gray-700 text-white"
                    : "bg-gray-50 border-gray-200 text-gray-800"
                }`}
              />
              <button
                onClick={handleTip}
                disabled={loadingAction === "tip"}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isDark
                    ? "text-yellow-500 hover:bg-yellow-500/10"
                    : "text-yellow-600 hover:bg-yellow-50"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                {t("tip")}
              </button>
            </div>

            {/* Boost */}
            <button
              onClick={handleBoost}
              disabled={loadingAction === "boost"}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isDark
                  ? "text-orange-400 hover:bg-orange-500/10"
                  : "text-orange-500 hover:bg-orange-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              Boost
            </button>

            {/* Chat */}
            <button
              onClick={handleChatCreadores}
              disabled={loadingAction === "subscription" || checkingAccess}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                isDark
                  ? "text-violet-400 hover:bg-violet-500/10"
                  : "text-violet-600 hover:bg-violet-50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
              {hasChatAccess ? t("chat") : t("chat_exclusivo")}
            </button>

            {/* Options menu */}
            {currentUserId && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowOptionsMenu((v) => !v)}
                  className={`p-1.5 rounded-full transition-colors ${
                    isDark ? "text-gray-600 hover:text-gray-400 hover:bg-gray-800" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>

                {showOptionsMenu && (
                  <div className={`absolute right-0 top-7 z-20 rounded-xl border shadow-xl overflow-hidden w-40 ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
                    {currentUserId !== post.user_id && (
                      <>
                        <button
                          onClick={() => { setShowOptionsMenu(false); setShowReportModal(true); }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition ${isDark ? "text-orange-400 hover:bg-gray-800" : "text-orange-500 hover:bg-gray-50"}`}
                        >
                          Reportar
                        </button>
                        <button
                          onClick={handleBlock}
                          className={`w-full text-left px-4 py-2.5 text-sm transition ${isDark ? "text-red-400 hover:bg-gray-800" : "text-red-500 hover:bg-gray-50"}`}
                        >
                          Bloquear
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowOptionsMenu(false)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition ${isDark ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-50"}`}
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comment input */}
          {showCommentInput && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
                placeholder={t("escribe_comentario")}
                className={`flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-purple-500 transition ${
                  isDark
                    ? "bg-gray-900 border-gray-700 text-white placeholder-gray-600"
                    : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
                }`}
              />
              <button
                onClick={handleComment}
                disabled={loadingAction === "comment" || !commentInput.trim()}
                className="flex-shrink-0 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition"
              >
                {loadingAction === "comment" ? "..." : t("send") || "Enviar"}
              </button>
            </div>
          )}

          {/* Comments list */}
          {showComments && (
            <div className="mt-3 space-y-2">
              {loadingComments ? (
                <p className="text-xs text-gray-500">Cargando...</p>
              ) : commentsList.length === 0 ? (
                <p className="text-xs text-gray-500">Sin comentarios aún.</p>
              ) : (
                commentsList.map((c: any) => (
                  <div key={c.id} className={`flex gap-2 p-2 rounded-xl ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-purple-600 flex items-center justify-center">
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-[10px] text-white font-bold">{(c.profiles?.username || "?")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>{c.profiles?.username || "Usuario"}</span>
                      <p className={`text-xs mt-0.5 break-words ${isDark ? "text-gray-400" : "text-gray-600"}`}>{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen image overlay */}
      {fullscreenImage && post.image_url && (
        <div
          className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(false)}
        >
          <button
            onClick={() => setFullscreenImage(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-900/80 text-white hover:bg-gray-800 transition backdrop-blur-sm border border-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={post.image_url}
            alt="post fullscreen"
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className={`relative w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <button
              onClick={() => { setShowReportModal(false); setReportReason(""); }}
              className={`absolute top-4 right-4 p-1 rounded-full transition ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className={`text-base font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
              Reportar contenido
            </h3>
            <p className={`text-xs mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Cuéntanos qué está pasando con este post o usuario.
            </p>

            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>Reporte enviado</p>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>Gracias por ayudarnos a mejorar.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {[
                  "Contenido inapropiado",
                  "Spam o publicidad",
                  "Acoso o bullying",
                  "Información falsa",
                  "Otro",
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition ${
                      reportReason === reason
                        ? "border-purple-500 bg-purple-500/10 text-purple-400"
                        : isDark
                          ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {reason}
                  </button>
                ))}

                <textarea
                  value={reportReason && ["Contenido inapropiado","Spam o publicidad","Acoso o bullying","Información falsa","Otro"].includes(reportReason) ? "" : reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe el problema (opcional)..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none transition ${
                    isDark
                      ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600"
                      : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
                  }`}
                />

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setShowReportModal(false); setReportReason(""); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition ${
                      isDark
                        ? "border-gray-700 text-gray-400 hover:bg-gray-800"
                        : "border-gray-200 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim()}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition disabled:opacity-40"
                  >
                    Enviar reporte
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error modal */}
      {error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 px-4">
          <div className={`rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <p className={`text-sm mb-5 ${isDark ? "text-white" : "text-gray-800"}`}>{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-full transition"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Repost modal */}
      {showRepostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className={`rounded-2xl p-5 w-full max-w-sm shadow-2xl border ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
            <h3 className={`text-base font-bold mb-4 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("repost")}
            </h3>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmRepost}
                className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition"
              >
                {t("repost")}
              </button>

              <div className={`flex gap-2 p-2.5 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <input
                  type="text"
                  value={quoteInput}
                  onChange={(e) => setQuoteInput(e.target.value)}
                  placeholder={t("escribe_para_citar")}
                  className={`flex-1 bg-transparent text-sm focus:outline-none ${isDark ? "text-white placeholder-gray-600" : "text-gray-800 placeholder-gray-400"}`}
                />
              </div>

              <button
                onClick={confirmQuote}
                className={`py-2.5 text-sm font-semibold rounded-xl transition border ${isDark ? "border-gray-700 text-gray-200 hover:bg-gray-800" : "border-gray-200 text-gray-700 hover:bg-gray-100"}`}
              >
                {t("citar_post")}
              </button>

              <button
                onClick={() => setShowRepostModal(false)}
                className="py-2 text-sm text-gray-500 hover:text-gray-400 transition"
              >
                {t("cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ProfileModal — CORRECCIÓN F4 */}
      {profileModalUserId && (
        <ProfileModal
          currentUserId={profileModalUserId}
          onClose={() => setProfileModalUserId(null)}
        />
      )}

      {/* Global Chat overlay */}
      {showGlobalChat && currentUserId && (
        <div className="fixed inset-0 z-[99999] bg-black/95 flex flex-col">
          <button
            onClick={() => setShowGlobalChat(false)}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-gray-900/90 text-white px-4 py-2 rounded-full backdrop-blur-md border border-gray-700 shadow-xl text-sm font-medium hover:bg-gray-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al feed
          </button>

          <div className="flex-1 pt-16 overflow-hidden">
            <GlobalChatRoom
              isOpen={showGlobalChat}
              onClose={() => setShowGlobalChat(false)}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
