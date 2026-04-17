/**
 * contracts.mjs
 *
 * FIX CRIT-2: Updated ABI to match the current TotemOracle.sol function signature.
 *
 * Old ABI:  update(address, uint256, uint256, uint256, bytes)
 * New ABI:  update(address totem, address caller, uint256 score, uint256 influence,
 *                  uint256 nonce, uint256 deadline, bytes signature)
 *
 * The missing `caller` and `deadline` arguments caused every on-chain call to revert.
 */

import { ethers } from "ethers";

const RPC_URL      = process.env.RPC_URL;
const PRIVATE_KEY  = process.env.ORACLE_PK;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !ORACLE_ADDRESS) {
  throw new Error("Missing env variables: RPC_URL, ORACLE_PK, ORACLE_ADDRESS");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

// Full ABI matching TotemOracle.sol (FIX CRIT-2)
const ORACLE_ABI = [
  // State-changing functions
  "function update(address totem, address caller, uint256 score, uint256 influence, uint256 nonce, uint256 deadline, bytes calldata signature) external payable",

  // View functions
  "function nonces(address totem) external view returns (uint256)",
  "function getScore(address user) external view returns (uint256)",
  "function getInfluence(address user) external view returns (uint256)",
  "function getMetrics(address user) external view returns (uint256 score, uint256 influence, uint256 timestamp)",

  // Constants
  "function UPDATE_FEE() external view returns (uint256)",
  "function DOMAIN_SEPARATOR() external view returns (bytes32)",
];

export const oracleContract = new ethers.Contract(
  ORACLE_ADDRESS,
  ORACLE_ABI,
  wallet
);
