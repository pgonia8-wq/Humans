/**
 * GET /api/totem/holders?address=<0x...>&limit=<n>
 *
 * Top holders DERIVADO de la tabla `trades`:
 *   holdings(user) = sum(tokens en buys del user) - sum(tokens en sells del user)
 * Ordenado DESC. Solo holders con holding > 0.
 *
 * READ-ONLY. NO escribe. SIEMPRE responde JSON válido (array, vacío si no hay).
 *
 * Shape:
 *   { user_id: string, tokens: number, share_pct: number, last_trade: string|null }
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  try {
    const address = String(req.query?.address ?? "").toLowerCase().trim();
    const limit   = Math.min(parseInt(req.query?.limit ?? "20", 10) || 20, 100);

    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: "address inválida" });
    }

    // Trae todos los trades del totem (paginado defensivo a 5k últimos).
    // Para totems con > 5k trades convendría una RPC server-side; suficiente
    // para la fase actual.
    const { data, error } = await supabase
      .from("trades")
      .select("user, type, tokens, timestamp")
      .eq("totem", address)
      .order("timestamp", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("[/api/totem/holders] supabase error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    const acc = new Map(); // user → { tokens, last_trade }
    for (const r of data ?? []) {
      const u   = String(r.user ?? "");
      if (!u) continue;
      const tk  = Number(r.tokens ?? 0);
      const cur = acc.get(u) ?? { tokens: 0, last_trade: null };
      cur.tokens += r.type === "sell" ? -tk : tk;
      // como vienen DESC, el primero que vemos por user es el más reciente
      if (!cur.last_trade) cur.last_trade = r.timestamp ?? null;
      acc.set(u, cur);
    }

    const holdersAll = Array.from(acc.entries())
      .map(([user_id, v]) => ({
        user_id,
        tokens: Math.max(0, Math.floor(v.tokens)),
        last_trade: v.last_trade,
      }))
      .filter((h) => h.tokens > 0);

    const totalSupply = holdersAll.reduce((s, h) => s + h.tokens, 0);

    const ranked = holdersAll
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, limit)
      .map((h) => ({
        ...h,
        share_pct: totalSupply > 0 ? (h.tokens / totalSupply) * 100 : 0,
      }));

    return res.status(200).json({
      total_holders: holdersAll.length,
      total_supply_derived: totalSupply,
      holders: ranked,
    });
  } catch (err) {
    console.error("[/api/totem/holders] unhandled:", err);
    return res.status(500).json({ error: err?.message ?? "internal error" });
  }
}
