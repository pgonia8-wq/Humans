import { ethers } from "ethers";
import { signTotemUpdate } from "../lib/oracleSigner";

// ABI mínimo del contrato
const ORACLE_ABI = [
  "function update(address totem,uint256 score,uint256 influence,uint256 nonce,bytes sig)",
  "function nonces(address) view returns (uint256)"
];

const RPC_URL = process.env.RPC_URL!;
const PRIVATE_KEY = process.env.ORACLE_PK!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const oracle = new ethers.Contract(
  ORACLE_ADDRESS,
  ORACLE_ABI,
  wallet
);

export default async function handler(req: any, res: any) {
  try {

    const { totem, score } = req.body;

    // 🧠 1. calcula influence
    const influence = mapScoreToInfluence(score);

    // 🧠 2. obtiene nonce del contrato
    const nonce = await oracle.nonces(totem);

    // 🔐 3. firma
    const signature = await signTotemUpdate({
      totem,
      score,
      influence,
      nonce: Number(nonce),
    });

    // 💥 4. envía tx al contrato
    const tx = await oracle.update(
      totem,
      score,
      influence,
      nonce,
      signature
    );

    await tx.wait();

    res.json({
      success: true,
      tx: tx.hash
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "FAILED" });
  }
}

// 🔥 lógica de influencia
function mapScoreToInfluence(score: number) {
  if (score > 8000) return 120;
  if (score > 6000) return 110;
  if (score > 4000) return 100;
  if (score > 2000) return 90;
  return 80;
}
