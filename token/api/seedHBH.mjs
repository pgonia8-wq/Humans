import { supabase, cors } from "./_supabase.mjs";

  export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    const userId = "0x0250990b30200a36ceb19a21342529d00118547a3cc54fdc17f6047480b0bf4a";

    try {
      const { data, error } = await supabase
        .from("tokens")
        .upsert({
          id: "tok_hbyhumans",
          name: "Hbyhumans",
          symbol: "HBH",
          emoji: "\u{1F30D}",
          creator_id: userId,
          creator_name: "pgonia",
          price_wld: 0.0000005,
          price_usdc: 0.0000015,
          market_cap: 0,
          holders: 1,
          curve_percent: 0,
          change_24h: 0,
          volume_24h: 0,
          total_supply: 100000000,
          circulating_supply: 0,
          locked_supply: 25000000,
          burned_supply: 10000000,
          lock_duration_days: 90,
          description: "The official token of H by Humans. Built for the World App community.",
          is_trending: false,
          tags: ["New", "Official"],
          buy_pressure: 50,
          total_wld_in_curve: 0,
          treasury_balance: 0,
          graduated: false,
          avatar_url: "https://vtjqfzpfehfofamhowjz.supabase.co/storage/v1/object/public/avatars/" + userId + "-1775082544699.jpg"
        }, { onConflict: "id" })
        .select()
        .single();

      if (error) return res.status(500).json({ step: "token", error: error.message, details: error });

      const { error: holdErr } = await supabase
        .from("holdings")
        .upsert({
          user_id: userId,
          token_id: "tok_hbyhumans",
          token_name: "Hbyhumans",
          token_symbol: "HBH",
          token_emoji: "\u{1F30D}",
          amount: 25000000,
          avg_buy_price: 0,
          current_price: 0.0000005,
          value: 12.5,
          pnl: 0,
          pnl_percent: 0
        }, { onConflict: "user_id,token_id" });

      if (holdErr) return res.status(500).json({ step: "holding", error: holdErr.message, details: holdErr });

      await supabase.from("token_activity").insert({
        type: "create",
        user_id: userId,
        username: "pgonia",
        token_id: "tok_hbyhumans",
        token_symbol: "HBH",
        amount: 25000000,
        price: 0.0000005,
        total: 0
      });

      return res.status(200).json({ success: true, token: data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  