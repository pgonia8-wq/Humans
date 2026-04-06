import { supabase, cors } from "../../_supabase.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const tokenId = req.query.id;
  const period = req.query.period ?? "24h";
  const rawLimit = Number(req.query.limit ?? 100);
  const limit = Math.min(rawLimit, 500);

  if (!tokenId) return res.status(400).json({ error: "Missing token id" });

  const intervals = {
    "1h":  "1 hour",
    "6h":  "6 hours",
    "24h": "24 hours",
    "7d":  "7 days",
    "30d": "30 days",
    "all": "10 years",
  };
  const sqlInterval = intervals[period] ?? "24 hours";

  try {
    const { data, error } = await supabase
      .from("price_snapshots")
      .select("price_wld, price_usdc, supply, volume, type, created_at")
      .eq("token_id", tokenId)
      .gte("created_at", new Date(Date.now() - parseDuration(sqlInterval)).toISOString())
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    const snapshots = (data ?? []).map((s) => ({
      price: Number(s.price_wld),
      priceUsd: Number(s.price_usdc),
      supply: Number(s.supply ?? 0),
      volume: Number(s.volume ?? 0),
      type: s.type,
      time: s.created_at,
    }));

    const candles = buildCandles(snapshots, period);

    return res.status(200).json({
      snapshots,
      candles,
      period,
      total: snapshots.length,
    });
  } catch (err) {
    console.error("[GET /api/tokens/:id/priceHistory]", err.message);
    return res.status(500).json({ error: err.message });
  }
}

function parseDuration(interval) {
  const match = interval.match(/^(\d+)\s+(hour|hours|day|days|year|years)$/);
  if (!match) return 24 * 3600 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("hour")) return n * 3600 * 1000;
  if (unit.startsWith("day")) return n * 86400 * 1000;
  if (unit.startsWith("year")) return n * 365 * 86400 * 1000;
  return 24 * 3600 * 1000;
}

function buildCandles(snapshots, period) {
  if (snapshots.length === 0) return [];

  const bucketMs = {
    "1h":  60 * 1000,
    "6h":  5 * 60 * 1000,
    "24h": 15 * 60 * 1000,
    "7d":  60 * 60 * 1000,
    "30d": 4 * 60 * 60 * 1000,
    "all": 24 * 60 * 60 * 1000,
  };
  const bucket = bucketMs[period] ?? 15 * 60 * 1000;
  const candles = [];
  let currentBucket = null;
  let candle = null;

  for (const s of snapshots) {
    const ts = new Date(s.time).getTime();
    const b = Math.floor(ts / bucket) * bucket;

    if (b !== currentBucket) {
      if (candle) candles.push(candle);
      currentBucket = b;
      candle = {
        time: new Date(b).toISOString(),
        open: s.price,
        high: s.price,
        low: s.price,
        close: s.price,
        volume: s.volume,
      };
    } else {
      candle.high = Math.max(candle.high, s.price);
      candle.low = Math.min(candle.low, s.price);
      candle.close = s.price;
      candle.volume += s.volume;
    }
  }

  if (candle) candles.push(candle);
  return candles;
}
