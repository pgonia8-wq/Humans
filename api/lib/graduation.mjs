/**
 * graduation.mjs — Mirror BigInt EXACTO de TotemGraduationManager.sol
 *
 * RESPONSABILIDAD ÚNICA:
 *   Replicar canGraduate() + graduate() guard + AMM math del contrato como
 *   primitivas pure. NO consulta Registry/Curve/Metrics — recibe inputs.
 *
 * EL CONTRATO IMPLEMENTA (y por tanto este módulo replica):
 *   - canGraduate(user) gating con orden exacto de checks
 *   - getVolume usando ÚNICAMENTE verifiedVolume (rawVolume excluido)
 *   - graduate() guard sequence: AlreadyGraduated → FraudLocked → NotEligible
 *   - Liquidity math al crear AMM: liquidityBps del supply, price scaling
 *
 * EL CONTRATO NO IMPLEMENTA OFF-CHAIN (este módulo NO replica):
 *   ✗ Despliegue real del HumanTotem ERC20
 *   ✗ Llamadas a Uniswap V2 Factory/Router
 *   ✗ Transferencias WLD (esto solo on-chain)
 *   ✗ Estado mutable graduated[] (ese vive en el contrato)
 *
 * SEMÁNTICA DE RESULTADO:
 *   - canGraduate() devuelve { eligible, reason }: UX puede mostrar QUÉ falta
 *   - graduateGuard() throws GraduationError(code) en orden mirror del contrato
 *   - calcLiquidityAmounts() pure math, throws si supply==0 (mirror require)
 */

import { Graduation as G } from "./protocolConstants.mjs";

// ════════════════════════════════════════════════════════════════════════════
// ERRORS — mirror de los nombres on-chain
// ════════════════════════════════════════════════════════════════════════════

export class GraduationError extends Error {
  constructor(code, reason) {
    super(reason ? `${code}: ${reason}` : code);
    this.name = "GraduationError";
    this.code = code;       // 'AlreadyGraduated' | 'FraudLocked' | 'NotEligible' | 'NoSupply'
    this.reason = reason;   // sub-reason cuando NotEligible
  }
}

// Razones específicas de NotEligible (para UX granular)
export const NOT_ELIGIBLE_REASONS = Object.freeze({
  NOT_REGISTERED:  "NOT_REGISTERED",   // createdAt == 0
  LEVEL_TOO_LOW:   "LEVEL_TOO_LOW",
  SUPPLY_TOO_LOW:  "SUPPLY_TOO_LOW",
  VOLUME_TOO_LOW:  "VOLUME_TOO_LOW",
  TOO_YOUNG:       "TOO_YOUNG",
});

// ════════════════════════════════════════════════════════════════════════════
// PRIMITIVAS PURE — espejo exacto del contrato
// ════════════════════════════════════════════════════════════════════════════

/**
 * _getVolume mirror — solo verifiedVolume.
 *
 * Contrato (líneas 122-129):
 *   (, uint256 verifiedVolume,,) = metrics.markets(user);
 *   if (verifiedVolume == 0) return 0;
 *   return verifiedVolume;
 *
 * @param {bigint} verifiedVolume
 * @returns {bigint}
 */
export function getVolume(verifiedVolume) {
  if (typeof verifiedVolume !== "bigint") {
    throw new TypeError("getVolume: verifiedVolume must be bigint");
  }
  if (verifiedVolume === 0n) return 0n;
  return verifiedVolume;
}

/**
 * canGraduate mirror — read-only eligibility check.
 *
 * Mirror literal del contrato (líneas 131-152), orden EXACTO.
 *
 * @param {object} p
 * @param {boolean} p.alreadyGraduated      - graduated[user] del contrato
 * @param {boolean} p.fraudLocked           - status.fraudLocked
 * @param {bigint}  p.level                 - status.level (raw, no clamp aquí)
 * @param {bigint}  p.supply                - curve.getSupply(user)
 * @param {bigint}  p.createdAt             - metrics.markets.createdAt (0 si no registrado)
 * @param {bigint}  p.verifiedVolume        - metrics.markets.verifiedVolume
 * @param {bigint}  p.now                   - block.timestamp
 * @param {object}  [p.params]              - override de constantes (default G)
 * @returns {{eligible: boolean, reason: string|null}}
 */
export function canGraduate({
  alreadyGraduated,
  fraudLocked,
  level,
  supply,
  createdAt,
  verifiedVolume,
  now,
  params = G,
}) {
  // Type guards (lo que es bigint)
  for (const [k, v] of Object.entries({ level, supply, createdAt, verifiedVolume, now })) {
    if (typeof v !== "bigint") throw new TypeError(`canGraduate: ${k} must be bigint`);
  }
  if (typeof alreadyGraduated !== "boolean" || typeof fraudLocked !== "boolean") {
    throw new TypeError("canGraduate: alreadyGraduated/fraudLocked must be boolean");
  }

  // Orden mirror del contrato — primer check que falle determina la razón
  if (alreadyGraduated) return { eligible: false, reason: "ALREADY_GRADUATED" };
  if (fraudLocked)      return { eligible: false, reason: "FRAUD_LOCKED" };
  if (createdAt === 0n) return { eligible: false, reason: NOT_ELIGIBLE_REASONS.NOT_REGISTERED };

  const volume = getVolume(verifiedVolume);

  if (level   < params.MIN_LEVEL)        return { eligible: false, reason: NOT_ELIGIBLE_REASONS.LEVEL_TOO_LOW };
  if (supply  < params.MIN_SUPPLY)       return { eligible: false, reason: NOT_ELIGIBLE_REASONS.SUPPLY_TOO_LOW };
  if (volume  < params.MIN_VOLUME_WEI)   return { eligible: false, reason: NOT_ELIGIBLE_REASONS.VOLUME_TOO_LOW };
  if (now     < createdAt + params.MIN_AGE_SEC) {
    return { eligible: false, reason: NOT_ELIGIBLE_REASONS.TOO_YOUNG };
  }
  return { eligible: true, reason: null };
}

