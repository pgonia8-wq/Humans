import { supabase, cors } from "./_supabase.mjs";
import { requireOrb } from "./_orbGuard.mjs";
import { spotPrice } from "./_curve.mjs";

export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const tokenId = req.query.id;
    const { amount, userId } = req.body ?? {};

    if (!tokenId || !amount || !userId) {
      return res.status(400).json({ error: "Missing tokenId, amount, userId" });
    }
    if (amount <= 0) return res.status(400).json({ error: "Amount must be positive" });

    const orbOk = await requireOrb(userId, res);
    if (!orbOk) return;

    try {
      const { data: token, error: tErr } = await supabase
        .from("tokens")
        .select("id, symbol, creator_id, circulating_supply, burned_supply, total_supply")
        .eq("id", tokenId)
        .single();

      if (tErr || !token) return res.status(404).json({ error: "Token not found" });
      if (token.creator_id !== userId) return res.status(403).json({ error: "Only the creator can burn tokens" });

      const { data: holding } = await supabase
        .from("holdings")
        .select("amount")
        .eq("user_id", userId)
        .eq("token_id", tokenId)
        .maybeSingle();
      const heldAmount = Number(holding?.amount ?? 0);
      if (heldAmount < amount) {
        return res.status(400).json({ error: `Insufficient holdings. You hold: ${heldAmount}` });
      }

      const available = Number(token.circulating_supply ?? 0);
      if (amount > available) {
        return res.status(400).json({ error: `Insufficient circulating supply. Available: ${available}` });
      }

      const newBurned = Number(token.burned_supply ?? 0) + amount;
      const newCirculating = available - amount;
      const newTotalSupply = Number(token.total_supply) - amount;

      const { data: updated, error: uErr } = await supabase
        .from("tokens")
        .update({
          burned_supply: newBurned,
          circulating_supply: newCirculating,
          total_supply: newTotalSupply,
        })
        .eq("id", tokenId)
        .eq("circulating_supply", available)
        .select("id")
        .maybeSingle();

      if (uErr) throw uErr;
      if (!updated) {
        return res.status(409).json({ error: "Concurrent modification detected, please retry" });
      }

      const newHeld = heldAmount - amount;
      if (newHeld > 0) {
        await supabase.from("holdings").update({ amount: newHeld, updated_at: new Date().toISOString() })
          .eq("user_id", userId).eq("token_id", tokenId);
      } else {
        const { data: hDel } = await supabase.from("holdings")
            .delete().eq("user_id", userId).eq("token_id", tokenId)
            .eq("amount", heldAmount).select("user_id").maybeSingle();
          if (!hDel) {
            return res.status(409).json({ error: "Concurrent holdings update, please retry" });
          }
        await supabase.rpc("decrement_holders", { tid: tokenId });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      await supabase.from("token_activity").insert({
        type: "burn",
        user_id: userId,
        username: profile?.username ?? "anon",
        token_id: tokenId,
        token_symbol: token.symbol,
        amount: amount,
        price: spotPrice(newCirculating),
        total: 0,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        burned: amount,
        totalBurned: newBurned,
        newSupply: newTotalSupply,
        message: `Burned ${amount.toLocaleString()} ${token.symbol} permanently`,
      });
    } catch (err) {
      console.error("[POST /api/tokens/:id/burn]", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  