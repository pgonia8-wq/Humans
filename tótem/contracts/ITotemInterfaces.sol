// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITotemInterfaces
 * @notice Fuente canónica de todas las interfaces del ecosistema Totem.
 *         [C-03 FIX] Todos los contratos deben importar desde aquí.
 *         Ningún contrato redefine interfaces localmente.
 */

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRY UNIFICADO
// Reemplaza IRegistry (isTotem) e ITotemRegistry (status) en todos los contratos.
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemCore {
    function isTotem(address user) external view returns (bool);
    function status(address user)
        external
        view
        returns (bool fraudLocked, uint256 level, uint256 badge);
}

// ─────────────────────────────────────────────────────────────────────────────
// ORACLE
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemOracle {
    function getScore(address user) external view returns (uint256);
    function getMetrics(address user)
        external
        view
        returns (uint256 score, uint256 influence, uint256 timestamp);
}

// ─────────────────────────────────────────────────────────────────────────────
// BONDING CURVE — incluye getSupply/getPrice añadidos por [C-07 FIX]
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemBondingCurve {
    function getPrice(address totem) external view returns (uint256);
    function getSupply(address totem) external view returns (uint256);
    function freeze(address totem) external;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEE ROUTER — incluye executeBuyback añadido por [C-05 FIX]
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemFeeRouter {
    function harvest() external;
    function executeBuyback(uint256 amount) external;
}

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemMetrics {
    function markets(address totem)
        external
        view
        returns (
            uint256 rawVolume,
            uint256 verifiedVolume,
            uint256 createdAt,
            uint256 lastTradeAt
        );

    function getVolume(address totem) external view returns (uint256);
    function recordBuy(address totem, uint256 amount) external;
    function recordSell(address totem, uint256 amount) external;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTESTATION
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemAttestation {
    function isHuman(address user) external view returns (bool);
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────────

interface ITotemRateLimiter {
    function check(address user, bytes32 action) external;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORLD ID
// ─────────────────────────────────────────────────────────────────────────────

interface IWorldIDVerifier {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
