/**
 * transferPreview.mjs — Preview ADVISORY del fee dinámico de HumanTotem (C8)
 *
 * MIRROR-ONLY: TODA la matemática viene de lib/humanTotemFees.previewTransfer
 * (mirror BigInt EXACTO de HumanTotem.sol._transfer + _calculateDynamicFee).
 * Este endpoint NO inventa thresholds, NO toca constantes, NO consulta RPC ni
 * DB: es calculator-pure.
 *
 * INPUTS (todos string para preservar BigInt sin pérdida de precisión):
 *   - amount         (req)  cantidad a transferir (en unidades base del token)
 *   - score          (req)  score actual del avatar (Oracle)
 *   - scoreAgeSec    (opt)  edad del score on-chain. "0" si oracleHasScore=false
 *   - oracleHasScore (opt)  bool, default true. Si false → no se chequea staleness
 *   - fromOwner      (opt)  bool, default false. Si true → fee=0 (AMM safe)
 *   - locked         (opt)  bool, default false. Si true → revert HumanFraudDetected
 *   - baseFeeBps     (opt)  string. Default "0" (mismo default del contrato)
 *
 * Endpoint público (advisory). No requiere Orb porque no escribe nada.
 */

import { previewTransfer, MAX_SCORE_STALENESS_SEC,
         SCORE_THRESHOLD_LOW, SCORE_THRESHOLD_CRITICAL,
         FEE_BPS_LOW, FEE_BPS_CRITICAL, FEE_BPS_DENOMINATOR } from "../lib/humanTotemFees.mjs";

function parseBigIntStrict(value, name, { allowNullDefault = null } = {}) {
  if (value === undefined || value === null || value === "") {
    if (allowNullDefault !== null) return allowNullDefault;
    throw new Error(`${name} requerido`);
  }
  const s = typeof value === "string" ? value.trim() : String(value);
  if (!/^\d+$/.test(s)) {
    throw new Error(`${name} debe ser entero no negativo string (recibido: ${JSON.stringify(value)})`);
  }
  return BigInt(s);
}
function parseBoolStrict(value, name, def) {
  if (value === undefined || value === null) return def;
  if (typeof value === "boolean") return value;
  throw new Error(`${name} debe ser boolean`);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Método no permitido" });

  const {
    amount, score, scoreAgeSec, oracleHasScore, fromOwner, locked, baseFeeBps,
  } = req.body ?? {};

  let amountBI, scoreBI, ageBI, baseBpsBI, ownerB, lockedB, hasScoreB;
  try {
    amountBI   = parseBigIntStrict(amount,   "amount");
    scoreBI    = parseBigIntStrict(score,    "score");
    ageBI      = parseBigIntStrict(scoreAgeSec, "scoreAgeSec", { allowNullDefault: 0n });
    baseBpsBI  = parseBigIntStrict(baseFeeBps,  "baseFeeBps",  { allowNullDefault: 0n });
    ownerB     = parseBoolStrict(fromOwner,      "fromOwner",      false);
    lockedB    = parseBoolStrict(locked,         "locked",         false);
    hasScoreB  = parseBoolStrict(oracleHasScore, "oracleHasScore", true);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  if (baseBpsBI > FEE_BPS_DENOMINATOR) {
    return res.status(400).json({ error: `baseFeeBps=${baseBpsBI} > ${FEE_BPS_DENOMINATOR}` });
  }

  let preview;
  try {
    preview = previewTransfer({
      amount:         amountBI,
      score:          scoreBI,
      fromOwner:      ownerB,
      locked:         lockedB,
      scoreAgeSec:    ageBI,
      oracleHasScore: hasScoreB,
      baseFeeBps:     baseBpsBI,
    });
  } catch (e) {
    return res.status(500).json({ error: "Error en mirror humanTotemFees", detail: e.message });
  }

  if (!preview.ok) {
    return res.status(200).json({
      advisory: true,
      ok:       false,
      reason:   preview.reason,
      maxStalenessSec: preview.maxStalenessSec ? preview.maxStalenessSec.toString() : undefined,
      inputs: {
        amount: amountBI.toString(), score: scoreBI.toString(),
        scoreAgeSec: ageBI.toString(), oracleHasScore: hasScoreB,
        fromOwner: ownerB, locked: lockedB, baseFeeBps: baseBpsBI.toString(),
      },
    });
  }

  return res.status(200).json({
    advisory: true,
    ok:       true,
    exempted: preview.exempted,
    feeBps:   preview.feeBps.toString(),
    fee:      preview.fee.toString(),
    net:      preview.net.toString(),
    treasury: preview.treasury.toString(),
    inputs: {
      amount: amountBI.toString(), score: scoreBI.toString(),
      scoreAgeSec: ageBI.toString(), oracleHasScore: hasScoreB,
      fromOwner: ownerB, locked: lockedB, baseFeeBps: baseBpsBI.toString(),
    },
    constants: {
      SCORE_THRESHOLD_LOW:      SCORE_THRESHOLD_LOW.toString(),
      SCORE_THRESHOLD_CRITICAL: SCORE_THRESHOLD_CRITICAL.toString(),
      FEE_BPS_LOW:              FEE_BPS_LOW.toString(),
      FEE_BPS_CRITICAL:         FEE_BPS_CRITICAL.toString(),
      FEE_BPS_DENOMINATOR:      FEE_BPS_DENOMINATOR.toString(),
      MAX_SCORE_STALENESS_SEC:  MAX_SCORE_STALENESS_SEC.toString(),
    },
    note: "Calculator-pure: no consulta RPC. Cuando HUMAN_TOTEM_ADDRESS exista, el cliente lee score real + scoreAge + locked vía RPC y los pasa aquí.",
  });
}