/**
 * graduateGuard mirror — pre-tx check con throws en orden del contrato.
 *
 * Mirror literal de graduate() (líneas 213-232):
 *   1. if (graduated[user]) revert AlreadyGraduated
 *   2. if (fraudLocked) revert FraudLocked
 *   3. if (!canGraduate(user)) revert NotEligible
 *
 * Útil para validar antes de firmar la tx y dar UX precisa.
 *
 * @throws GraduationError
 */
export function graduateGuard(input) {
  if (typeof input.alreadyGraduated !== "boolean") {
    throw new TypeError("graduateGuard: alreadyGraduated must be boolean");
  }
  if (input.alreadyGraduated) throw new GraduationError("AlreadyGraduated");
  if (input.fraudLocked)      throw new GraduationError("FraudLocked");
  const r = canGraduate(input);
  if (!r.eligible) throw new GraduationError("NotEligible", r.reason);
}

/**
 * calcLiquidityAmounts mirror — math del bloque _createAMM (líneas 173-208).
 *
 * Contrato:
 *   uint256 amountToken     = (supply * liquidityBps) / 10_000;   // truncated
 *   uint256 amountTokenWei  = amountToken * 1e18;
 *   uint256 amountWLD       = (amountTokenWei * price) / 1e18;    // truncated
 *
 * require(supply > 0) → throw GraduationError('NoSupply').
 *
 * @param {object} p
 * @param {bigint} p.supply           - curve.getSupply (raw, no wei)
 * @param {bigint} p.price            - curve.getPrice (wei por token)
 * @param {bigint} [p.liquidityBps]   - default G.LIQUIDITY_BPS
 * @returns {{amountToken: bigint, amountTokenWei: bigint, amountWLD: bigint}}
 */
export function calcLiquidityAmounts({ supply, price, liquidityBps = G.LIQUIDITY_BPS }) {
  if (typeof supply !== "bigint" || typeof price !== "bigint" || typeof liquidityBps !== "bigint") {
    throw new TypeError("calcLiquidityAmounts: supply/price/liquidityBps must be bigint");
  }
  if (supply <= 0n) throw new GraduationError("NoSupply", "supply must be > 0 (mirror require)");
  if (liquidityBps <= 0n || liquidityBps > G.BPS_DENOMINATOR) {
    throw new RangeError(`calcLiquidityAmounts: liquidityBps=${liquidityBps} out of (0, ${G.BPS_DENOMINATOR}]`);
  }
  if (price < 0n) throw new RangeError("calcLiquidityAmounts: price must be >= 0");

  const amountToken    = (supply * liquidityBps) / G.BPS_DENOMINATOR;       // truncated integer
  const amountTokenWei = amountToken * G.WEI_PER_TOKEN;
  const amountWLD      = (amountTokenWei * price) / G.WEI_PER_TOKEN;

  return { amountToken, amountTokenWei, amountWLD };
}

// ════════════════════════════════════════════════════════════════════════════
// PREVIEW HELPER — vista compuesta para UI
// ════════════════════════════════════════════════════════════════════════════

/**
 * Vista derivada para UI: "qué falta para graduarme".
 *
 * NO inventa thresholds — derivados directos de Graduation constants.
 *
 * @returns {{
 *   eligible: boolean,
 *   reason: string|null,
 *   gaps: {
 *     level:   {required: bigint, current: bigint, missing: bigint},
 *     supply:  {required: bigint, current: bigint, missing: bigint},
 *     volume:  {required: bigint, current: bigint, missing: bigint},
 *     age:     {required: bigint, current: bigint, missing: bigint, unlockAt: bigint}
 *   }
 * }}
 */
export function graduationPreview(input) {
  const params = input.params ?? G;
  const r = canGraduate(input);
  const volume = getVolume(input.verifiedVolume);
  const age = input.createdAt === 0n ? 0n : (input.now - input.createdAt);
  const ageRequired = params.MIN_AGE_SEC;

  return {
    eligible: r.eligible,
    reason:   r.reason,
    gaps: {
      level: {
        required: params.MIN_LEVEL,
        current:  input.level,
        missing:  input.level >= params.MIN_LEVEL ? 0n : params.MIN_LEVEL - input.level,
      },
      supply: {
        required: params.MIN_SUPPLY,
        current:  input.supply,
        missing:  input.supply >= params.MIN_SUPPLY ? 0n : params.MIN_SUPPLY - input.supply,
      },
      volume: {
        required: params.MIN_VOLUME_WEI,
        current:  volume,
        missing:  volume >= params.MIN_VOLUME_WEI ? 0n : params.MIN_VOLUME_WEI - volume,
      },
      age: {
        required: ageRequired,
        current:  age,
        missing:  age >= ageRequired ? 0n : ageRequired - age,
        unlockAt: input.createdAt === 0n ? 0n : input.createdAt + ageRequired,
      },
    },
  };
}
