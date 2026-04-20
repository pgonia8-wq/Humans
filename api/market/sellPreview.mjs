/**
 * sellPreview.mjs — Preview ADVISORY de venta
 *
 * Balance del usuario: calculado desde la tabla trades (DB aggregation)
 *   balance = SUM(tokens WHERE type='buy') - SUM(tokens WHERE type='sell')
 *
 * NO llama a ningún RPC ni contrato (sin importar el modo).
 * El límite 45% se enforza definitivamente on-chain cuando BONDING_CURVE_ADDRESS
 * está configurada. Este endpoint es siempre advisory.
 */

import { createClient } from "@supabase/supabase-js";
import { previewSell }   from "../lib/curve.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SELL_DAILY_LIMIT = 0.45;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const { totem, walletAddress, tokensToSell, userId } = req.body ?? {};

  if (!totem)         return res.status(400).json({ error: "totem requerido" });
  if (!walletAddress) return res.status(400).json({ error: "walletAddress requerido" });
  if (!userId)        return res.status(400).json({ error: "userId requerido" });

  const tokens = parseInt(tokensToSell, 10);
  if (!tokens || tokens <= 0) {
    return res.status(400).json({ error: "tokensToSell debe ser positivo" });
  }

  const totemLower = totem.toLowerCase();

  // ── 1. Leer estado del totem en DB ────────────────────────────────────────
  const { data: totemData } = await supabase
    .from("totems")
    .select("supply, price")
    .eq("address", totemLower)
    .single();

  if (!totemData) return res.status(404).json({ error: "Totem no encontrado" });

  // ── 2. Balance del usuario desde DB (aggregation de trades) ──────────────
  // balance = compras_acumuladas - ventas_acumuladas
  const { data: allTrades } = await supabase
    .from("trades")
    .select("type, tokens")
    .eq("totem", totemLower)
    .eq("user",  userId);

  const allTradesList  = allTrades ?? [];
  const totalBought    = allTradesList
    .filter(t => t.type === "buy")
    .reduce((s, t) => s + (t.tokens ?? 0), 0);
  const totalSold      = allTradesList
    .filter(t => t.type === "sell")
    .reduce((s, t) => s + (t.tokens ?? 0), 0);
  const userBalance    = Math.max(0, totalBought - totalSold);

  if (userBalance <= 0) {
    return res.status(400).json({ error: "No tienes tokens de este Totem (balance DB = 0)" });
  }
  if (tokens > userBalance) {
    return res.status(400).json({
      error: `Saldo insuficiente. Balance en DB: ${userBalance.toLocaleString()} tokens`,
    });
  }

  // ── 3. Vendido en últimas 24h ─────────────────────────────────────────────
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const sold24h  = allTradesList
    .filter(t => t.type === "sell" && t.timestamp >= since24h)
    .reduce((s, t) => s + (t.tokens ?? 0), 0);

  // Si los trades no tienen timestamp en la query anterior, hacer query separada
  const { data: todayTrades } = await supabase
    .from("trades")
    .select("tokens")
    .eq("totem",     totemLower)
    .eq("user",      userId)
    .eq("type",      "sell")
    .gte("timestamp", since24h);

  const soldToday          = (todayTrades ?? []).reduce((s, t) => s + (t.tokens ?? 0), 0);
  const dailyAllowance     = Math.floor(userBalance * SELL_DAILY_LIMIT);
  const remainingAllowance = Math.max(0, dailyAllowance - soldToday);

  let warningMsg = null;
  if (tokens > remainingAllowance) {
    return res.status(400).json({
      error:      "Límite diario del 45% superado (advisory)",
      warningMsg: `Puedes vender hasta ${remainingAllowance.toLocaleString()} tokens hoy`,
      remainingAllowance,
    });
  }
  if (remainingAllowance - tokens < dailyAllowance * 0.1) {
    warningMsg = `Quedarán ${(remainingAllowance - tokens).toLocaleString()} tokens vendibles hoy`;
  }

  // ── 4. Preview de curva (advisory) ────────────────────────────────────────
  const preview = previewSell(tokens, totemData.supply ?? 0);

  return res.status(200).json({
    advisory:          true,
    tokensIn:          tokens,
    wldOut:            preview.wldOut,
    fee:               preview.fee,
    priceAfter:        preview.priceAfter,
    supplyAfter:       (totemData.supply ?? 0) - tokens,
    userBalance,
    soldToday,
    remainingAllowance,
    warningMsg,
  });
}
