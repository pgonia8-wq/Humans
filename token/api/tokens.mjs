import { supabase, cors, mapTokenRow } from "./_supabase.mjs";
import { requireOrb } from "./_orbGuard.mjs";

const INITIAL_PRICE = 0.0000005;
const TOTAL_SUPPLY = 100_000_000;
const INITIAL_SUPPLY = 500_000;
const CREATOR_FEE_WLD = 5;
const WLD_USD = 3.0;

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    const { id, search, sort, limit = "50", offset = "0", filter } = req.query ?? {};

    if (id) {
      try {
        const { data: token, error } = await supabase
          .from("tokens")
          .select("*")
          .eq("id", id)
          .single();
        if (error || !token) return res.status(404).json({ error: "Token not found" });

        const { count: holderCount } = await supabase
          .from("holdings")
          .select("*", { count: "exact", head: true })
          .eq("token_id", id)
          .gt("amount", 0);

        const { data: activityData } = await supabase
          .from("token_activity")
          .select("type, total")
          .eq("token_id", id);

        const stats = { txns: 0, buys: 0, sells: 0, buyVolume: 0, sellVolume: 0, makers: new Set() };
        (activityData ?? []).forEach(a => {
          stats.txns++;
          if (a.type === "buy") { stats.buys++; stats.buyVolume += Number(a.total ?? 0); }
          if (a.type === "sell") { stats.sells++; stats.sellVolume += Number(a.total ?? 0); }
        });

        const mapped = mapTokenRow(token);
        mapped.holders = holderCount ?? Number(token.holders ?? 0);
        mapped.stats = {
          txns: stats.txns,
          buys: stats.buys,
          sells: stats.sells,
          buyVolume: stats.buyVolume,
          sellVolume: stats.sellVolume,
          volume: stats.buyVolume + stats.sellVolume,
          makers: stats.makers.size,
          buyPercent: stats.txns > 0 ? Math.round((stats.buys / stats.txns) * 100) : 0,
          sellPercent: stats.txns > 0 ? Math.round((stats.sells / stats.txns) * 100) : 0,
        };
        return res.status(200).json(mapped);
      } catch (err) {
        console.error("[GET /api/tokens?id=]", err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    try {
      let query = supabase.from("tokens").select("*", { count: "exact" });

      if (search) {
        query = query.or(`name.ilike.%${search}%,symbol.ilike.%${search}%`);
      }
      if (filter === "trending") query = query.eq("is_trending", true);
      if (filter === "graduated") query = query.eq("graduated", true);
      if (filter === "new") query = query.order("created_at", { ascending: false });

      if (sort === "volume") query = query.order("volume_24h", { ascending: false });
      else if (sort === "marketcap") query = query.order("market_cap", { ascending: false });
      else if (sort === "price") query = query.order("price_wld", { ascending: false });
      else if (sort === "holders") query = query.order("holders", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

      const { data, count, error } = await query;
      if (error) throw error;

      return res.status(200).json({
        tokens: (data ?? []).map(mapTokenRow),
        total: count ?? 0,
        hasMore: (Number(offset) + Number(limit)) < (count ?? 0),
      });
    } catch (err) {
      console.error("[GET /api/tokens]", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    name, symbol, description, emoji,
    creatorId, avatarUrl,
    transactionId,
    twitter, telegram, website,
  } = req.body ?? {};

  if (!name || !symbol || !creatorId) {
    return res.status(400).json({ error: "Missing required fields: name, symbol, creatorId" });
  }

  const orbOk = await requireOrb(creatorId, res);
  if (!orbOk) return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", creatorId)
      .single();

    const creatorName = profile?.username ?? "anon";

    const socials = {};
    if (twitter) socials.twitter = twitter;
    if (telegram) socials.telegram = telegram;
    if (website) socials.website = website;

    const newToken = {
      id: `tkn_${Math.random().toString(36).slice(2, 10)}`,
      name: name.trim(),
      symbol: symbol.trim().toUpperCase(),
      emoji: emoji ?? "🌟",
      creator_id: creatorId,
      creator_name: creatorName,
      price_wld: INITIAL_PRICE,
      price_usdc: INITIAL_PRICE * WLD_USD,
      market_cap: 0,
      holders: 0,
      curve_percent: 0,
      change_24h: 0,
      volume_24h: 0,
      total_supply: TOTAL_SUPPLY,
      circulating_supply: 0,
      locked_supply: 0,
      burned_supply: 0,
      lock_duration_days: 0,
      description: description ?? "",
      is_trending: false,
      tags: ["New"],
      buy_pressure: 50,
      avatar_url: avatarUrl ?? null,
      total_wld_in_curve: 0,
      treasury_balance: CREATOR_FEE_WLD,
      graduated: false,
      socials: Object.keys(socials).length > 0 ? socials : null,
      creation_fee_wld: CREATOR_FEE_WLD,
      creation_fee_tx: transactionId ?? null,
    };

    const { data: inserted, error } = await supabase
      .from("tokens")
      .insert(newToken)
      .select()
      .single();
    if (error) throw error;

    await supabase.from("token_activity").insert({
      type: "create",
      user_id: creatorId,
      username: creatorName,
      token_id: inserted.id,
      token_symbol: inserted.symbol,
      amount: 0,
      price: INITIAL_PRICE,
      total: CREATOR_FEE_WLD,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json(mapTokenRow(inserted));
  } catch (err) {
    console.error("[POST /api/tokens]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
