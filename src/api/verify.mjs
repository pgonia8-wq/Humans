export default async function handler(req, res) {
  console.log("[BACKEND] Request recibido - Method:", req.method);
  console.log("[BACKEND] Body recibido:", JSON.stringify(req.body, null, 2));

  if (req.method !== "POST") {
    console.log("[BACKEND] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { action, max_age } = body;
  const userId = body.nullifier_hash;

  if (!action) {
    console.log("[BACKEND] Falta action");
    return res.status(400).json({
      success: false,
      error: "Missing action",
    });
  }

  // Verificación real del proof usando la API v2 de World
  // https://developer.worldcoin.org/api/v2/verify/{app_id}

  const verifyResponse = await fetch(
    "https://developer.worldcoin.org/api/v2/verify/app_6a98c88249208506dcd4e04b529111fc",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merkle_root: body.merkle_root,
        nullifier_hash: body.nullifier_hash,
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
    return res.status(400).json({
      success: false,
      error: "World verification failed",
    });
  }

  console.log("[BACKEND] Acción recibida y validada:", action);
  console.log("[BACKEND] Verificación exitosa con World API");

  // ── Guardar verified: true en Supabase ──
  if (userId) {
    // 1️⃣ Crear o actualizar el perfil si no existía
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({ id: userId }, { onConflict: ["id"] });

    if (upsertError) {
      console.error("[BACKEND] Error al registrar usuario:", upsertError.message);
    } else {
      console.log("[BACKEND] Usuario registrado/actualizado correctamente:", userId);

      // 2️⃣ Guardar verified: true SOLO si el perfil se creó o existía
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
    console.warn("[BACKEND] No se recibió userId en el body → no se pudo guardar verified");
  }

  return res.status(200).json({ success: true });
        }
