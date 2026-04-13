import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./_rateLimit.mjs";

// Validación de variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_ID = process.env.APP_ID;
const ACTION_ID = process.env.WORLDCOIN_ACTION_ID ?? "verify-user";

if (!SUPABASE_URL || !SUPABASE_KEY || !APP_ID) {
  console.error("[VERIFY] Error: Faltan variables de entorno críticas.");
}

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_KEY ?? "");

export default async function handler(req, res) {
  // CORS para WebView de World App
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Rate Limiting
  if (rateLimit(req, { max: 10, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Demasiadas solicitudes." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { payload } = req.body || {};

  if (!payload?.nullifier_hash || !payload?.proof || !payload?.merkle_root) {
    return res.status(400).json({ success: false, error: "Prueba de verificación incompleta." });
  }

  // CORRECCIÓN: Aceptar 'device' o 'orb' (Orb es un superset de Device)
  const validLevels = ["device", "orb"];
  if (!validLevels.includes(payload.verification_level)) {
    return res.status(400).json({ 
      success: false, 
      error: "Nivel de verificación no soportado por esta aplicación." 
    });
  }

  const nullifierHash = payload.nullifier_hash;

  // 1. Anti-replay check
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("verified")
      .eq("id", nullifierHash)
      .maybeSingle();

    if (existing?.verified) {
      return res.status(200).json({ success: true, nullifier_hash: nullifierHash, reused: true });
    }
  } catch (err) {
    console.warn("[VERIFY] Error en anti-replay check:", err.message);
  }

  // 2. Verificación con Worldcoin Portal
  try {
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

    const verifyData = await verifyResponse.json();
    const isSuccess = verifyResponse.ok && verifyData.success;

    if (!isSuccess) {
      // Manejar si el usuario ya verificó esta acción específica antes
      if (verifyData.code === "already_verified") {
        return res.status(200).json({ success: true, nullifier_hash: nullifierHash, reused: true });
      }
      return res.status(verifyResponse.status).json({
        success: false,
        error: verifyData.detail || "Error en la validación de Worldcoin",
      });
    }

    // 3. Upsert del perfil verificado
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: nullifierHash,
        tier: "free",
        verified: true,
        verification_level: payload.verification_level,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (upsertError) throw upsertError;

    return res.status(200).json({ success: true, nullifier_hash: nullifierHash });

  } catch (err) {
    console.error("[VERIFY] Error crítico:", err.message);
    return res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
}
