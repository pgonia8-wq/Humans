/**
 * GET /api/system/metrics
 *
 * Métricas agregadas del sistema. SIEMPRE responde JSON válido.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("totems")
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at");

    if (error) {
      console.error("[/api/system/metrics] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const list = (data ?? []).map((t) => ({
      address:    t.address,
      name:       t.name        ?? "",
      score:      Number(t.score      ?? 0),
      influence:  Number(t.influence  ?? 0),
      level:      Number(t.level      ?? 1),
      badge:      t.badge       ?? "",
      price:      Number(t.price      ?? 0),
      supply:     Number(t.supply     ?? 0),
      volume_24h: Number(t.volume_24h ?? 0),
      created_at: t.created_at  ?? new Date().toISOString(),
    }));

    const totalTotems = list.length;
    const totalVolume = list.reduce((s, t) => s + t.volume_24h, 0);
    const avgPrice    = totalTotems > 0
      ? list.reduce((s, t) => s + t.price, 0) / totalTotems
      : 0;
    const topTotem    = list.length > 0
      ? list.slice().sort((a, b) => b.volume_24h - a.volume_24h)[0]
      : null;

    return res.status(200).json({
      totalTotems, totalVolume, avgPrice, topTotem,
    });
  } catch (err) {
    console.error("[/api/system/metrics] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
