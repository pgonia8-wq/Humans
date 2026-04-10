import { supabase, cors } from "./_supabase.mjs";
  import { requireOrb } from "./_orbGuard.mjs";
  import { solveBuy, spotPrice, TOTAL_SUPPLY, MAX_CREATOR_HOLD } from "./_curve.mjs";

  export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const { tokenId, amountWld, userId } = req.body ?? {};
    if (!tokenId || !amountWld || !userId) {
      return res.status(400).json({ error: "Missing tokenId, amountWld, userId" });
    }
    if (amountWld <= 0 || amountWld > 120) {
      return res.status(400).json({ error: "amountWld must be between 0 and 120 WLD" });
    }

    const orbOk = await requireOrb(userId, res);
    if (!orbOk) return;


      const { count: pendingCount } = await supabase
        .from("payment_orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending");

      if (pendingCount >= 3) {
        return res.status(429).json({ error: "Too many pending orders. Complete or wait for existing orders to expire." });
      }
  
    try {
      const { data: token, error: tErr } = await supabase
        .from("tokens")
        .select("*")
        .eq("id", tokenId)
        .single();
      if (tErr || !token) return res.status(404).json({ error: "Token not found" });
      if (token.graduated) return res.status(400).json({ error: "Token graduated — trade on DEX" });

      const supply = Number(token.circulating_supply ?? 0);
      const { tokensOut, fee, netWld, newPrice } = solveBuy(amountWld, supply);

      if (tokensOut <= 0) return res.status(400).json({ error: "Amount too small" });

      if (userId === token.creator_id) {
        const { data: existing } = await supabase
          .from("holdings")
          .select("amount")
          .eq("user_id", userId)
          .eq("token_id", tokenId)
          .maybeSingle();
        const current = Number(existing?.amount ?? 0);
        if (current + tokensOut > TOTAL_SUPPLY * MAX_CREATOR_HOLD) {
          return res.status(400).json({ error: "Creator max hold: " + (MAX_CREATOR_HOLD * 100) + "%" });
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();
      const username = profile?.username ?? "anon";

      const reference = "ref_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

      const { data: order, error: orderErr } = await supabase
        .from("payment_orders")
        .insert({
          user_id: userId,
          username,
          token_id: tokenId,
          token_symbol: token.symbol,
          amount_wld: amountWld,
          estimated_tokens: tokensOut,
          spot_price: spotPrice(supply),
          reference,
          status: "pending",
          type: "buy",
        })
        .select("id, reference")
        .single();

      if (orderErr) throw orderErr;

      return res.status(200).json({
        orderId: order.id,
        reference: order.reference,
        amountWld,
        estimatedTokens: tokensOut,
        fee,
        spotPrice: spotPrice(supply),
        estimatedNewPrice: newPrice,
        tokenSymbol: token.symbol,
      });
    } catch (err) {
      console.error("[initiateBuy]", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  