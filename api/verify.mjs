import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_ID = process.env.APP_ID;
const ACTION_ID = process.env.WORLDCOIN_ACTION_ID ?? "verify-user";

const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_KEY ?? "");

// ─── Códigos de World ID que significan "este nullifier ya se usó" ───────────
// "already_verified"       → cuenta ya verificada en el Developer Portal
// "max_verifications_reached" → se alcanzó el límite del action (1 por usuario)
// Ambos deben tratarse como éxito para no bloquear al usuario legítimo.
const ALREADY_VERIFIED_CODES = new Set([
  "already_verified",
  "max_verifications_reached",
]);

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

  // ── Anti-replay: si el perfil ya tiene verified=true devolvemos 200 directo ──
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
          signal: payload.signal || "",
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      // ── FIX BUG 1: capturar TODOS los códigos "ya verificado" ─────────────
      // World ID puede devolver "max_verifications_reached" (además de
      // "already_verified") cuando el nullifier ya fue usado para este action.
      // En ambos casos el usuario ES legítimo → devolver 200 + upsert en DB
      // para que el perfil quede marcado verified=true aunque la primera
      // escritura haya fallado anteriormente.
      if (ALREADY_VERIFIED_CODES.has(verifyData.code)) {
        // Garantizar que el perfil existe y está marcado como verificado,
        // aunque el upsert previo hubiera fallado por cualquier razón.
        try {
          await supabase
            .from("profiles")
            .upsert({
              id: nullifierHash,
              tier: "free",
              verified: true,
              verification_level: payload.verification_level,
              updated_at: new Date().toISOString(),
            }, { onConflict: "id" });
        } catch (upsertErr) {
          console.warn("[VERIFY] Upsert fallback en already-verified:", upsertErr.message);
        }
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
