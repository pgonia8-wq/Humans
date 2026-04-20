/**
 * GET /api/system/search?q=<query>
 *
 * Búsqueda por nombre (ilike). SIEMPRE responde array JSON.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const q = String(req.query?.q ?? "").trim();
    if (!q || q.length < 1) return res.status(200).json([]);

    const safe = q.replace(/[%_]/g, "\\$&");

    const { data, error } = await supabase
      .from("totems")
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at")
      .ilike("name", `%${safe}%`)
      .order("volume_24h", { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) {
      console.error("[/api/system/search] supabase error:", error.message);
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
    console.error("[/api/system/search] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
