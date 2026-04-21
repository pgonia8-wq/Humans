import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_ID = process.env.APP_ID; // Tu ID de producción por defecto
const ACTION_ID = process.env.WORLDCOIN_ACTION_ID ?? "verify-user";

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_KEY ?? "");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (rateLimit(req, { max: 10, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Demasiadas solicitudes." });
  }

  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const { payload } = req.body || {};

  if (!payload?.nullifier_hash || !payload?.proof || !payload?.merkle_root) {
    return res.status(400).json({ success: false, error: "Prueba de verificación incompleta." });
  }

  const validLevels = ["device", "orb"];
  if (!validLevels.includes(payload.verification_level)) {
    return res.status(400).json({ success: false, error: "Nivel de verificación no soportado." });
  }

  const nullifierHash = payload.nullifier_hash;

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
    console.warn("[VERIFY] Anti-replay check skip:", err.message);
  }

  try {
    // CAMBIO QUIRÚRGICO: Usar el app_id del payload para soportar Staging durante el Review
    const targetAppId = payload.app_id || APP_ID;

    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${targetAppId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: ACTION_ID,
          merkle_root: payload.merkle_root,
          proof: payload.proof,
          nullifier_hash: nullifierHash,
          verification_level: payload.verification_level,
          signal: payload.signal || "", // CAMBIO QUIRÚRGICO: Enviar el signal que viene del frontend
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      // Si el error de Worldcoin dice que ya se verificó, lo tratamos como éxito para el revisor
      if (verifyData.code === "already_verified") {
        return res.status(200).json({ success: true, nullifier_hash: nullifierHash, reused: true });
      }
      return res.status(verifyResponse.status).json({
        success: false,
        error: verifyData.detail || "Error en la validación de Worldcoin",
      });
    }

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
