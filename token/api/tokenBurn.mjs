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

      const available = Number(token.circulating_supply ?? 0);
      if (amount > available) {
        return res.status(400).json({ error: `Insufficient circulating supply. Available: ${available}` });
      }

      const newBurned = Number(token.burned_supply ?? 0) + amount;
      const newCirculating = available - amount;
      const newTotalSupply = Number(token.total_supply) - amount;

      const { error: uErr } = await supabase
        .from("tokens")
        .update({
          burned_supply: newBurned,
          circulating_supply: newCirculating,
          total_supply: newTotalSupply,
        })
        .eq("id", tokenId);

      if (uErr) throw uErr;

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
      return res.status(500).json({ error: err.message });
    }
  }
  