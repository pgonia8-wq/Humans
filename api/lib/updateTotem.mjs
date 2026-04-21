/**
 * updateTotem.mjs — Adapter EngineScore [0,10000] → OracleUpdate [975,1025]
 *
 * RESPONSABILIDAD ÚNICA:
 *   1. Recibe engineScore en escala [0, 10000] (producido por scoreEngine.mjs)
 *   2. Mapea a oracleScore en [975, 1025] vía units.mjs::mapEngineToOracleScore
 *   3. Calcula influence con el MISMO mapping (decisión arquitectónica:
 *      no derivar influence por reglas distintas — fuente del bug previo)
 *   4. VALIDA pre-firma que ambos estén en rango on-chain (evita firmar
 *      payloads que el Oracle rechazará con InvalidRange — pérdida de gas)
 *   5. Firma EIP-712 con dominio "HTPOracle" v1 (matchea TotemOracle.sol)
 *   6. Envía tx con UPDATE_FEE = 0.01 ETH y argumentos en el orden correcto
 *
 * NO HACE:
 *   - NO calcula reputación (eso es scoreEngine.mjs)
 *   - NO inventa rangos ni mappings adicionales (todo en units.mjs)
 *   - NO valida sólo en runtime: assert duro pre-firma
 *
 * Mapping referencia (mapEngineToOracleScore):
 *   engineScore=0     → oracleScore=975   (mín reputación)
 *   engineScore=2000  → oracleScore=985
 *   engineScore=5000  → oracleScore=1000  (neutral)
 *   engineScore=8000  → oracleScore=1015
 *   engineScore=10000 → oracleScore=1025  (máx reputación)
 *
 * El comentario antiguo "FIX CRIT-2" se mantiene válido: signature, caller y
 * deadline siguen siendo correctos respecto al ABI on-chain.
 */

import { signTotemUpdate } from "./oracleSigner.mjs";
import {
  mapEngineToOracleScore,
  mapEngineToOracleInfluence,
  assertOracleScore,
  assertOracleInfluence,
  assertEngineScore,
  UnitError,
} from "./units.mjs";
import { Oracle } from "./protocolConstants.mjs";

// Buffer para el deadline EIP-712: la tx debe minar antes de este margen.
const DEADLINE_BUFFER_SECONDS = 10 * 60;

/**
 * @param {object} p
 * @param {object} p.oracleContract  - ethers.Contract apuntando a TotemOracle
 * @param {string} p.totem           - dirección del Totem a actualizar
 * @param {number} p.score           - engineScore en [0, 10000] (de scoreEngine)
 * @returns {Promise<object>} - tx confirmada
 *
 * @throws UnitError si engineScore es inválido (bug aguas arriba)
 * @throws UnitError si post-mapping cae fuera de [975, 1025] (defensivo, no debería ocurrir)
 */
export async function updateTotemOnChain({ oracleContract, totem, score }) {

  // 1. Validar input semánticamente correcto (defensa contra bugs aguas arriba)
  //    Si scoreEngine produjo basura, fallar AQUÍ y no consumir gas/firma.
  assertEngineScore(score);

  // 2. Mapear Engine → Oracle. Mismo mapping para score e influence.
  const oracleScore     = mapEngineToOracleScore(score);
  const oracleInfluence = mapEngineToOracleInfluence(score);

  // 3. Validación dura pre-firma — Oracle.sol::update revierte InvalidRange
  //    si caen fuera. Lanzar aquí evita gastar gas y desync de nonces.
  assertOracleScore(oracleScore);
  assertOracleInfluence(oracleInfluence);

  // 4. Leer nonce actual del contrato (atomic w.r.t. la próxima tx)
  const nonce = await oracleContract.nonces(totem);

  // 5. Deadline EIP-712 (debe ser futuro al minar)
  const deadline = Math.floor(Date.now() / 1000) + DEADLINE_BUFFER_SECONDS;

  // 6. caller debe coincidir con msg.sender on-chain. La tx la envía el
  //    runner del contract → su address es el caller que firma el payload.
  const caller = await oracleContract.runner.getAddress();

  // 7. Firmar EIP-712 (dominio "HTPOracle" v1, type UpdateMetrics)
  const signature = await signTotemUpdate({
    totem,
    caller,
    score:     oracleScore,
    influence: oracleInfluence,
    nonce:     Number(nonce),
    deadline,
  });

  // 8. Enviar tx con argumentos en el orden EXACTO del ABI on-chain.
  //    UPDATE_FEE = 0.01 ETH (constante del contrato).
  const tx = await oracleContract.update(
    totem,
    caller,
    oracleScore,
    oracleInfluence,
    nonce,
    deadline,
    signature,
    { value: Oracle.UPDATE_FEE_WEI },
  );

  await tx.wait();
  return tx;
}

// Re-export del mapping para que tests/UI puedan mostrar ambas escalas
// sin importar units.mjs duplicado.
export { mapEngineToOracleScore, mapEngineToOracleInfluence };
