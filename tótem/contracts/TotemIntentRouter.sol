// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TotemIntentRouter is Ownable2Step, ReentrancyGuard {
    using ECDSA for bytes32;

    // --- EIP-712 Setup ---
    bytes32 private immutable _DOMAIN_SEPARATOR;
    bytes32 private constant INTENT_TYPEHASH = keccak256(
        "Intent(address user,uint256 maxPrice,uint256 deadline,bytes32 action,uint256 nonce)"
    );

    mapping(address => uint256) public nonces;
    mapping(bytes32 => bool) public executedIntents;

    // --- Dependencies ---
    IOracle public oracleA;
    IOracle public oracleB;
    IOracle public oracleC;
    ICurve public curve;
    IAttestation public attestation;

    event IntentExecuted(address indexed user, bytes32 action, uint256 finalPrice, uint256 score);

    constructor(address _a, address _b, address _c, address _curve, address _attest) Ownable(msg.sender) {
        oracleA = IOracle(_a);
        oracleB = IOracle(_b);
        oracleC = IOracle(_c);
        curve = ICurve(_curve);
        attestation = IAttestation(_attest);

        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TotemIntentRouter")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    // --- Consenso y Ejecución ---

    function executeWithSignature(
        address user,
        uint256 maxPrice,
        uint256 deadline,
        bytes32 action,
        bytes calldata signature
    ) external payable nonReentrant {
        // 1. Verificar Firma EIP-712
        bytes32 structHash = keccak256(abi.encode(INTENT_TYPEHASH, user, maxPrice, deadline, action, nonces[user]++));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash));
        
        require(digest.recover(signature) == user, "Invalid Signature");
        require(block.timestamp <= deadline, "Intent Expired");
        require(attestation.isHuman(user), "Not Human");

        // 2. Consenso de Oráculos (Mediana)
        (uint256 score, uint256 influence) = getConsensusMetrics(user);

        // 3. Validación de Precio
        uint256 price = curve.getPrice(user);
        require(price <= maxPrice, "Price Slippage Too High");
        require(msg.value >= price, "Insufficient ETH Sent");

        // 4. Hook de Ejecución
        _execute(user, action, price, score, influence);

        emit IntentExecuted(user, action, price, score);
    }

    function _execute(
        address user,
        bytes32 action,
        uint256 price,
        uint256 score,
        uint256 influence
    ) internal {
        if (action == keccak256("BUY_BADGE")) {
            // Lógica de compra: enviar ETH al tesoro y actualizar score en Registry
            // treasury.deposit{value: price}(user);
        } 
        else if (action == keccak256("GRADUATE")) {
            require(score >= 400, "Ineligible for Graduation");
            // Lógica: Transformar el Totem actual en un Token de Gobernanza
        }
    }

    function getConsensusMetrics(address user) public view returns (uint256 score, uint256 influence) {
        (uint256 s1, uint256 i1,) = oracleA.getMetrics(user);
        (uint256 s2, uint256 i2,) = oracleB.getMetrics(user);
        (uint256 s3, uint256 i3,) = oracleC.getMetrics(user);
        score = _median(s1, s2, s3);
        influence = _median(i1, i2, i3);
    }

    function _median(uint256 a, uint256 b, uint256 c) internal pure returns (uint256) {
        if ((a >= b && a <= c) || (a <= b && a >= c)) return a;
        if ((b >= a && b <= c) || (b <= a && b >= c)) return b;
        return c;
    }
}
