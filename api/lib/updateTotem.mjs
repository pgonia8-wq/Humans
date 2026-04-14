import { signTotemUpdate } from "./oracleSigner.mjs";

export async function updateTotemOnChain({
  oracleContract,
  totem,
  score,
}) {

  // 🧠 1. calcular influence
  const influence = mapScoreToInfluence(score);

  // 🔢 2. obtener nonce desde contrato
  const nonce = await oracleContract.nonces(totem);

  // 🔐 3. firmar
  const signature = await signTotemUpdate({
    totem,
    score,
    influence,
    nonce: Number(nonce),
  });

  // 💥 4. enviar tx
  const tx = await oracleContract.update(
    totem,
    score,
    influence,
    nonce,
    signature
  );

  await tx.wait();

  return tx;
}

// 🔥 lógica de influencia
function mapScoreToInfluence(score) {
  if (score > 8000) return 120;
  if (score > 6000) return 110;
  if (score > 4000) return 100;
  if (score > 2000) return 90;
  return 80;
}
