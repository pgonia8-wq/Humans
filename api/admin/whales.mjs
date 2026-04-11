import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  try {
    const h1 = new Date(Date.now() - 3600000).toISOString();
    const h24 = new Date(Date.now() - 86400000).toISOString();

    const [
      { data: topHolders },
      { data: bigTrades1h },
      { data: bigTrades24h },
      { data: recentSells },
      { data: tokens },
    ] = await Promise.all([
      supabase
        .from("holdings")
        .select("user_id, token_id, token_symbol, amount, value, pnl")
        .order("value", { ascending: false })
        .limit(30),
      supabase
        .from("token_activity")
        .select("type, user_id, username, token_id, token_symbol, amount, total, price, timestamp")
        .gte("timestamp", h1)
        .order("total", { ascending: false })
        .limit(50),
      supabase
        .from("token_activity")
        .select("type, user_id, username, token_id, token_symbol, amount, total, price, timestamp")
        .gte("timestamp", h24)
        .order("total", { ascending: false })
        .limit(100),
      supabase
        .from("token_activity")
        .select("type, user_id, username, token_id, token_symbol, amount, total, price, timestamp")
        .eq("type", "sell")
        .gte("timestamp", h1)
        .order("total", { ascending: false })
        .limit(50),
      supabase
        .from("tokens")
        .select("id, symbol, circulating_supply, price_wld, total_wld_in_curve, holders")
        .order("volume_24h", { ascending: false })
        .limit(20),
    ]);

    const whaleAlerts = [];
    const dumpAlerts = [];
    const anomalies = [];

    const tokenMap = {};
    (tokens || []).forEach(t => { tokenMap[t.id] = t; });

    (bigTrades1h || []).forEach(trade => {
      const total = Number(trade.total || 0);
      if (total > 80) {
        whaleAlerts.push({
          type: trade.type === "buy" ? "whale_buy" : "whale_sell",
          severity: total > 140 ? "critical" : total > 100 ? "warning" : "info",
          user: trade.username || trade.user_id?.slice(0, 12),
          userId: trade.user_id,
          token: trade.token_symbol,
          amount: Number(trade.amount),
          totalWld: total,
          price: Number(trade.price),
          ts: trade.timestamp,
        });
      }
    });

    const sellsByToken = {};
    (recentSells || []).forEach(s => {
      const key = s.token_id;
      if (!sellsByToken[key]) sellsByToken[key] = { total: 0, count: 0, symbol: s.token_symbol, sellers: [] };
      sellsByToken[key].total += Number(s.total || 0);
      sellsByToken[key].count++;
      sellsByToken[key].sellers.push({ user: s.username || s.user_id?.slice(0, 12), amount: Number(s.amount), total: Number(s.total) });
    });

    Object.entries(sellsByToken).forEach(([tokenId, data]) => {
      const token = tokenMap[tokenId];
      if (!token) return;
      const curveWld = Number(token.total_wld_in_curve || 0);
      const sellRatio = curveWld > 0 ? data.total / curveWld : 0;

      if (sellRatio > 0.1 || data.total > 80) {
        dumpAlerts.push({
          severity: sellRatio > 0.3 ? "critical" : sellRatio > 0.15 ? "warning" : "info",
          token: data.symbol,
          tokenId,
          sellVolume: data.total,
          sellCount: data.count,
          curveWld,
          sellRatio: (sellRatio * 100).toFixed(1),
          topSellers: data.sellers.sort((a, b) => b.total - a.total).slice(0, 5),
        });
      }
    });

    const userTradeCount = {};
    (bigTrades1h || []).forEach(t => {
      userTradeCount[t.user_id] = (userTradeCount[t.user_id] || 0) + 1;
    });
    Object.entries(userTradeCount).forEach(([uid, count]) => {
      if (count > 10) {
        anomalies.push({
          type: "high_frequency_trader",
          severity: count > 30 ? "critical" : "warning",
          userId: uid,
          tradeCount: count,
          period: "1h",
        });
      }
    });

    (topHolders || []).forEach(h => {
      const token = tokenMap[h.token_id];
      if (!token) return;
      const supply = Number(token.circulating_supply || 1);
      const holdPercent = (Number(h.amount) / supply) * 100;
      if (holdPercent > 15) {
        anomalies.push({
          type: "whale_concentration",
          severity: holdPercent > 40 ? "critical" : holdPercent > 25 ? "warning" : "info",
          userId: h.user_id,
          token: h.token_symbol,
          holdPercent: holdPercent.toFixed(1),
          amount: Number(h.amount),
          value: Number(h.value),
        });
      }
    });

    whaleAlerts.sort((a, b) => b.totalWld - a.totalWld);
    dumpAlerts.sort((a, b) => parseFloat(b.sellRatio) - parseFloat(a.sellRatio));

    return res.status(200).json({
      whaleAlerts: whaleAlerts.slice(0, 20),
      dumpAlerts: dumpAlerts.slice(0, 10),
      anomalies: anomalies.slice(0, 15),
      topHolders: (topHolders || []).slice(0, 15).map(h => ({
        userId: h.user_id,
        token: h.token_symbol,
        amount: Number(h.amount),
        value: Number(h.value),
        pnl: Number(h.pnl || 0),
      })),
    });
  } catch (err) {
    console.error("[ADMIN/WHALES]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
