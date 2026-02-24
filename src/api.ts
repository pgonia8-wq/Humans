export async function verifyWorldIDProof(proofData: any) {
  const response = await fetch(
    "https://vtjqfzpfehfofamhowjz.supabase.co/functions/v1/bright-handler",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(proofData),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error("Error verificando:", result);
    throw new Error("World ID verification failed");
  }

  return result;
}
