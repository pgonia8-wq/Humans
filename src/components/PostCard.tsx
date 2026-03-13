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
const DEBUG_PAYMENTS = true; // <--- Activa logs detallados para Eruda

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
  const [tipAmount, setTipAmount] = useState<number>(1); // Dinámico, mínimo 1 WLD

  const { isFollowing, toggleFollow } = useFollow(currentUserId, post.user_id);

  // Real-time (sin cambios)
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

  // Cargar comentarios (sin cambios)
  useEffect(() => {
    if (showComments && post.id) {
      const fetchComments = async () => {
        setLoadingComments(true);
        try {
          const { data, error } = await supabase
            .from("comments")
            .select(`
              *,
              profiles (
                id,
                username,
                avatar_url
              )
            `)
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

  const logPayment = (step: string, data?: any) => {
    if (DEBUG_PAYMENTS) {
      console.log(`[PAYMENT DEBUG] ${step}`, data ? JSON.stringify(data, null, 2) : "");
    }
  };

  const handleTip = async () => {
    if (!currentUserId) return setError("Debes estar logueado");
    if (tipAmount < 1) return setError("Mínimo 1 WLD");

    logPayment("Iniciando TIP", { amount: tipAmount });

    setLoadingAction("tip");
    setError(null);

    try {
      logPayment("Llamando MiniKit.pay para TIP");
      const payRes = await MiniKit.commandsAsync.pay({
        amount: tipAmount,
        currency: "WLD",
        recipient: RECEIVER,
      });

      logPayment("Respuesta completa de pay (TIP)", payRes);

      if (payRes && payRes.finalPayload && payRes.finalPayload.status === "success") {
        logPayment("TIP exitoso");
        alert("¡Tip enviado!");
      } else {
        logPayment("TIP falló o cancelado", payRes?.finalPayload);
        alert("Pago cancelado o fallido");
      }
    } catch (err: any) {
      logPayment("Error en TIP", err);
      setError("Error en tip: " + (err.message || "Desconocido"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleBoost = async () => {
    if (!currentUserId) return setError("Debes estar logueado");

    logPayment("Iniciando BOOST (5 WLD)");

    setLoadingAction("boost");
    setError(null);

    try {
      logPayment("Llamando MiniKit.pay para BOOST");
      const payRes = await MiniKit.commandsAsync.pay({
        amount: 5,
        currency: "WLD",
        recipient: RECEIVER,
      });

      logPayment("Respuesta completa de pay (BOOST)", payRes);

      if (payRes && payRes.finalPayload && payRes.finalPayload.status === "success") {
        logPayment("BOOST exitoso");
        alert("¡Boost enviado!");
      } else {
        logPayment("BOOST falló o cancelado", payRes?.finalPayload);
        alert("Pago cancelado o fallido");
      }
    } catch (err: any) {
      logPayment("Error en BOOST", err);
      setError("Error en boost: " + (err.message || "Desconocido"));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChatCreadores = async () => {
    logPayment("Iniciando suscripción Chat Creadores (5 WLD)");

    setLoadingAction("subscription");
    setError(null);

    try {
      logPayment("Llamando MiniKit.pay para Chat Creadores");
      const payRes = await MiniKit.commandsAsync.pay({
        amount: 5,
        currency: "WLD",
        recipient: RECEIVER,
      });

      logPayment("Respuesta completa de pay (Chat Creadores)", payRes);

      if (payRes && payRes.finalPayload && payRes.finalPayload.status === "success") {
        logPayment("Suscripción exitosa");
        window.location.href = "/chat/tokens";
      } else {
        logPayment("Suscripción falló o cancelada", payRes?.finalPayload);
        alert("Pago cancelado");
      }
    } catch (err: any) {
      logPayment("Error en Chat Creadores", err);
      setError("Error al procesar pago: " + (err.message || "Desconocido"));
    } finally {
      setLoadingAction(null);
    }
  };

  // Resto del componente sin cambios (like, comment, repost, render, etc.)
  // ... (tu código original completo aquí, sin tocar nada más)

  return (
    <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-gray-900" : "bg-gray-100"} border border-gray-700 mb-4 shadow-md`}>
      {/* Todo el JSX original que tenías */}
      {/* ... (copia aquí todo tu return original sin modificar nada) ... */}

      {/* Solo los botones de pago corregidos */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            step="0.1"
            value={tipAmount}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!isNaN(value) && value >= 1) setTipAmount(value);
            }}
            className="w-16 p-1 bg-gray-800 text-white rounded text-sm"
          />
          <button
            onClick={handleTip}
            disabled={loadingAction === "tip"}
            className="px-4 py-1 bg-yellow-600 text-white rounded-full text-xs hover:bg-yellow-700 disabled:opacity-50"
          >
            {loadingAction === "tip" ? "..." : "Tip"}
          </button>
        </div>

        <button
          onClick={handleBoost}
          disabled={loadingAction === "boost"}
          className="px-4 py-1 bg-purple-600 text-white rounded-full text-xs hover:bg-purple-700 disabled:opacity-50"
        >
          {loadingAction === "boost" ? "..." : "Boost 5 WLD"}
        </button>
      </div>

      {/* Chat Creadores */}
      {currentUserId && (
        <button
          onClick={handleChatCreadores}
          disabled={loadingAction === "subscription"}
          className="w-full py-2 bg-indigo-600 text-white rounded-full mt-4 hover:bg-indigo-700 text-sm font-medium transition disabled:opacity-50"
        >
          {loadingAction === "subscription" ? "Procesando..." : "Chat Exclusivo Creadores de Tokens (5 WLD)"}
        </button>
      )}

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  );
};

export default PostCard;
