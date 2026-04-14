import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.ORACLE_PK!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const ORACLE_ABI = [
  "function update(address,uint256,uint256,uint256,bytes)",
  "function nonces(address) view returns (uint256)",
];

export const oracleContract = new ethers.Contract(
  ORACLE_ADDRESS,
  ORACLE_ABI,
  wallet
);
