import { ethers } from "ethers";

const PRIVATE_KEY = process.env.ORACLE_PK;

if (!PRIVATE_KEY) {
  throw new Error("Missing ORACLE_PK");
}

const wallet = new ethers.Wallet(PRIVATE_KEY);

export async function signTotemUpdate({
  totem,
  score,
  influence,
  nonce,
}) {

  const packed = ethers.solidityPacked(
    ["address", "uint256", "uint256", "uint256"],
    [totem, score, influence, nonce]
  );

  const hash = ethers.keccak256(packed);

  const signature = await wallet.signMessage(
    ethers.getBytes(hash)
  );

  return signature;
}
