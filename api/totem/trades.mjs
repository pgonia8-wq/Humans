/**
 * GET /api/totem/trades?address=<0x...>&limit=<n>
 *
 * Últimos N trades de un Totem (orden DESC por timestamp).
 * READ-ONLY. NO modifica nada. Lee la tabla `trades` que ya escribe
 * /api/market/execute al confirmar buy/sell. SIEMPRE responde JSON
 * válido (array, vacío si no hay datos).
 *
 * Shape de cada trade:
 *   { id, type: "buy"|"sell", user, totem, amount: number (WLD),
 *     tokens: number, tx_hash, timestamp }
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const address = String(req.query?.address ?? "").toLowerCase().trim();
    const limit   = Math.min(parseInt(req.query?.limit ?? "50", 10) || 50, 200);

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: "address inválida" });
    }

    const { data, error } = await supabase
      .from("trades")
      .select("id, type, user, totem, amount, tokens, tx_hash, timestamp")
      .eq("totem", address)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[/api/totem/trades] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const rows = (data ?? []).map((r) => ({
      id:        String(r.id ?? ""),
      type:      r.type === "sell" ? "sell" : "buy",
      user:      String(r.user ?? ""),
      totem:     String(r.totem ?? ""),
      amount:    Number(r.amount ?? 0),
      tokens:    Number(r.tokens ?? 0),
      tx_hash:   String(r.tx_hash ?? ""),
      timestamp: r.timestamp ?? new Date().toISOString(),
    }));

    return res.status(200).json(rows);
  } catch (err) {
    console.error("[/api/totem/trades] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
