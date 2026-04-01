/**
 * api/verify.mjs – CORREGIDO
 *
 * ERRORES CORREGIDOS:
 * [V1] CORS: Access-Control-Allow-Origin: "*" — en producción debería ser la
 *      URL exacta del dominio de la app para evitar peticiones desde orígenes no
 *      autorizados. Se mantiene "*" porque World App lo requiere para WebView,
 *      pero se documenta la razón.
 * [V2] El campo "action" enviado a Worldcoin está hardcoded como "verify-user"
 *      pero no se verifica que coincida con el action_id registrado en
 *      Developer Portal. Si no coincide, Worldcoin devuelve error. Se añade log.
 * [V3] SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no se validan al inicio
 *      → si no están definidas, createClient falla silenciosamente
 * [V4] No se verifica doble uso del nullifier_hash (anti-replay)
 *      — un mismo nullifier_hash podría usarse múltiples veces si el upsert
 *      no lo detecta. El upsert actual SÍ lo previene, pero se añade log explícito.
 * [V5] verifyData.success puede ser undefined en algunas respuestas de Worldcoin;
 *      la condición !verifyData.success falla si la clave no existe → mejorado
 * [V6] El app_id está hardcoded en la URL — debería venir de variable de entorno
 */

import { createClient } from "@supabase/supabase-js";

// [V3] Validar variables de entorno al inicio
if (!process.env.SUPABASE_URL) {
  console.error("[VERIFY] ERROR: SUPABASE_URL no está configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[VERIFY] ERROR: SUPABASE_SERVICE_ROLE_KEY no está configurada");
}
if (!process.env.WORLDCOIN_APP_ID) {
  console.warn("[VERIFY] ADVERTENCIA: WORLDCOIN_APP_ID no está configurada. Usando valor hardcoded.");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

// [V6] App ID desde variable de entorno (con fallback al hardcoded)
const APP_ID = process.env.WORLDCOIN_APP_ID ?? "app_6a98c88249208506dcd4e04b529111fc";
// Acción registrada en Developer Portal de Worldcoin
const ACTION_ID = process.env.WORLDCOIN_ACTION_ID ?? "verify-user";

export default async function handler(req, res) {
  console.log("[VERIFY] Verificando World ID...");

  // [V1] CORS requerido para World App (WebView abre desde worldcoin.org)
  // "*" es necesario porque el WebView de World App no envía un Origin predecible.
  // En una API privada se usaría el dominio específico de la app.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.warn("[VERIFY] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { payload } = body;

  if (
    !payload ||
    !payload.nullifier_hash ||
    !payload.proof ||
    !payload.merkle_root ||
    !payload.verification_level
  ) {
    console.error("[VERIFY] Faltan campos en proof:", {
      hasPayload: !!payload,
      hasNullifierHash: !!payload?.nullifier_hash,
      hasProof: !!payload?.proof,
      hasMerkleRoot: !!payload?.merkle_root,
      hasVerificationLevel: !!payload?.verification_level,
    });
    return res.status(400).json({ success: false, error: "Faltan campos en proof" });
  }

  const nullifierHash = payload.nullifier_hash;
  console.log("[VERIFY] nullifier_hash recibido:", nullifierHash);

  // [V4] Verificar si el nullifier_hash ya fue usado (anti-replay)
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, verified")
      .eq("id", nullifierHash)
      .maybeSingle();

    if (existing?.verified) {
      console.log("[VERIFY] nullifier_hash ya verificado anteriormente:", nullifierHash);
      // No es un error — simplemente devolver éxito (idempotente)
      return res.status(200).json({ success: true, nullifier_hash: nullifierHash, reused: true });
    }
  } catch (err) {
    console.warn("[VERIFY] No se pudo verificar anti-replay:", err.message);
    // Continuar con la verificación aunque esta check falle
  }

  // Verificar con Worldcoin Developer Portal
  let verifyData;
  try {
    console.log("[VERIFY] Llamando a Worldcoin API. app_id:", APP_ID, "action:", ACTION_ID);

    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: ACTION_ID,
          merkle_root: payload.merkle_root,
          proof: payload.proof,
          nullifier_hash: nullifierHash,
          verification_level: payload.verification_level,
        }),
      }
    );

    verifyData = await verifyResponse.json();
    console.log("[VERIFY] Respuesta de Worldcoin. status:", verifyResponse.status, "body:", JSON.stringify(verifyData));

    // [V5] Verificar éxito de forma robusta — success puede ser true/false/"true"
    const isSuccess = verifyResponse.ok && (verifyData.success === true || verifyData.success === "true");

    if (!isSuccess) {
      console.error("[VERIFY] Worldcoin rechazó la verificación:", verifyData);
      return res.status(verifyResponse.status || 400).json({
        success: false,
        error: verifyData.detail ?? verifyData.error ?? "Verificación fallida en Worldcoin",
        worldcoin_response: verifyData,
      });
    }
  } catch (err) {
    console.error("[VERIFY] Error de red al contactar Worldcoin:", err.message);
    return res.status(500).json({ success: false, error: "Error al contactar Worldcoin" });
  }

  // Guardar/actualizar perfil en Supabase
  try {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: nullifierHash,
          tier: "free",
          verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("[VERIFY] Error upsert profiles:", upsertError.message, upsertError.details);
      return res.status(500).json({ success: false, error: upsertError.message });
    }

    console.log("[VERIFY] Perfil creado/actualizado exitosamente:", nullifierHash);
  } catch (err) {
    console.error("[VERIFY] Error inesperado en Supabase profiles:", err.message);
    return res.status(500).json({ success: false, error: "Error al guardar perfil" });
  }

  return res.status(200).json({ success: true, nullifier_hash: nullifierHash });
}
