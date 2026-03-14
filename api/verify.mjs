import { createClient } from "@supabase/supabase-js";
import { verifyCloudProof } from "@worldcoin/idkit-core";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APP_ID = "app_6a98c88249208506dcd4e04b529111fc"; // Tu App ID real

export default async function handler(req, res) {
  console.log("[BACKEND] Llamada a verify.mjs");

  if (req.method !== "POST") {
    console.log("[BACKEND] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { payload } = body;

  if (!payload) {
    console.log("[BACKEND] No se recibió payload");
    return res.status(400).json({ success: false, error: "No payload received" });
  }

  try {
    console.log("[BACKEND] Payload recibido:", payload);

    // 1. Validar proof con Worldcoin
    const cloudProof = {
      merkle_root: payload.merkle_root,
      nullifier_hash: payload.nullifier_hash,
      proof: payload.proof,
      credential_type: payload.credential_type,
    };

    const verification = await verifyCloudProof(
      cloudProof,
      APP_ID,
      "verify-user"
    );

    console.log("[BACKEND] Resultado verifyCloudProof:", verification);

    if (!verification.success) {
      console.log("[BACKEND] Proof inválido:", verification);
      return res.status(400).json({
        success: false,
        error: "Invalid proof",
        details: verification.code || verification.detail,
      });
    }

    const nullifierHash = payload.nullifier_hash;

    // 2. Buscar perfil existente
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", nullifierHash)
      .maybeSingle();

    if (selectError) throw selectError;

    let profile = existing;

    if (!profile) {
      console.log("[BACKEND] No existe profile, creando...");

      const { data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: nullifierHash,
          tier: "free",
          username: `@anon-${nullifierHash.slice(0, 8)}`,
          avatar_url: "",
          created_at: new Date().toISOString(),
          profile_visible: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      profile = inserted;
      console.log("[BACKEND] Perfil creado:", profile);
    } else {
      console.log("[BACKEND] Perfil existente encontrado:", profile);
    }

    console.log("[BACKEND] Devolviendo perfil al frontend:", profile);

    return res.status(200).json({
      success: true,
      nullifier_hash: nullifierHash,
      profile,
    });
  } catch (err) {
    console.error("[BACKEND] Error completo verify.mjs:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Error interno al procesar verificación",
    });
  }
}
