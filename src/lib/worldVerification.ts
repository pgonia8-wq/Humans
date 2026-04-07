const BRIGHT_HANDLER_URL =
  import.meta.env.VITE_BRIGHT_HANDLER_URL ??
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bright-handler`;

export async function verifyWorldIDProof(
  proofData: any,
  walletAddress: string
) {
  const response = await fetch(BRIGHT_HANDLER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "verify-user",
      proof: proofData.proof,
      nullifier_hash: proofData.nullifier_hash,
      merkle_root: proofData.merkle_root,
      verification_level: proofData.verification_level,
      walletAddress,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error("World ID verification failed");
  }

  return result;
}
