/**
 * intentRouter.mjs — Mirror BigInt de TotemIntentRouter.sol (C17)
 *
 * SOLE SOURCE OF TRUTH: tótem/contracts/TotemIntentRouter.sol
 *
 * ⚠️ COBERTURA PARCIAL POR DISEÑO
 * El contrato fuente está incompleto en el repo: la línea 94 dice literalmente
 *     // ... (Firma y Withdraw functions)
 * y _calculateIntentHash + _verifySignature + withdraw NO tienen cuerpo
 * visible. Por la regla "NO inventar lógica del contrato", este mirror SOLO
 * refleja las partes que SÍ están escritas en el .sol:
 *
 *   ✅ EIP-712 domain (name="TotemProtocol", version="1")
 *   ✅ Número fijo de oráculos (3) para consensus
 *   ✅ _median(a,b,c) — algoritmo de mediana de 3 valores
 *   ✅ _getConsensus(user) — aplica median a (score, influence) de los 3 oracles
 *   ✅ Validación de slippage: price <= maxPrice
 *   ✅ Validación de deadline: block.timestamp <= deadline
 *   ✅ Pull-over-push: si msg.value > price, surplus va a pendingReturns[user]
 *
 *   ❌ _calculateIntentHash (typehash desconocido — fuera del repo)
 *   ❌ _verifySignature
 *   ❌ withdraw / pendingReturns withdrawal
 *
 * Cuando se complete la fuente Solidity, este mirror se extiende SIN inventar.
 */

export const ORACLE_COUNT = 3;
export const EIP712_DOMAIN_NAME = "TotemProtocol";
export const EIP712_DOMAIN_VERSION = "1";

// ═════════════════════════════════════════════════════════════════════
// MEDIAN of 3 — mirror exacto de _median(uint256 a, uint256 b, uint256 c)
// ═════════════════════════════════════════════════════════════════════
//
// if ((a >= b && a <= c) || (a <= b && a >= c)) return a;
// if ((b >= a && b <= c) || (b <= a && b >= c)) return b;
// return c;
//
// Refleja la lógica EXACTA del contrato: cualquier valor que esté entre los
// otros dos (en cualquier orden) gana. Sin invención.

export function median3(a, b, c) {
  const ba = BigInt(a);
  const bb = BigInt(b);
  const bc = BigInt(c);
  if ((ba >= bb && ba <= bc) || (ba <= bb && ba >= bc)) return ba;
  if ((bb >= ba && bb <= bc) || (bb <= ba && bb >= bc)) return bb;
  return bc;
}

// ═════════════════════════════════════════════════════════════════════
// CONSENSUS — mirror de _getConsensus(user)
// ═════════════════════════════════════════════════════════════════════
//
// El contrato pide a oracles[0..2].getMetrics(user) y aplica median tanto
// al score como al influence. Aquí recibimos los 3 readings ya hechos.
//
// readings = [{ score, influence, timestamp }, ...] (length 3)
// Devuelve { score, influence } (BigInt).

export function consensus(readings) {
  if (!Array.isArray(readings) || readings.length !== ORACLE_COUNT) {
    throw new Error(`consensus: expected ${ORACLE_COUNT} readings, got ${readings?.length}`);
  }
  const scores = readings.map(r => BigInt(r.score));
  const infs = readings.map(r => BigInt(r.influence));
  return {
    score: median3(scores[0], scores[1], scores[2]),
    influence: median3(infs[0], infs[1], infs[2]),
  };
}

// ═════════════════════════════════════════════════════════════════════
// EXECUTE INTENT — preview de las validaciones visibles del contrato
// ═════════════════════════════════════════════════════════════════════
//
// Cubre lo que el contrato hace de forma visible (omitiendo la verificación
// de firma cuyo typehash no está en el .sol):
//
//   require(block.timestamp <= deadline);                  // Intent Expired
//   require(attestation.isHuman(user));                    // Not a verified human
//   require(price <= maxPrice);                            // Slippage
//   require(msg.value >= price);                           // Insufficient payment
//   if (msg.value > price) pendingReturns[user] += surplus;
//
// Inputs (BigInt-coercible donde aplica):
//   nowSec       block.timestamp
//   deadline     deadline del intent
//   isHuman      attestation.isHuman(user)
//   price        curve.getPrice(supply)
//   maxPrice     maxPrice firmado en el intent
//   msgValue     valor enviado en la transacción
//
// Devuelve { ok: false, reason } o { ok: true, surplus }.

export function previewExecuteIntent({
  nowSec,
  deadline,
  isHuman,
  price,
  maxPrice,
  msgValue,
}) {
  const now = BigInt(nowSec);
  const dl = BigInt(deadline);
  const p = BigInt(price);
  const mp = BigInt(maxPrice);
  const mv = BigInt(msgValue);

  if (now > dl) {
    return { ok: false, reason: "Intent Expired" };
  }
  if (!isHuman) {
    return { ok: false, reason: "Not a verified human" };
  }
  if (p > mp) {
    return { ok: false, reason: "Price exceeds maxPrice (Slippage)" };
  }
  if (mv < p) {
    return { ok: false, reason: "Insufficient payment for cubic price" };
  }
  // Pull-over-push: surplus pendiente de withdraw para el user
  const surplus = mv - p;
  return { ok: true, surplus };
}
