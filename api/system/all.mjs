/**
 * GET /api/system/all?sort=volume|price|score|supply&limit=50
 *
 * Lista de totems ordenada. SIEMPRE devuelve JSON válido (array).
 * Ante error interno → 500 con { error }.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const SORT_MAP = {
  volume: "volume_24h",
  price:  "price",
  score:  "score",
  supply: "supply",
};

export default async function handler(req, res) {
  try {
    const sortParam = String(req.query?.sort ?? "volume");
    const limit     = Math.min(parseInt(req.query?.limit ?? "50", 10) || 50, 200);
    const orderCol  = SORT_MAP[sortParam] ?? "volume_24h";

    const { data, error } = await supabase
      .from("totems")
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at")
      .order(orderCol, { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error("[/api/system/all] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(
      (data ?? []).map((t) => ({
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
      })),
    );
  } catch (err) {
    console.error("[/api/system/all] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
