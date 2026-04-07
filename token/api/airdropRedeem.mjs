import { supabase, cors } from "./_supabase.mjs";

export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { code, userId } = req.body ?? {};
    if (!code || !userId) return res.status(400).json({ error: "code and userId required" });

    try {
      const { data: link, error: lErr } = await supabase
        .from("airdrop_links")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .single();

      if (lErr || !link) {
        return res.status(404).json({ error: "Invalid or expired airdrop code" });
      }

      const remaining = link.amount - (link.claimed_amount ?? 0);
      if (remaining <= 0) {
        await supabase.from("airdrop_links").update({ is_active: false }).eq("id", link.id);
        return res.status(410).json({ error: "This airdrop is fully claimed" });
      }

      if (link.mode === "one_time") {
        const { data: prevClaim } = await supabase
          .from("airdrop_claims")
          .select("id")
          .eq("airdrop_link_id", link.id)
          .limit(1);

        if (prevClaim && prevClaim.length > 0) {
          await supabase.from("airdrop_links").update({ is_active: false }).eq("id", link.id);
          return res.status(410).json({ error: "This one-time airdrop has already been used" });
        }
      }

      const { data: alreadyClaimed } = await supabase
        .from("airdrop_claims")
        .select("id")
        .eq("airdrop_link_id", link.id)
        .eq("user_id", userId)
        .limit(1);

      if (alreadyClaimed && alreadyClaimed.length > 0) {
        return res.status(409).json({ error: "You already claimed this airdrop" });
      }

      const claimAmount = link.mode === "one_time" ? remaining : Math.min(remaining, Math.floor(link.amount / 100));

      const { error: hErr } = await supabase.rpc("add_holding", {
        p_user_id: userId,
        p_token_id: link.token_id,
        p_amount: claimAmount,
      });

      if (hErr) {
        const { data: existingHolding } = await supabase
          .from("holdings")
          .select("amount")
          .eq("user_id", userId)
          .eq("token_id", link.token_id)
          .maybeSingle();

        if (existingHolding) {
          await supabase
            .from("holdings")
            .update({ amount: existingHolding.amount + claimAmount })
            .eq("user_id", userId)
            .eq("token_id", link.token_id);
        } else {
          await supabase.from("holdings").insert({
            user_id: userId,
            token_id: link.token_id,
            amount: claimAmount,
          });
        }
      }

      await supabase
        .from("airdrop_links")
        .update({
          claimed_amount: (link.claimed_amount ?? 0) + claimAmount,
          claims: (link.claims ?? 0) + 1,
          is_active: link.mode === "one_time" ? false : remaining - claimAmount > 0,
        })
        .eq("id", link.id);

      await supabase.from("airdrop_claims").insert({
        airdrop_link_id: link.id,
        user_id: userId,
        amount: claimAmount,
        claimed_at: new Date().toISOString(),
      });

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      await supabase.from("token_activity").insert({
        type: "airdrop",
        user_id: userId,
        username: profile?.username ?? "anon",
        token_id: link.token_id,
        token_symbol: link.token_symbol,
        amount: claimAmount,
        price: 0,
        total: 0,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        success: true,
        amount: claimAmount,
        tokenSymbol: link.token_symbol,
        message: claimAmount.toLocaleString() + " " + link.token_symbol + " claimed!",
      });
    } catch (err) {
      console.error("[POST /api/airdropRedeem]", err.message);
      return res.status(500).json({ error: err.message });
    }
  }
  