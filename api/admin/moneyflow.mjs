import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  try {
    const now = new Date();
    const h1 = new Date(now - 3600000).toISOString();
    const h24 = new Date(now - 86400000).toISOString();
    const h7d = new Date(now - 604800000).toISOString();

    const [
      { data: trades24h },
      { data: trades1h },
      { data: tokens },
      { data: trades7d },
    ] = await Promise.all([
      supabase
        .from("token_activity")
        .select("type, total, fee, token_symbol, token_id, timestamp")
        .gte("timestamp", h24)
        .order("timestamp", { ascending: false })
        .limit(2000),
      supabase
        .from("token_activity")
        .select("type, total, fee, token_symbol, timestamp")
        .gte("timestamp", h1)
        .order("timestamp", { ascending: false })
        .limit(500),
      supabase
        .from("tokens")
        .select("id, symbol, name, treasury_balance, total_wld_in_curve, circulating_supply, price_wld, volume_24h, holders, graduated")
        .order("volume_24h", { ascending: false })
        .limit(30),
      supabase
        .from("token_activity")
        .select("type, total, fee, timestamp")
        .gte("timestamp", h7d)
        .order("timestamp", { ascending: false })
        .limit(5000),
    ]);

    const calc = (data) => {
      let inflow = 0, outflow = 0, buyFees = 0, sellFees = 0, buyCount = 0, sellCount = 0;
      (data || []).forEach(t => {
        const v = Number(t.total || 0);
        const f = Number(t.fee || 0);
        if (t.type === "buy") { inflow += v; buyFees += f; buyCount++; }
        else if (t.type === "sell") { outflow += v; sellFees += f; sellCount++; }
      });
      return { inflow, outflow, net: inflow - outflow, buyFees, sellFees, totalFees: buyFees + sellFees, buyCount, sellCount };
    };

    const flow1h = calc(trades1h);
    const flow24h = calc(trades24h);
    const flow7d = calc(trades7d);

    const hourlyBuckets = [];
    for (let i = 23; i >= 0; i--) {
      const start = new Date(now - (i + 1) * 3600000);
      const end = new Date(now - i * 3600000);
      const bucket = (trades24h || []).filter(t => {
        const ts = new Date(t.timestamp);
        return ts >= start && ts < end;
      });
      const b = calc(bucket);
      hourlyBuckets.push({
        hour: end.getHours() + ":00",
        inflow: Number(b.inflow.toFixed(4)),
        outflow: Number(b.outflow.toFixed(4)),
        net: Number(b.net.toFixed(4)),
        fees: Number(b.totalFees.toFixed(4)),
        trades: b.buyCount + b.sellCount,
      });
    }

    const tokenTreasury = (tokens || []).map(t => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      treasury: Number(t.treasury_balance || 0),
      wldInCurve: Number(t.total_wld_in_curve || 0),
      supply: Number(t.circulating_supply || 0),
      price: Number(t.price_wld || 0),
      volume24h: Number(t.volume_24h || 0),
      holders: t.holders || 0,
      graduated: t.graduated || false,
      nearGraduation: Number(t.total_wld_in_curve || 0) > 800,
    }));

    const totalTreasury = tokenTreasury.reduce((s, t) => s + t.treasury, 0);
    const totalCurve = tokenTreasury.reduce((s, t) => s + t.wldInCurve, 0);

    return res.status(200).json({
      live: flow1h,
      h24: flow24h,
      d7: flow7d,
      hourly: hourlyBuckets,
      tokens: tokenTreasury,
      totals: { treasury: totalTreasury, wldInCurve: totalCurve },
    });
  } catch (err) {
    console.error("[ADMIN/MONEYFLOW]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
