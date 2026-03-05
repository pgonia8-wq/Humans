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
  const { balance, boost } = useUserBalance(currentUserId);
  const { theme, accentColor } = useContext(ThemeContext);
  const { isFollowing, toggleFollow, loading: followLoading } =
    useFollow(currentUserId, post.user_id);

  const [tipAmount, setTipAmount] = useState<number>(0);

  const handleTip = async () => {
    if (!currentUserId || tipAmount < 0.5)
      return alert("El tip mínimo es 0.5 WLD");
    if (tipAmount > balance)
      return alert("No tienes suficiente WLD");

    await supabase.rpc("transfer_tip", {
      from_user_id: currentUserId,
      to_user_id: post.user_id,
      tip_amount: tipAmount,
    });

    alert(
      `Tip enviado: ${tipAmount} WLD (92% al usuario, 8% a la app)`
    );
    setTipAmount(0);
  };

  const handleBoost = async () => {
    const boostCost = 5;
    if (!currentUserId || balance < boostCost)
      return alert("No tienes suficiente WLD");

    await supabase
      .from("user_balances")
      .update({ wld_balance: balance - boostCost })
      .eq("user_id", currentUserId);

    alert("Post potenciado con Boost 🚀");
  };

  return (
    <div
      className={`p-4 rounded-2xl border border-white/10 space-y-2 ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gray-100 text-black"
      }`}
      style={{ borderColor: accentColor }}
    >
      {/* Header usuario + Follow */}
      <div className="flex justify-between items-center">
        <div className="font-bold">
          {post.profile?.username || "Anon"}
        </div>

        {currentUserId &&
          currentUserId !== post.user_id && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className="px-3 py-1 rounded-full text-xs font-semibold transition"
              style={{
                backgroundColor: isFollowing
                  ? "#444"
                  : accentColor,
                color: "white",
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

      <div>{post.content}</div>

      {/* Tip + Boost (intacto) */}
      <div className="flex gap-2 mt-2">
        <input
          type="number"
          min={0.5}
          step={0.1}
          value={tipAmount}
          onChange={(e) =>
            setTipAmount(parseFloat(e.target.value))
          }
          className="w-20 px-2 py-1 rounded text-black"
          placeholder="Tip WLD"
        />
        <button
          onClick={handleTip}
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: accentColor }}
        >
          Tip
        </button>
        <button
          onClick={handleBoost}
          className="px-3 py-1 rounded text-white"
          style={{ backgroundColor: accentColor }}
        >
          Boost
        </button>
      </div>

      <div className="text-sm text-gray-400">
        Balance: {balance.toFixed(2)} WLD
      </div>
    </div>
  );
};

export default PostCard;
