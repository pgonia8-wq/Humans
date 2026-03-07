import React, { useState, useContext } from "react";
import { supabase } from "../supabaseClient";
import { useUserBalance } from "../lib/useUserBalance";
import { useFollow } from "../lib/useFollow";
import { ThemeContext } from "../lib/ThemeContext";

interface PostCardProps {
  post: any;
  currentUserId: string | null;
}

const PostCard: React.FC<PostCardProps> = ({ post, currentUserId }) => {
  const { balance } = useUserBalance(currentUserId);
  const { theme, accentColor } = useContext(ThemeContext);

  const { isFollowing, toggleFollow, loading: followLoading } =
    useFollow(currentUserId, post.user_id);

  const [tipAmount, setTipAmount] = useState<number | "">("");

  /* TIP */

  const handleTip = async () => {
    const amount = Number(tipAmount);

    if (!currentUserId || amount <= 0)
      return alert("Ingresa un tip válido");

    if (amount > balance)
      return alert("No tienes suficiente WLD");

    try {
      await supabase.rpc("transfer_tip", {
        from_user_id: currentUserId,
        to_user_id: post.user_id,
        tip_amount: amount
      });

      alert(`Tip enviado: ${amount} WLD`);

      setTipAmount("");

    } catch (err) {
      console.error(err);
      alert("Error enviando tip");
    }
  };

  /* BOOST */

  const handleBoost = async () => {
    const boostCost = 5;

    if (!currentUserId || balance < boostCost)
      return alert("No tienes suficiente WLD");

    try {

      await supabase
        .from("user_balances")
        .update({ wld_balance: balance - boostCost })
        .eq("user_id", currentUserId);

      await supabase
        .from("posts")
        .update({ boost_score: (post.boost_score || 0) + 1 })
        .eq("id", post.id);

      alert("Post potenciado 🚀");

    } catch (err) {

      console.error(err);
      alert("Error al potenciar");

    }
  };

  return (
    <div
      className={`p-4 rounded-2xl border shadow-md shadow-black/30 space-y-3 ${
        theme === "dark"
          ? "bg-gray-900 text-white border-white/10"
          : "bg-gray-100 text-black border-black/10"
      }`}
      style={{ borderColor: accentColor }}
    >

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
            {post.profile?.username?.charAt(0) || "U"}
          </div>

          <div className="font-semibold text-sm">
            {post.profile?.username || "Anon"}
          </div>

        </div>

        {currentUserId &&
          currentUserId !== post.user_id && (

          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className="px-3 py-1 rounded-full text-xs font-semibold transition shadow-sm"
            style={{
              backgroundColor: isFollowing ? "#444" : accentColor,
              color: "white"
            }}
          >
            {followLoading
              ? "..."
              : isFollowing
              ? "Siguiendo"
              : "Seguir"}
          </button>

        )}

      </div>

      {/* CONTENIDO */}

      <div className="text-sm leading-relaxed">
        {post.content}
      </div>

      {/* ACCIONES */}

      <div className="flex flex-wrap items-center gap-2 pt-2">

        {/* TIP */}

        <input
          type="number"
          step="0.1"
          value={tipAmount}
          onChange={(e) =>
            setTipAmount(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="w-20 px-2 py-1 rounded text-black text-sm"
          placeholder="Tip"
        />

        <button
          onClick={handleTip}
          className="px-3 py-1 rounded text-xs text-white shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          Tip
        </button>

        {/* BOOST */}

        <button
          onClick={handleBoost}
          className="px-3 py-1 rounded text-xs text-white shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          Boost
        </button>

      </div>

    </div>
  );
};

export default PostCard;
