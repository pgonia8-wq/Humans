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
  const [reposts, setReposts] = useState(post.reposts || 0);
  const [comments, setComments] = useState(post.comments || 0);

  const [followers, setFollowers] = useState(post.profile?.followers_count || 0);
  const [following, setFollowing] = useState(post.profile?.following_count || 0);

  const { isFollowing, toggleFollow, loading: followLoading } = useFollow(
    currentUserId,
    post.user_id
  );

  const [tipAmount, setTipAmount] = useState<number | "">("");
  const [isBoosting, setIsBoosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accentColor = "#7c3aed";

  useEffect(() => {
    if (!post.user_id) return;

    const fetchStats = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("followers_count, following_count")
          .eq("id", post.user_id)
          .single();

        if (data) {
          setFollowers(data.followers_count || 0);
          setFollowing(data.following_count || 0);
        }
      } catch (err) {
        console.error("followers fetch error", err);
      }
    };

    fetchStats();
  }, [post.user_id]);

  /*
  TIP PAYMENT
  90% creator
  10% app
  */

  const handleTip = async () => {
    if (!currentUserId || !tipAmount || tipAmount < 1) {
      setError("Tip mínimo 1 WLD");
      return;
    }

    try {
      if (!MiniKit.isInstalled()) {
        throw new Error("World App no detectada");
      }

      const creatorAmount = tipAmount * 0.9;
      const appAmount = tipAmount * 0.1;

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "tip-" + post.id + "-" + Date.now(),
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(tipAmount, Tokens.WLD).toString()
          }
        ],
        description: `Tip for ${post.profile?.username}`
      });

      console.log("[TIP] pay response:", payRes);

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error(payRes?.finalPayload?.description || "Tip cancelado");
      }

      const transactionId = payRes?.finalPayload?.transaction_id;

      await supabase.from("tips").insert({
        post_id: post.id,
        sender_id: currentUserId,
        receiver_id: post.user_id,
        amount_creator: creatorAmount,
        amount_app: appAmount,
        amount_total: tipAmount,
        transaction_id: transactionId
      });

      alert(`Tip enviado: ${tipAmount} WLD`);
      setTipAmount("");

    } catch (err: any) {
      console.error("[TIP] error:", err);
      setError(err.message || "Error enviando tip");
    }
  };

  /*
  BOOST PAYMENT
  */

  const handleBoost = async () => {
    if (!currentUserId) return;

    setIsBoosting(true);

    const boostAmount = 5;

    try {

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "boost-" + post.id + "-" + Date.now(),
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(boostAmount, Tokens.WLD).toString()
          }
        ],
        description: "Boost post"
      });

      console.log("[BOOST] pay response:", payRes);

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error(payRes?.finalPayload?.description || "Boost cancelado");
      }

      const transactionId = payRes?.finalPayload?.transaction_id;

      const boostedUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

      await supabase
        .from("posts")
        .update({ boosted_until: boostedUntil })
        .eq("id", post.id);

      await supabase.from("boosts").insert({
        post_id: post.id,
        user_id: currentUserId,
        transaction_id: transactionId
      });

      alert("Boost activado 🚀");

    } catch (err: any) {
      console.error("[BOOST] error:", err);
      setError(err.message || "Error en boost");
    } finally {
      setIsBoosting(false);
    }
  };

  /*
  BUG INTENCIONAL PARA ERUDA
  */

  useEffect(() => {
    if (post.debug_bug) {
      console.log("DEBUG BUG ACTIVATED", notDefinedVariable);
    }
  }, []);

  return (
    <div className="bg-gray-900/60 backdrop-blur-sm rounded-2xl p-4 space-y-4 border border-white/10">

      <div className="flex items-center gap-3">

        <img
          src={post.profile?.avatar_url || "default-avatar.png"}
          className="w-10 h-10 rounded-full object-cover"
        />

        <div className="flex-1">

          <h3 className="font-bold text-white">
            {post.profile?.username || "Anon"}
            {post.profile?.is_premium && " ✅"}
          </h3>

          <div className="text-gray-400 text-xs flex gap-3 mt-1">

            <span>Followers: {followers}</span>
            <span>Following: {following}</span>
            <span>🕒 {new Date(post.timestamp || "").toLocaleString()}</span>

            {post.boosted_until &&
              new Date(post.boosted_until) > new Date() && (
                <span className="text-yellow-400">🚀 Boosted</span>
              )}

          </div>

          {currentUserId && post.user_id !== currentUserId && (
            <button
              onClick={async () => {
                await toggleFollow();
                setFollowers(prev => isFollowing ? prev - 1 : prev + 1);
              }}
              disabled={followLoading}
              className="mt-1 px-3 py-1 rounded bg-purple-600 text-white text-xs"
            >
              {isFollowing ? "Siguiendo" : "Seguir"}
            </button>
          )}

        </div>
      </div>

      <p className="text-white whitespace-pre-wrap">
        {post.content}
      </p>

      <div className="flex gap-4 text-gray-400 text-sm">

        <button onClick={() => setLiked(!liked)}>
          {liked ? "❤️" : "♡"} {likes}
        </button>

        <button>
          💬 {comments}
        </button>

        <button>
          🔁 {reposts}
        </button>

      </div>

      <div className="flex flex-wrap gap-2 pt-3 items-center">

        <input
          type="number"
          step={0.1}
          min={1}
          value={tipAmount}
          onChange={(e) =>
            setTipAmount(e.target.value ? parseFloat(e.target.value) : "")
          }
          className="flex-1 sm:w-20 px-2 py-1 rounded border text-black"
        />

        <button
          onClick={handleTip}
          className="px-3 py-1 rounded text-white font-medium"
          style={{ backgroundColor: accentColor }}
        >
          Tip
        </button>

        <button
          onClick={handleBoost}
          disabled={isBoosting}
          className="px-3 py-1 rounded text-white font-medium"
          style={{ backgroundColor: accentColor }}
        >
          {isBoosting ? "🚀..." : "Boost"}
        </button>

      </div>

      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}

    </div>
  );
};

export default PostCard;
