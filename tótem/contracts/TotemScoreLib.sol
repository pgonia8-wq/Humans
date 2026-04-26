// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TotemScoreLib
 * @notice Librería de conversión entre el rango del oracle [975, 1025]
 *         y el rango de reputación [0, 10_000].
 *
 * [C-04 FIX] El oracle usa scores centrados en 1000 como multiplicadores
 * de precio en la bonding curve. Los contratos de reputación (HumanTotem,
 * badges en Totem.sol) usan el rango 0-10_000.
 * Esta librería convierte entre ambos sin modificar ninguno de los dos.
 *
 * Mapeo lineal:
 *   975  → 0      (reputación mínima)
 *   1000 → 5_000  (reputación neutral)
 *   1025 → 10_000 (reputación máxima)
 */
library TotemScoreLib {

    uint256 internal constant ORACLE_MIN  =   975;
    uint256 internal constant ORACLE_MAX  =  1025;
    uint256 internal constant ORACLE_SPAN =    50; // ORACLE_MAX - ORACLE_MIN

    uint256 internal constant REP_MAX  = 10_000;

    // Thresholds de penalización en rango de reputación [0, 10_000]
    uint256 internal constant THRESHOLD_CRITICAL = 2_000; // fee 20%
    uint256 internal constant THRESHOLD_LOW      = 4_000; // fee 10%

    /// @notice Convierte score del oracle [975, 1025] → reputación [0, 10_000].
    function oracleToRep(uint256 oracleScore) internal pure returns (uint256) {
        if (oracleScore <= ORACLE_MIN) return 0;
        if (oracleScore >= ORACLE_MAX) return REP_MAX;
        return (oracleScore - ORACLE_MIN) * REP_MAX / ORACLE_SPAN;
    }

    /// @notice Convierte reputación [0, 10_000] → score oracle [975, 1025].
    function repToOracle(uint256 repScore) internal pure returns (uint256) {
        if (repScore == 0)         return ORACLE_MIN;
        if (repScore >= REP_MAX)   return ORACLE_MAX;
        return ORACLE_MIN + (repScore * ORACLE_SPAN) / REP_MAX;
    }

    /**
     * @notice Calcula el fee de penalización para un score de oracle.
     * @param oracleScore Score en rango [975, 1025] tal como lo devuelve el oracle.
     * @return feeBps 0 (sin fee) | 1000 (10%) | 2000 (20%)
     */
    function calcPenaltyFee(uint256 oracleScore) internal pure returns (uint256 feeBps) {
        uint256 rep = oracleToRep(oracleScore);
        if (rep < THRESHOLD_CRITICAL) return 2000;
        if (rep < THRESHOLD_LOW)      return 1000;
        return 0;
    }
}
