import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  try {
    const now = new Date();
    const h24 = new Date(now - 86400000).toISOString();
    const h1 = new Date(now - 3600000).toISOString();

    const [
      { count: totalUsers },
      { count: totalPosts },
      { count: totalReports },
      { count: pendingReports },
      { count: bannedUsers },
      { count: newUsers24h },
      { count: newPosts24h },
      { data: tokens },
      { data: recentTrades },
      { count: totalTrades },
      { count: trades1h },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("banned", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", h24),
      supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", h24),
      supabase.from("tokens").select("id, name, symbol, price_wld, volume_24h, holders, circulating_supply, treasury_balance, total_wld_in_curve, graduated").order("volume_24h", { ascending: false }).limit(15),
      supabase.from("token_activity").select("type, total").order("timestamp", { ascending: false }).limit(500),
      supabase.from("token_activity").select("*", { count: "exact", head: true }),
      supabase.from("token_activity").select("*", { count: "exact", head: true }).gte("timestamp", h1),
    ]);

    let totalBuyWld = 0, totalSellWld = 0, totalFees = 0;
    let totalTreasury = 0, totalWldInCurve = 0;
    (tokens || []).forEach(t => {
      totalTreasury += Number(t.treasury_balance || 0);
      totalWldInCurve += Number(t.total_wld_in_curve || 0);
    });
    (recentTrades || []).forEach(t => {
      const v = Number(t.total || 0);
      if (t.type === "buy") totalBuyWld += v;
      else if (t.type === "sell") totalSellWld += v;
    });
    totalFees = totalTreasury;

    return res.status(200).json({
      overview: {
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        totalReports: totalReports || 0,
        pendingReports: pendingReports || 0,
        bannedUsers: bannedUsers || 0,
        newUsers24h: newUsers24h || 0,
        newPosts24h: newPosts24h || 0,
      },
      trading: {
        totalTrades: totalTrades || 0,
        trades1h: trades1h || 0,
        totalBuyWld,
        totalSellWld,
        totalFees,
        totalTreasury,
        totalWldInCurve,
      },
      tokens: tokens || [],
    });
  } catch (err) {
    console.error("[ADMIN/STATS]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
