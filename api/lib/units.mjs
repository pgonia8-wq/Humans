/**
 * units.mjs — Single source of truth para UNIDADES y RANGOS del protocolo
 *
 * Este módulo NO tiene lógica de negocio: solo declara las unidades nominales
 * que cualquier código off-chain debe respetar al hablar con el contrato.
 * Cualquier ambigüedad de unidades se resuelve aquí, no inline.
 *
 * Reglas:
 *   - NO hay conversión "implícita" entre escalas: usar mapEngineToOracleScore().
 *   - NO existe "score normalizado": existen DOS escalas distintas con semántica
 *     diferente (Oracle = señal de mercado, Engine = reputación humana).
 *   - NO usar números mágicos en el resto del código: importar de aquí o de
 *     protocolConstants.mjs.
 */

// ════════════════════════════════════════════════════════════════════════════
// UNIDADES NOMINALES (etiquetas, no valores)
// ════════════════════════════════════════════════════════════════════════════

export const REAL_SUPPLY_UNIT = "RAW_TOKEN_UNITS_INTEGER";
export const BALANCE_UNIT     = "RAW_TOKEN_UNITS_INTEGER";
export const WLD_UNIT         = "WLD_WEI_18DEC";
export const PRICE_UNIT       = "WLD_WEI_PER_TOKEN_UNIT";
export const TIME_UNIT        = "UNIX_SECONDS";
export const BPS_DENOMINATOR  = 10000;

// ════════════════════════════════════════════════════════════════════════════
// RANGOS DE SCORE — DOBLE ESCALA OFICIAL (decisión de arquitectura aprobada)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Oracle score / influence — escala económica que firma el Oracle on-chain.
 * Validada por TotemOracle.sol::update() con revert InvalidRange.
 * Default neutral del Oracle = 1000 (cuando metrics[user].score == 0).
 */
export const SCORE_UNIT_ORACLE = Object.freeze({
  min: 975,
  max: 1025,
  base: 1000,
  semantics: "MARKET_SCORE",
  enforcedBy: "TotemOracle.sol::update",
});

export const INFLUENCE_UNIT_ORACLE = Object.freeze({
  min: 975,
  max: 1025,
  base: 1000,
  semantics: "MARKET_INFLUENCE",
  enforcedBy: "TotemOracle.sol::update",
});

/**
 * Engine score — escala de reputación humana producida por scoreEngine.mjs.
 * Coincide con la escala usada por Tótem.sol (calculateBadge: 5000/8000) y
 * HumanTotem.sol (penalty: 2000/4000). Es independiente del Oracle.
 */
export const SCORE_UNIT_ENGINE = Object.freeze({
  min: 0,
  max: 10000,
  base: 0,
  semantics: "HUMAN_REPUTATION",
  producedBy: "scoreEngine.mjs::calculateScore",
});

// ════════════════════════════════════════════════════════════════════════════
// ASSERTS — usar SIEMPRE antes de firmar / persistir / emitir al contrato
// ════════════════════════════════════════════════════════════════════════════

export class UnitError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "UnitError";
    this.code = code;
  }
}

export function assertOracleScore(s) {
  if (typeof s !== "number" && typeof s !== "bigint") {
    throw new UnitError("OracleScoreType", `score must be number|bigint, got ${typeof s}`);
  }
  const n = Number(s);
  if (!Number.isInteger(n)) throw new UnitError("OracleScoreInteger", `score must be integer, got ${s}`);
  if (n < SCORE_UNIT_ORACLE.min || n > SCORE_UNIT_ORACLE.max) {
    throw new UnitError("OracleScoreRange",
      `score ${n} outside [${SCORE_UNIT_ORACLE.min}, ${SCORE_UNIT_ORACLE.max}] (Oracle would revert InvalidRange)`);
  }
  return n;
}

export function assertOracleInfluence(i) {
  if (typeof i !== "number" && typeof i !== "bigint") {
    throw new UnitError("OracleInfluenceType", `influence must be number|bigint, got ${typeof i}`);
  }
  const n = Number(i);
  if (!Number.isInteger(n)) throw new UnitError("OracleInfluenceInteger", `influence must be integer, got ${i}`);
  if (n < INFLUENCE_UNIT_ORACLE.min || n > INFLUENCE_UNIT_ORACLE.max) {
    throw new UnitError("OracleInfluenceRange",
      `influence ${n} outside [${INFLUENCE_UNIT_ORACLE.min}, ${INFLUENCE_UNIT_ORACLE.max}] (Oracle would revert InvalidRange)`);
  }
  return n;
}

export function assertEngineScore(s) {
  if (typeof s !== "number") throw new UnitError("EngineScoreType", `engineScore must be number, got ${typeof s}`);
  if (!Number.isFinite(s)) throw new UnitError("EngineScoreFinite", "engineScore must be finite");
  if (s < SCORE_UNIT_ENGINE.min || s > SCORE_UNIT_ENGINE.max) {
    throw new UnitError("EngineScoreRange",
      `engineScore ${s} outside [${SCORE_UNIT_ENGINE.min}, ${SCORE_UNIT_ENGINE.max}]`);
  }
  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// MAPEO Engine [0,10000] → Oracle [975,1025]
// ════════════════════════════════════════════════════════════════════════════

/**
 * Mapeo lineal determinista de la escala Engine a la escala Oracle.
 *
 *   oracleScore = SCORE_MIN + round(engineScore * (SCORE_MAX - SCORE_MIN) / SCORE_ENGINE_MAX)
 *               = 975 + round(engineScore * 50 / 10000)
 *               = 975 + round(engineScore / 200)
 *
 * Si engineScore viene fuera de [0, 10000] se hace clamp (no se lanza),
 * porque scoreEngine.mjs ya garantiza el rango y un valor fuera indica bug
 * silencioso aguas arriba — preferible degradar a boundary que abortar.
 *
 * El resultado SIEMPRE está en [975, 1025] (asertado antes de retornar).
 *
 * @param {number} engineScore
 * @returns {number} oracleScore en [975, 1025]
 */
export function mapEngineToOracleScore(engineScore) {
  if (typeof engineScore !== "number" || !Number.isFinite(engineScore)) {
    return SCORE_UNIT_ORACLE.base;
  }
  // Clamp defensivo a Engine range
  const clamped = Math.max(
    SCORE_UNIT_ENGINE.min,
    Math.min(SCORE_UNIT_ENGINE.max, engineScore),
  );
  const range = SCORE_UNIT_ORACLE.max - SCORE_UNIT_ORACLE.min; // 50
  const oracleScore = SCORE_UNIT_ORACLE.min +
    Math.round(clamped * range / SCORE_UNIT_ENGINE.max);
  // Aserto post-mapping defensivo
  return assertOracleScore(oracleScore);
}

/**
 * Mapeo Engine → Oracle Influence con la MISMA función que score.
 * Decisión arquitectónica: influence no se deriva por reglas distintas
 * (eso era la fuente del bug 925/960/1050/1075 fuera de rango).
 */
export function mapEngineToOracleInfluence(engineScore) {
  return mapEngineToOracleScore(engineScore);
}
