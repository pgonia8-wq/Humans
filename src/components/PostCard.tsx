import React, { useState, useEffect, useContext, useRef, lazy, Suspense } from "react";
import { trackImpression, trackClick } from "../../dashboard/src/lib/tracking";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { useFollow } from "../lib/useFollow";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useLanguage } from "../LanguageContext";
const GlobalChatRoom = React.lazy(() => import("../pages/chat/GlobalChatRoom"));
const ProfileModal = lazy(() => import("./ProfileModal"));
import { LIKE_VALUE_WLD, calculatePostEarnings, incrementLikeCount } from "../lib/economy";

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

const RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || "";
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

  const [showWldAnimation, setShowWldAnimation] = useState(false);
  const [hasSeenTooltip] = useState(() => {
    try { return localStorage.getItem("h_like_tooltip_seen") === "1"; } catch { return false; }
  });
  const [showLikeTooltip, setShowLikeTooltip] = useState(false);

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
                pid: post.id
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
      const { data: result } = await supabase.rpc("toggle_like", {
          p_post_id: post.id,
          p_user_id: currentUserId,
        });

        if (result && !result.liked) {
          setLiked(false);
          setLikes(result.likes ?? likes - 1);
        } else if (result && result.liked) {
          setLiked(true);
          setLikes(result.likes ?? likes + 1);
          incrementLikeCount(currentUserId);
        setShowWldAnimation(true);
        setTimeout(() => setShowWldAnimation(false), 1200);
        if (!hasSeenTooltip) {
          setShowLikeTooltip(true);
          try { localStorage.setItem("h_like_tooltip_seen", "1"); } catch {}
          setTimeout(() => setShowLikeTooltip(false), 4000);
        }
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
        const transactionId = payRes.finalPayload.transaction_id;
        try {
          const verifyRes = await fetch("/api/verifyPayment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, userId: currentUserId, action: "tip", postId: post.id, amount: Number(tipAmount) }),
          });
          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            setError("Error al verificar tip: " + (errData.error || "HTTP " + verifyRes.status));
            return;
          }
        } catch (verifyErr) {
          setError("Error de red al verificar tip: " + (verifyErr instanceof Error ? verifyErr.message : ""));
          return;
        }
        await supabase.rpc("add_tip", {
            p_post_id: post.id,
            p_from_user: currentUserId,
            p_amount: Number(tipAmount),
          });
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
        const transactionId = payRes.finalPayload.transaction_id;
        try {
          const verifyRes = await fetch("/api/verifyPayment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, userId: currentUserId, action: "boost", postId: post.id }),
          });
          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            setError("Error al verificar boost: " + (errData.error || "HTTP " + verifyRes.status));
            return;
          }
        } catch (verifyErr) {
          setError("Error de red al verificar boost: " + (verifyErr instanceof Error ? verifyErr.message : ""));
          return;
        }
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
      return;
    }
    if (hasChatAccess) {
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
      if (payRes?.finalPayload?.status === "success") {
        const transactionId = payRes.finalPayload.transaction_id;
        try {
          const verifyRes = await fetch("/api/verifyPayment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, userId: currentUserId, action: "chat_classic" }),
          });
          if (!verifyRes.ok) {
            const errData = await verifyRes.json().catch(() => ({}));
            setError("Error al verificar pago: " + (errData.error || "HTTP " + verifyRes.status));
            return;
          }
        } catch (verifyErr) {
          setError("Error de red al verificar pago: " + (verifyErr instanceof Error ? verifyErr.message : ""));
          return;
        }
        setHasChatAccess(true);
        setShowGlobalChat(true);
        setLoadingAction(null);
      } else {
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

  // ── Blocked state ──────────────────────────────────────────────────
  if (blocked) return (
    <div className={`w-full px-6 py-3.5 border-b flex items-center justify-between gap-3 text-sm ${
      isDark ? "bg-[#0a0a0a] border-white/[0.06]" : "bg-[#f8f9fa] border-gray-100"
    }`}>
      <span className={isDark ? "text-gray-700" : "text-gray-400"}>
        Has bloqueado a este usuario.
      </span>
      <button
        onClick={handleUnblock}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105 active:scale-95 ${
          isDark
            ? "border-white/10 text-gray-500 hover:border-indigo-500/40 hover:text-indigo-400"
            : "border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500"
        }`}
      >
        Desbloquear
      </button>
    </div>
  );

  const isBoosted = post?.is_boosted && post?.boosted_until && new Date(post.boosted_until) > new Date();
  const estimatedEarnings = calculatePostEarnings(post, currentUserId);

  return (
    <div
      ref={postRef}
      className={`
        relative w-full px-4 pt-5 pb-4
        border-b transition-colors duration-200
        ${isBoosted
          ? isDark
            ? "border-orange-800/25"
            : "border-orange-200/50"
          : isDark
            ? "border-white/[0.07]"
            : "border-black/[0.06]"
        }
      `}
      style={isBoosted ? {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: isDark
          ? "linear-gradient(180deg, rgba(120,53,15,0.18) 0%, rgba(17,17,19,0.95) 100%)"
          : "linear-gradient(180deg, rgba(255,237,213,0.60) 0%, #ffffff 100%)",
        boxShadow: isDark
          ? "0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(251,146,60,0.08)"
          : "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)",
      } : {
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: isDark
          ? "linear-gradient(180deg, #1a1a1d 0%, #111113 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #fafafa 60%, #f4f4f8 100%)",
        boxShadow: isDark
          ? "0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)"
          : "0 4px 20px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)",
      }}
      onClick={isAd ? handleAdClick : undefined}
    >

      {/* Boosted indicator */}
      {isBoosted && (
        <div className="flex items-center gap-1.5 mb-3 ml-16">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, rgba(251,146,60,0.15), rgba(245,158,11,0.15))", border: "1px solid rgba(251,146,60,0.25)" }}>
            <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wide">Boosted</span>
          </div>
        </div>
      )}

      {/* Repost banner */}
      {post.reposted_post_id && (
        <div className={`flex items-center gap-2 mb-3 ml-16 text-xs font-medium ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
          </svg>
          <span className="truncate">Reposteado por <b className="font-semibold">@{postProfile?.username}</b></span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 min-w-0">
        {/* Avatar 52px con badge World Verified */}
        <div className="relative flex-shrink-0 cursor-pointer" onClick={openUserProfile}>
          <div
            className={`w-[52px] h-[52px] rounded-full overflow-hidden transition-all duration-200 hover:scale-105 ${
              isDark ? "ring-2 ring-white/20" : "ring-2 ring-black/10"
            }`}
            style={{ background: isDark ? "#1f2937" : "#e5e7eb" }}
          >
            {postProfile?.avatar_url ? (
              <img
                src={postProfile.avatar_url}
                alt={t("avatar")}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
              >
                {postProfile?.username?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          {/* World Verified badge */}
          <div
            className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md"
            style={{ background: "#22c55e", border: isDark ? "2px solid #0a0a0a" : "2px solid #ffffff" }}
          >
            <span className="text-white font-extrabold leading-none" style={{ fontSize: 9 }}>W</span>
          </div>
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
                  <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isDark ? "bg-indigo-500/15 text-indigo-400" : "bg-indigo-50 text-indigo-500"}`}>
                    Tú
                  </span>
                )}
              </span>
              <span className={`text-sm truncate ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                @{postProfile?.username}
              </span>
              <span className={`text-xs ${isDark ? "text-gray-700" : "text-gray-300"}`}>·</span>
              <span className={`text-xs flex-shrink-0 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                {getRelativeTime(post.timestamp)}
              </span>
            </div>

            {currentUserId && currentUserId !== post.user_id && (
              <button
                onClick={toggleFollow}
                className={`
                  ml-auto flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 hover:scale-105 active:scale-95
                  ${isFollowing
                    ? isDark
                      ? "border-white/10 text-gray-400 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/[0.08]"
                      : "border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500"
                    : isDark
                      ? "border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/[0.12]"
                      : "border-indigo-300 text-indigo-500 hover:bg-indigo-50"
                  }
                `}
              >
                {loadingAction === "follow" ? "..." : isFollowing ? t("following") : t("follow")}
              </button>
            )}
          </div>

          {/* Post content */}
          <p className={`mt-2.5 text-sm leading-[1.65] whitespace-pre-wrap break-words ${isDark ? "text-gray-100" : "text-gray-800"}`}>
            {post.content}
          </p>

          {/* Post image */}
          {post.image_url && (
            <div
              className={`mt-3 rounded-2xl overflow-hidden cursor-zoom-in border ${isDark ? "border-white/[0.06]" : "border-gray-100"}`}
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(true); }}
            >
              <img
                src={post.image_url}
                alt="post"
                className="w-full object-cover max-h-96 hover:opacity-95 transition-opacity"
              />
            </div>
          )}

          {/* Original post preview (repost) */}
          {originalPost && (
            <div className={`mt-3 p-4 rounded-2xl border text-sm ${
              isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-gray-50 border-gray-100"
            }`}>
              <p className={`font-semibold text-xs mb-1.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                @{originalPost.username || "usuario"}
              </p>
              <p className={`break-words leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                {originalPost.content}
              </p>
            </div>
          )}

          {/* Earnings badge */}
          {estimatedEarnings > 0 && (
            <div className={`flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl w-fit ${
              isDark ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-emerald-50 border border-emerald-100"
            }`}>
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-emerald-500">
                +{estimatedEarnings.toFixed(4)} WLD
              </span>
            </div>
          )}

          {/* ── Action bar ─────────────────────────────────────── */}
          <div className="flex items-center mt-4 gap-1">

            {/* ── Izquierda: Like · Comment · Repost ── */}
            <div className="flex items-center gap-0.5 flex-shrink-0">

              {/* Like */}
              <div className="relative">
                <button
                  onClick={handleLike}
                  disabled={loadingAction === "like"}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-[0.97] ${
                    liked
                      ? "text-pink-500 bg-pink-500/10"
                      : isDark
                        ? "text-gray-500 hover:text-pink-400 hover:bg-pink-500/[0.09]"
                        : "text-gray-400 hover:text-pink-500 hover:bg-pink-50"
                  }`}
                >
                  <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  {likes > 0 && <span className="tabular-nums">{likes}</span>}
                </button>
                {showWldAnimation && LIKE_VALUE_WLD > 0 && (
                  <span
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-400 pointer-events-none whitespace-nowrap"
                    style={{ animation: "wldFloat 1.2s ease-out forwards" }}
                  >
                    +{LIKE_VALUE_WLD} WLD
                  </span>
                )}
                {showLikeTooltip && (
                  <div className={`absolute bottom-full left-0 mb-2 w-52 px-3 py-2.5 rounded-2xl text-xs shadow-xl z-30 ${
                    isDark ? "bg-[#1a1a1d] text-gray-200 border border-white/[0.08]" : "bg-white text-gray-700 border border-gray-100 shadow-lg"
                  }`}>
                    Cada like suma valor. Publica y gana WLD con el engagement de tu contenido.
                  </div>
                )}
              </div>

              {/* Comment */}
              <button
                onClick={() => {
                  setShowCommentInput((v) => !v);
                  setShowComments((v) => !v);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-[0.97] ${
                  isDark
                    ? "text-gray-500 hover:text-blue-400 hover:bg-blue-500/[0.09]"
                    : "text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                {comments > 0 && <span className="tabular-nums">{comments}</span>}
              </button>

              {/* Repost */}
              <button
                onClick={handleRepost}
                disabled={loadingAction === "repost"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-[0.97] ${
                  isDark
                    ? "text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/[0.09]"
                    : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-50"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                </svg>
                {reposts > 0 && <span className="tabular-nums">{reposts}</span>}
              </button>
            </div>

            {/* ── Derecha: Tip · Boost · Chat · Options ── */}
            <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">

              {/* Tip — peso metálico con destello plata */}
              <button
                onClick={handleTip}
                disabled={loadingAction === "tip"}
                title={`Tip ${tipAmount} WLD`}
                className={`relative flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 hover:scale-105 active:scale-[0.97] overflow-hidden flex-shrink-0 ${
                  loadingAction === "tip" ? "opacity-60" : ""
                }`}
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)"
                    : "linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)",
                  border: "1px solid rgba(161,161,170,0.30)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.40), inset 0 1px 0 rgba(161,161,170,0.12)",
                  color: "#d4d4d8",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent 20%, rgba(161,161,170,0.22) 50%, transparent 80%)",
                    animation: "tipShimmer 2.8s linear infinite",
                  }}
                />
                <span className="relative z-10 text-[13px] font-black leading-none" style={{ color: "#a1a1aa" }}>₱</span>
                <span className="relative z-10">{t("tip")}</span>
              </button>

              {/* Boost — rayo metálico con destello rojo-fuego */}
              <button
                onClick={handleBoost}
                disabled={loadingAction === "boost"}
                title="Boost (5 WLD)"
                className={`relative w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-105 active:scale-[0.97] overflow-hidden flex-shrink-0 ${
                  loadingAction === "boost" ? "opacity-60" : ""
                }`}
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #1a0d0d 0%, #2d1010 100%)"
                    : "linear-gradient(135deg, #1a0505 0%, #2a0a0a 100%)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(239,68,68,0.10)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent 20%, rgba(239,68,68,0.28) 50%, transparent 80%)",
                    animation: "boostFlare 2.2s linear infinite",
                  }}
                />
                <svg className="w-3.5 h-3.5 relative z-10" fill="none" stroke="#ef4444" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </button>

              {/* Options menu */}
              {currentUserId && (
                <div className="relative">
                  <button
                    onClick={() => setShowOptionsMenu((v) => !v)}
                    className={`p-1.5 rounded-full transition-colors ${
                      isDark ? "text-gray-600 hover:text-gray-400 hover:bg-white/[0.06]" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                    </svg>
                  </button>

                  {showOptionsMenu && (
                    <div className={`absolute right-0 top-8 z-[9999] rounded-2xl border shadow-2xl overflow-hidden w-40 ${
                      isDark ? "bg-[#141416] border-white/[0.08]" : "bg-white border-gray-100 shadow-xl"
                    }`}>
                      {currentUserId !== post.user_id && (
                        <>
                          <button
                            onClick={() => { setShowOptionsMenu(false); setShowReportModal(true); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition ${
                              isDark ? "text-orange-400 hover:bg-white/[0.04]" : "text-orange-500 hover:bg-gray-50"
                            }`}
                          >
                            Reportar
                          </button>
                          <button
                            onClick={handleBlock}
                            className={`w-full text-left px-4 py-2.5 text-sm transition ${
                              isDark ? "text-red-400 hover:bg-white/[0.04]" : "text-red-500 hover:bg-gray-50"
                            }`}
                          >
                            Bloquear
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowOptionsMenu(false)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${
                          isDark ? "text-gray-500 hover:bg-white/[0.04]" : "text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        Cerrar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Comment input */}
          {showCommentInput && (
            <div className="mt-3.5 flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }}
                placeholder={t("escribe_comentario")}
                className={`flex-1 min-w-0 text-sm px-4 py-2.5 rounded-2xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${
                  isDark
                    ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-gray-600"
                    : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
                }`}
              />
              <button
                onClick={handleComment}
                disabled={loadingAction === "comment" || !commentInput.trim()}
                className="flex-shrink-0 px-4 py-2.5 text-white text-xs font-semibold rounded-2xl transition hover:opacity-90 disabled:opacity-40 active:scale-95"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
              >
                {loadingAction === "comment" ? "..." : t("send") || "Enviar"}
              </button>
            </div>
          )}

          {/* Comments list */}
          {showComments && (
            <div className="mt-3 space-y-2">
              {loadingComments ? (
                <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>Cargando...</p>
              ) : commentsList.length === 0 ? (
                <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>Sin comentarios aún.</p>
              ) : (
                commentsList.map((c: any) => (
                  <div key={c.id} className={`flex gap-2.5 p-3 rounded-2xl ${
                    isDark ? "bg-white/[0.03] border border-white/[0.05]" : "bg-gray-50 border border-gray-100"
                  }`}>
                    <div
                      className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
                    >
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-[10px] text-white font-bold">{(c.profiles?.username || "?")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {c.profiles?.username || "Usuario"}
                      </span>
                      <p className={`text-xs mt-0.5 break-words leading-relaxed ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                        {c.content}
                      </p>
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
          className="fixed inset-0 z-[99999] bg-black/97 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(20px)" }}
          onClick={() => setFullscreenImage(false)}
        >
          <button
            onClick={() => setFullscreenImage(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition border border-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={post.image_url}
            alt="post fullscreen"
            className="max-w-full max-h-full object-contain rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/75" style={{ backdropFilter: "blur(16px)" }}>
          <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl border ${
            isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-100"
          }`}>
            <button
              onClick={() => { setShowReportModal(false); setReportReason(""); }}
              className={`absolute top-4 right-4 p-1.5 rounded-full transition ${
                isDark ? "text-gray-600 hover:text-gray-300 hover:bg-white/[0.06]" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className={`text-base font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
              Reportar contenido
            </h3>
            <p className={`text-xs mb-5 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
              Cuéntanos qué está pasando con este post o usuario.
            </p>

            {reportSent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>Reporte enviado</p>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Gracias por ayudarnos a mejorar.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
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
                    className={`w-full text-left px-4 py-2.5 rounded-2xl text-sm border transition-all ${
                      reportReason === reason
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                        : isDark
                          ? "border-white/[0.07] text-gray-400 hover:bg-white/[0.03]"
                          : "border-gray-100 text-gray-600 hover:bg-gray-50"
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
                  className={`w-full mt-1 px-4 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition ${
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-white placeholder-gray-600"
                      : "bg-gray-50 border-gray-100 text-gray-800 placeholder-gray-400"
                  }`}
                />

                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setShowReportModal(false); setReportReason(""); }}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-medium border transition ${
                      isDark
                        ? "border-white/[0.07] text-gray-500 hover:bg-white/[0.03]"
                        : "border-gray-100 text-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim()}
                    className="flex-1 py-2.5 text-white text-sm font-semibold rounded-2xl transition disabled:opacity-40 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #ea580c, #f97316)" }}
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
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 px-4" style={{ backdropFilter: "blur(12px)" }}>
          <div className={`rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border ${
            isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-100"
          }`}>
            <p className={`text-sm mb-5 leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>{error}</p>
            <button
              onClick={() => setError(null)}
              className="px-6 py-2.5 text-white text-sm font-semibold rounded-2xl transition hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Repost modal */}
      {showRepostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4" style={{ backdropFilter: "blur(12px)" }}>
          <div className={`rounded-3xl p-6 w-full max-w-sm shadow-2xl border ${
            isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-100"
          }`}>
            <h3 className={`text-base font-bold mb-5 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              {t("repost")}
            </h3>

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmRepost}
                className="py-3 text-white text-sm font-bold rounded-2xl transition hover:opacity-90 active:scale-95"
                style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
              >
                {t("repost")}
              </button>

              <div className={`flex gap-2 p-3 rounded-2xl border ${
                isDark ? "bg-white/[0.03] border-white/[0.07]" : "bg-gray-50 border-gray-100"
              }`}>
                <input
                  type="text"
                  value={quoteInput}
                  onChange={(e) => setQuoteInput(e.target.value)}
                  placeholder={t("escribe_para_citar")}
                  className={`flex-1 bg-transparent text-sm focus:outline-none ${
                    isDark ? "text-white placeholder-gray-600" : "text-gray-800 placeholder-gray-400"
                  }`}
                />
              </div>

              <button
                onClick={confirmQuote}
                className={`py-3 text-sm font-semibold rounded-2xl transition border hover:scale-[1.02] active:scale-95 ${
                  isDark ? "border-white/[0.08] text-gray-300 hover:bg-white/[0.04]" : "border-gray-100 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t("citar_post")}
              </button>

              <button
                onClick={() => setShowRepostModal(false)}
                className={`py-2 text-sm transition ${isDark ? "text-gray-600 hover:text-gray-400" : "text-gray-400 hover:text-gray-500"}`}
              >
                {t("cancelar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ProfileModal — requiere Suspense porque está importado con lazy() */}
      {profileModalUserId && (
        <React.Suspense fallback={null}>
          <ProfileModal
            id={profileModalUserId}
            currentUserId={currentUserId}
            onClose={() => setProfileModalUserId(null)}
          />
        </React.Suspense>
      )}

      {/* Global Chat overlay */}
      {showGlobalChat && currentUserId && (
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{ background: "rgba(10,10,10,0.97)", backdropFilter: "blur(20px)" }}>
          <button
            onClick={() => setShowGlobalChat(false)}
            className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium transition hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al feed
          </button>

          <div className="flex-1 pt-16 overflow-hidden">
            <React.Suspense fallback={null}>
              <GlobalChatRoom
                isOpen={showGlobalChat}
                onClose={() => setShowGlobalChat(false)}
                currentUserId={currentUserId}
              />
            </React.Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
