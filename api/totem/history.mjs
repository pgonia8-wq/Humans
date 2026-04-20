/**
 * GET /api/totem/history?address=<0x...>&limit=<n>
 *
 * Serie histórica de score/precio de un Totem (asc por timestamp).
 * SIEMPRE responde JSON válido (array, vacío si no hay datos).
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const address = String(req.query?.address ?? "").toLowerCase().trim();
    const limit   = Math.min(parseInt(req.query?.limit ?? "48", 10) || 48, 500);

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: "address inválida" });
    }

    // Trae los más recientes (DESC), luego invertimos para entregar ASC al cliente
    const { data, error } = await supabase
      .from("totem_history")
      .select("id, totem, score, price, timestamp")
      .eq("totem", address)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[/api/totem/history] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const rows = (data ?? [])
      .slice()
      .reverse()
      .map((r) => ({
        id:        String(r.id ?? ""),
        totem:     r.totem,
        score:     Number(r.score ?? 0),
        price:     Number(r.price ?? 0),
        timestamp: r.timestamp ?? new Date().toISOString(),
      }));

    return res.status(200).json(rows);
  } catch (err) {
    console.error("[/api/totem/history] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
