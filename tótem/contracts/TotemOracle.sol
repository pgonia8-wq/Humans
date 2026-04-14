// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TotemOracle {

    address public signer;

    struct Data {
        uint256 score;
        uint256 influence;
        uint256 timestamp;
        uint256 nonce;
    }

    mapping(address => Data) public data;
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public lastUpdate;

    uint256 public constant MIN_INTERVAL = 30;

    constructor(address _signer) {
        signer = _signer;
    }

    function update(
        address totem,
        uint256 score,
        uint256 influence,
        uint256 nonce,
        bytes calldata sig
    ) external {

        require(score <= 10000, "Bad score");
        require(influence >= 80 && influence <= 120, "Bad influence");

        require(nonce == nonces[totem], "Bad nonce");

        require(
            block.timestamp >= lastUpdate[totem] + MIN_INTERVAL,
            "Too fast"
        );

        bytes32 hash = keccak256(
            abi.encodePacked(totem, score, influence, nonce)
        );

        require(recover(hash, sig) == signer, "Bad sig");

        data[totem] = Data(score, influence, block.timestamp, nonce);

        nonces[totem]++;

        lastUpdate[totem] = block.timestamp;
    }

    function recover(bytes32 hash, bytes memory sig) internal pure returns (address) {
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        (bytes32 r, bytes32 s, uint8 v) = split(sig);

        return ecrecover(ethHash, v, r, s);
    }

    function split(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Bad sig");

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }

    function getInfluence(address user) external view returns (uint256) {
        return data[user].influence;
    }
}
