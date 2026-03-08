import { supabase } from "../supabaseClient";

export default async function handler(req, res) {
  console.log("[BACKEND] Request recibido - Method:", req.method);
  console.log("[BACKEND] Body recibido:", JSON.stringify(req.body, null, 2));

  if (req.method !== "POST") {
    console.log("[BACKEND] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { action, max_age, proof, merkle_root, nullifier_hash, verification_level } = body;

  const userId = nullifier_hash;
  console.log("[BACKEND] userId extraído del body:", userId);

  if (!action) {
    console.log("[BACKEND] Falta action");
    return res.status(400).json({ success: false, error: "Missing action" });
  }

  console.log("[BACKEND] Llamando a World API v2 verify...");

  const verifyResponse = await fetch(
    "https://developer.worldcoin.org/api/v2/verify/app_6a98c88249208506dcd4e04b529111fc",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merkle_root, nullifier_hash, proof, verification_level, action }),
    }
  );

  const verifyData = await verifyResponse.json();
  console.log("[BACKEND] Resultado verificación World:", verifyData);

  if (!verifyData.success) {
    console.log("[BACKEND] World rechazó la prueba");
    return res.status(400).json({ success: false, error: "World verification failed" });
  }

  if (userId) {
    console.log("[BACKEND] Guardando usuario en Supabase:", userId);

    // Crear o actualizar perfil
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: userId }, { onConflict: ["id"] });

    if (upsertError) {
      console.error("[BACKEND] Error al registrar usuario:", upsertError.message);
    } else {
      console.log("[BACKEND] Usuario registrado/actualizado correctamente:", userId);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ verified: true })
        .eq("id", userId);

      if (updateError) {
        console.error("[BACKEND] Error al guardar verified:", updateError.message);
      } else {
        console.log("[BACKEND] verified: true guardado correctamente para userId:", userId);
      }
    }
  } else {
    console.warn("[BACKEND] No se recibió userId → no se pudo guardar verified");
  }

  console.log("[BACKEND] Enviando respuesta al frontend con userId:", userId);
  return res.status(200).json({ success: true, userId });
}
