export default async function handler(req, res) {
  console.log("[BACKEND] Request recibido - Method:", req.method);
  console.log("[BACKEND] Body recibido:", JSON.stringify(req.body, null, 2));

  if (req.method !== "POST") {
    console.log("[BACKEND] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const userId = body.nullifier_hash;

  console.log("[BACKEND] userId extraído del body:", userId);

  if (!body.action) {
    console.log("[BACKEND] Falta action");
    return res.status(400).json({ success: false, error: "Missing action" });
  }

  if (!userId) {
    console.error("[BACKEND] nullifier_hash es undefined. Abortando.");
    return res.status(400).json({ success: false, error: "nullifier_hash missing" });
  }

  console.log("[BACKEND] Llamando a World API v2 verify...");
  const verifyResponse = await fetch(
    "https://developer.worldcoin.org/api/v2/verify/app_6a98c88249208506dcd4e04b529111fc",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merkle_root: body.merkle_root,
        nullifier_hash: userId,
        proof: body.proof,
        verification_level: body.verification_level,
        action: body.action,
      }),
    }
  );

  const verifyData = await verifyResponse.json();
  console.log("[BACKEND] Resultado verificación World:", verifyData);

  if (!verifyData.success) {
    console.log("[BACKEND] World rechazó la prueba");
    return res.status(400).json({ success: false, error: "World verification failed" });
  }

  console.log("[BACKEND] Acción recibida y validada:", body.action);

  try {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: userId }, { onConflict: ["id"] });

    if (upsertError) throw upsertError;
    console.log("[BACKEND] Usuario registrado/actualizado correctamente:", userId);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ verified: true })
      .eq("id", userId);

    if (updateError) throw updateError;
    console.log("[BACKEND] verified: true guardado correctamente para userId:", userId);

  } catch (err) {
    console.error("[BACKEND] Error Supabase al guardar userId:", err);
    return res.status(500).json({ success: false, error: err.message });
  }

  console.log("[BACKEND] Enviando respuesta al frontend con userId:", userId);
  return res.status(200).json({ success: true, userId });
}
