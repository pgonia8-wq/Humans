export async function verifyWorldIDProof(
  proofData: any,
  walletAddress: string
) {
  const response = await fetch(
    "https://vtjqfzpfehfofamhowjz.supabase.co/functions/v1/bright-handler",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: proofData.proof,
        nullifier_hash: proofData.nullifier_hash,
        merkle_root: proofData.merkle_root,
        walletAddress,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("World verification error:", result);
    throw new Error("World ID verification failed");
  }

  return result;
    }
