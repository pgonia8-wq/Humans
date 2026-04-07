import { supabase, cors, mapAirdropRow } from "./_supabase.mjs";
  import { requireOrb } from "./_orbGuard.mjs";

  export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "GET") {
      const { user_id } = req.query;

      try {
        const { data: airdrops, error } = await supabase
          .from("airdrops")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        let claimedSet = new Set();
        let nextClaimMap = {};

        if (user_id) {
          const { data: claims } = await supabase
            .from("airdrop_claims")
            .select("airdrop_id, claimed_at")
            .eq("user_id", user_id);

          (claims ?? []).forEach((c) => {
            const airdrop = (airdrops ?? []).find((a) => a.id === c.airdrop_id);
            const cooldownHours = airdrop?.cooldown_hours ?? 24;
            const claimedAt = new Date(c.claimed_at);
            const nextAt = new Date(claimedAt.getTime() + cooldownHours * 60 * 60 * 1000);
            if (nextAt > new Date()) {
              claimedSet.add(c.airdrop_id);
              nextClaimMap[c.airdrop_id] = nextAt.toISOString();
            }
          });
        }

        const result = (airdrops ?? []).map((row) => ({
          ...mapAirdropRow(row),
          hasClaimed: claimedSet.has(row.id),
          nextClaimAt: nextClaimMap[row.id] ?? null,
        }));

        return res.status(200).json({ airdrops: result, total: result.length });
      } catch (err) {
        console.error("[GET /api/airdrops]", err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    if (req.method === "POST") {
      const {
        tokenId, title, description, totalAmount,
        dailyAmount, maxParticipants, cooldownHours,
        durationDays, creatorId,
      } = req.body ?? {};

      if (!tokenId || !title || !totalAmount || !dailyAmount || !creatorId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const orbOk = await requireOrb(creatorId, res);
      if (!orbOk) return;

      try {
        const { data: token, error: tErr } = await supabase
          .from("tokens")
          .select("id, symbol, name, emoji, creator_id")
          .eq("id", tokenId)
          .single();

        if (tErr || !token) return res.status(404).json({ error: "Token not found" });
        if (token.creator_id !== creatorId) {
          return res.status(403).json({ error: "Only the token creator can create airdrops" });
        }

        const endDate = new Date(Date.now() + (durationDays || 30) * 86400000).toISOString();

        const newAirdrop = {
          id: "adr_" + Math.random().toString(36).slice(2, 10),
          token_id: tokenId,
          token_name: token.name,
          token_symbol: token.symbol,
          token_emoji: token.emoji ?? "🌟",
          title: title.trim(),
          description: (description || "").trim(),
          total_amount: totalAmount,
          claimed_amount: 0,
          daily_amount: dailyAmount,
          participants: 0,
          max_participants: maxParticipants || 500,
          end_date: endDate,
          is_active: true,
          cooldown_hours: cooldownHours || 24,
          created_at: new Date().toISOString(),
        };

        const { data: inserted, error: iErr } = await supabase
          .from("airdrops")
          .insert(newAirdrop)
          .select()
          .single();

        if (iErr) throw iErr;

        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", creatorId)
          .maybeSingle();

        await supabase.from("token_activity").insert({
          type: "airdrop",
          user_id: creatorId,
          username: profile?.username ?? "anon",
          token_id: tokenId,
          token_symbol: token.symbol,
          amount: totalAmount,
          price: 0,
          total: 0,
          timestamp: new Date().toISOString(),
        });

        return res.status(201).json({
          success: true,
          airdropId: inserted.id,
          message: `Airdrop created: ${totalAmount.toLocaleString()} ${token.symbol}`,
        });
      } catch (err) {
        console.error("[POST /api/airdrops]", err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  }
  