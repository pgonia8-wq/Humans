/**
 * tradeLimits.mjs — Límites de trading del usuario
 *
 * Balance: calculado desde DB (aggregation de trades).
 * NO depende de ningún RPC ni contrato en ningún modo.
 * El contrato enforza el límite definitivo en producción.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SELL_DAILY_LIMIT = 0.45;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { totem, walletAddress, userId } = req.body ?? {};

  if (!totem)         return res.status(400).json({ error: "totem requerido" });
  if (!walletAddress) return res.status(400).json({ error: "walletAddress requerido" });
  if (!userId)        return res.status(400).json({ error: "userId requerido" });

  const totemLower = totem.toLowerCase();

  // ── Balance desde DB aggregation ──────────────────────────────────────────
  const { data: allTrades } = await supabase
    .from("trades")
    .select("type, tokens")
    .eq("totem", totemLower)
    .eq("user",  userId);

  const list       = allTrades ?? [];
  const bought     = list.filter(t => t.type === "buy" ).reduce((s, t) => s + (t.tokens ?? 0), 0);
  const sold       = list.filter(t => t.type === "sell").reduce((s, t) => s + (t.tokens ?? 0), 0);
  const userBalance = Math.max(0, bought - sold);

  // ── Vendido en últimas 24h ────────────────────────────────────────────────
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: todayTrades } = await supabase
    .from("trades")
    .select("tokens")
    .eq("totem",     totemLower)
    .eq("user",      userId)
    .eq("type",      "sell")
    .gte("timestamp", since24h);

  const soldToday      = (todayTrades ?? []).reduce((s, t) => s + (t.tokens ?? 0), 0);
  const dailyAllowance = Math.floor(userBalance * SELL_DAILY_LIMIT);
  const remaining      = Math.max(0, dailyAllowance - soldToday);

  return res.status(200).json({
    advisory:           true,
    userBalance,
    soldToday,
    remainingAllowance: remaining,
    dailyAllimitPct:    SELL_DAILY_LIMIT,
  });
}
