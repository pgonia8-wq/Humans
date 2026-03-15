// /api/verify.mjs
import { createClient } from "@supabase/supabase-js";
import { verifyCloudProof } from "@worldcoin/idkit-core";

const APP_ID = "app_6a98c88249208506dcd4e04b529111fc";

console.log("[VERIFY] Función serverless iniciada (ESM)");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("[VERIFY] Chequeo inicial de env vars:", {
  SUPABASE_URL_present: !!SUPABASE_URL,
  SUPABASE_URL_prefix: SUPABASE_URL ? SUPABASE_URL.substring(0, 20) + "..." : "MISSING",
  SUPABASE_KEY_present: !!SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_KEY_length: SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY.length : 0,
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[VERIFY] Faltan variables de entorno de Supabase");
  return new Response(
    JSON.stringify({ success: false, error: "Server configuration error - missing Supabase env vars" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async (request) => {
  console.log("[VERIFY] Request recibida:", {
    method: request.method,
    url: request.url,
    timestamp: new Date().toISOString(),
  });

  if (request.method !== "POST") {
    console.warn("[VERIFY] Método no permitido:", request.method);
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("[VERIFY] Leyendo body...");
    const body = await request.json();
    console.log("[VERIFY] Body recibido - keys:", Object.keys(body));

    const { payload } = body; // MiniKit envía { payload: { commandPayload, finalPayload } }

    if (!payload || !payload.finalPayload) {
      console.error("[VERIFY] Payload o finalPayload missing");
      return new Response(
        JSON.stringify({ success: false, error: "Missing payload or finalPayload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { finalPayload } = payload;

    console.log("[VERIFY] finalPayload recibido:", {
      status: finalPayload.status,
      nullifier_hash_prefix: finalPayload.nullifier_hash?.substring(0, 10) + "...",
      merkle_root_prefix: finalPayload.merkle_root?.substring(0, 10) + "...",
      verification_level: finalPayload.verification_level,
    });

    if (finalPayload.status !== "success") {
      console.warn("[VERIFY] Verificación no exitosa:", finalPayload.status);
      return new Response(
        JSON.stringify({ success: false, error: `Verification ${finalPayload.status}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[VERIFY] Verificando proof en backend con verifyCloudProof...");
    const verifyResult = await verifyCloudProof({
      app_id: APP_ID,
      nullifier_hash: finalPayload.nullifier_hash,
      merkle_root: finalPayload.merkle_root,
      proof: finalPayload.proof,
      verification_level: finalPayload.verification_level,
    });

    console.log("[VERIFY] Resultado de verifyCloudProof:", verifyResult);

    if (!verifyResult.success) {
      console.warn("[VERIFY] Proof inválido:", verifyResult);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid proof" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const nullifierHash = finalPayload.nullifier_hash;
    const userId = body.userId || nullifierHash; // fallback si no llega userId

    console.log("[VERIFY] Buscando perfil existente por nullifier_hash...");
    let { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("nullifier_hash", nullifierHash)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 = no rows found
      console.error("[VERIFY] Error al buscar perfil:", fetchError);
      throw fetchError;
    }

    if (!profile) {
      console.log("[VERIFY] No existe perfil - creando nuevo...");
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          nullifier_hash: nullifierHash,
          username: body.username || `user_${nullifierHash.slice(0, 8)}`,
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("[VERIFY] Error al crear perfil:", insertError);
        throw insertError;
      }

      profile = newProfile;
    } else {
      console.log("[VERIFY] Perfil existente encontrado - actualizando...");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) {
        console.error("[VERIFY] Error al actualizar perfil:", updateError);
        throw updateError;
      }
    }

    console.log("[VERIFY] Operación completada con éxito");
    return new Response(
      JSON.stringify({
        success: true,
        nullifier_hash: nullifierHash,
        profile,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[VERIFY] CRASH TOTAL:", {
      message: err.message,
      name: err.name,
      stack: err.stack,
      code: err.code,
      cause: err.cause,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
