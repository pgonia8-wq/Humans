/**
 * antiManip-preview.mjs — Preview ADVISORY del EMA + cooldown
 *
 * MIRROR-ONLY: TODA la lógica viene de lib/antiManipulation.mjs (mirror BigInt
 * EXACTO de TotemAntiManipulationLayer.sol). NO se inventan heurísticas
 * (wash/sandwich/velocity/MEV). El contrato SOLO implementa EMA + cooldown.
 *
 * MODELO CALCULATOR-PURE:
 *   El endpoint NO consulta DB ni RPC. Recibe `prev`, `newValue`, `lastUpdate`
 *   del cliente (que en PROD los habrá leído del contrato vía RPC) y devuelve
 *   `updatePreview()` del mirror. Esto evita mentir con datos off-chain
 *   inventados (ONCHAIN WINS ALWAYS).
 *
 * INPUTS (todos string para preservar BigInt sin pérdida):
 *   - prev:        emaPrice anterior (wei). "0" si nunca actualizado.
 *   - newValue:    observación nueva (wei).
 *   - lastUpdate:  unix segundos del último updateOracle. "0" si nunca.
 *   - now:         opcional, unix segundos. Default: Date.now()/1000.
 *   - alpha:       opcional. Default: A.ALPHA (20).
 *
 * Endpoint público (advisory). No requiere Orb porque no escribe nada.
 */

import { updatePreview }   from "../lib/antiManipulation.mjs";
import { AntiManip as A }  from "../lib/protocolConstants.mjs";

// Parsea string → BigInt con validación estricta (no acepta floats, decimales,
// notación científica, signos negativos). Acepta "0" y enteros largos.
function parseBigIntStrict(value, name) {
  if (value === undefined || value === null) {
    throw new Error(`${name} requerido`);
  }
  const s = typeof value === "string" ? value.trim() : String(value);
  if (!/^\d+$/.test(s)) {
    throw new Error(`${name} debe ser entero no negativo en formato string (recibido: ${JSON.stringify(value)})`);
  }
  return BigInt(s);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Método no permitido" });

  const { prev, newValue, lastUpdate, now, alpha } = req.body ?? {};

  // ── 1. Parseo + validación estricta ──────────────────────────────────────
  let prevBI, newValueBI, lastUpdateBI, nowBI, alphaBI;
  try {
    prevBI       = parseBigIntStrict(prev,       "prev");
    newValueBI   = parseBigIntStrict(newValue,   "newValue");
    lastUpdateBI = parseBigIntStrict(lastUpdate, "lastUpdate");
    nowBI        = now !== undefined && now !== null
      ? parseBigIntStrict(now, "now")
      : BigInt(Math.floor(Date.now() / 1000));
    alphaBI      = alpha !== undefined && alpha !== null
      ? parseBigIntStrict(alpha, "alpha")
      : A.ALPHA;
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Sanity: alpha no puede exceder denominador (mirror lo enforza con throw)
  if (alphaBI > A.ALPHA_DENOMINATOR) {
    return res.status(400).json({
      error: `alpha=${alphaBI} > ALPHA_DENOMINATOR=${A.ALPHA_DENOMINATOR}`,
    });
  }

  // ── 2. Mirror call ───────────────────────────────────────────────────────
  let preview;
  try {
    preview = updatePreview({
      prev:       prevBI,
      newValue:   newValueBI,
      lastUpdate: lastUpdateBI,
      now:        nowBI,
      alpha:      alphaBI,
    });
  } catch (e) {
    return res.status(500).json({ error: "Error en mirror antiManip", detail: e.message });
  }

  // ── 3. Response (BigInt → string) ────────────────────────────────────────
  return res.status(200).json({
    advisory:           true,
    nextEma:            preview.nextEma.toString(),
    canUpdateNow:       preview.canUpdateNow,
    secondsUntilUnlock: preview.secondsUntilUnlock.toString(),
    blockedBy:          preview.blockedBy,
    inputs: {
      prev:       prevBI.toString(),
      newValue:   newValueBI.toString(),
      lastUpdate: lastUpdateBI.toString(),
      now:        nowBI.toString(),
      alpha:      alphaBI.toString(),
    },
    constants: {
      ALPHA:             A.ALPHA.toString(),
      ALPHA_DENOMINATOR: A.ALPHA_DENOMINATOR.toString(),
      MIN_INTERVAL_SEC:  A.MIN_INTERVAL_SEC.toString(),
    },
    note: "Calculator-pure: este endpoint no consulta DB/RPC. El cliente debe leer prev/lastUpdate del contrato AntiManipulationLayer cuando esté deployado.",
  });
}
