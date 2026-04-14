import { oracleContract } from "./contracts.mjs";
import { updateTotemOnChain } from "./updateTotem.mjs";

export async function updateUserTotem(userAddress, score) {
  try {

    const tx = await updateTotemOnChain({
      oracleContract,
      totem: userAddress,
      score,
    });

    console.log("✅ Totem actualizado:", tx.hash);

    return tx;

  } catch (err) {
    console.error("❌ Error actualizando totem:", err);
    throw err;
  }
}
