/**
 * feeSplitPreview.mjs — Preview ADVISORY del split del FeeRouter (C15)
 *
 * MIRROR-ONLY: TODA la matemática viene de lib/feeRouter.previewSplit (mirror
 * BigInt EXACTO de TotemFeeRouter.sol.harvest). NO inventa porcentajes, NO
 * recalcula reward fuera del cálculo por resta del contrato.
 *
 * Calculator-pure: no consulta RPC ni DB. El cliente pasa `balance` (string
 * BigInt en wei). En PROD el cliente lo obtiene via balanceOf(feeRouter) on-chain.
 *
 * INPUT:
 *   - balance (req)  balance del FeeRouter en unidades base (wei). String BigInt.
 *
 * Endpoint público advisory. No escribe nada.
 */

import { previewSplit, TREASURY_PCT, BUYBACK_PCT, REWARD_PCT, PCT_DENOMINATOR }
  from "../lib/feeRouter.mjs";

function parseBigIntStrict(value, name) {
  if (value === undefined || value === null) throw new Error(`${name} requerido`);
  const s = typeof value === "string" ? value.trim() : String(value);
  if (!/^\d+$/.test(s)) {
    throw new Error(`${name} debe ser entero no negativo string (recibido: ${JSON.stringify(value)})`);
  }
  return BigInt(s);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Método no permitido" });

  const { balance } = req.body ?? {};

  let balanceBI;
  try {
    balanceBI = parseBigIntStrict(balance, "balance");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  let preview;
  try {
    preview = previewSplit(balanceBI);
  } catch (e) {
    return res.status(500).json({ error: "Error en mirror feeRouter", detail: e.message });
  }

  // Si balance == 0, mirror devuelve { ok:false, reason:"no fees" }. Lo
  // exponemos como advisory para que la UI muestre "sin fees acumulados".
  if (!preview.ok) {
    return res.status(200).json({
      advisory: true,
      ok:       false,
      reason:   preview.reason,
      total:    "0",
      treasury: "0",
      buyback:  "0",
      reward:   "0",
      inputs:   { balance: balanceBI.toString() },
      constants: {
        TREASURY_PCT:    TREASURY_PCT.toString(),
        BUYBACK_PCT:     BUYBACK_PCT.toString(),
        REWARD_PCT:      REWARD_PCT.toString(),
        PCT_DENOMINATOR: PCT_DENOMINATOR.toString(),
      },
    });
  }

  // Sanity: invariante de conservación (defensa redundante; el mirror ya la garantiza)
  const sum = preview.treasury + preview.buyback + preview.reward;
  if (sum !== preview.total) {
    return res.status(500).json({
      error: "Invariante violada: treasury+buyback+reward != total",
      detail: { sum: sum.toString(), total: preview.total.toString() },
    });
  }

  return res.status(200).json({
    advisory: true,
    ok:       true,
    total:    preview.total.toString(),
    treasury: preview.treasury.toString(),
    buyback:  preview.buyback.toString(),
    reward:   preview.reward.toString(),
    inputs:   { balance: balanceBI.toString() },
    constants: {
      TREASURY_PCT:    TREASURY_PCT.toString(),
      BUYBACK_PCT:     BUYBACK_PCT.toString(),
      REWARD_PCT:      REWARD_PCT.toString(),
      PCT_DENOMINATOR: PCT_DENOMINATOR.toString(),
    },
    note: "Calculator-pure: balance se pasa como input. En PROD, el cliente lo lee con balanceOf(FEE_ROUTER_ADDRESS) vía RPC.",
  });
}
