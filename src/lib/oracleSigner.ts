import { ethers } from "ethers";

// ⚠️ ESTA KEY DEBE IR EN ENV
const PRIVATE_KEY = process.env.ORACLE_PK as string;

const wallet = new ethers.Wallet(PRIVATE_KEY);

export async function signTotemUpdate({
  totem,
  score,
  influence,
  nonce,
}: {
  totem: string;
  score: number;
  influence: number;
  nonce: number;
}) {
  const packed = ethers.solidityPacked(
    ["address", "uint256", "uint256", "uint256"],
    [totem, score, influence, nonce]
  );

  const hash = ethers.keccak256(packed);

  const signature = await wallet.signMessage(ethers.getBytes(hash));

  return signature;
}
