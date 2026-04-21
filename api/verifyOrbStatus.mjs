import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";
import { requireSession } from "./_session.mjs";

if (!process.env.SUPABASE_URL) {
  console.error("[VERIFY_ORB] ERROR: SUPABASE_URL not configured");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[VERIFY_ORB] ERROR: SUPABASE_SERVICE_ROLE_KEY not configured");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const APP_ID = process.env.APP_ID ?? "";
const ORB_ACTION_ID = process.env.WORLDCOIN_ORB_ACTION_ID ?? "user-orb";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (rateLimit(req, { max: 10, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Too many requests" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Identidad probada server-side via HMAC. Se IGNORA cualquier userId del
  // body: un proof Orb sólo puede vincularse al userId real de la sesión.
  const session = requireSession(req);
  if (!session.ok) {
    return res.status(session.status).json({ success: false, error: session.error, code: session.code });
  }
  const userId = session.user.userId;

  const body = req.body || {};
  const { proof } = body;

  if (
    !proof ||
    !proof.nullifier_hash ||
    !proof.proof ||
    !proof.merkle_root ||
    !proof.verification_level
  ) {
    return res.status(400).json({ success: false, error: "Missing proof fields" });
  }

  if (proof.verification_level !== "orb") {
    return res.status(400).json({ success: false, error: "Only orb-level verification accepted" });
  }

  if (!APP_ID) {
    console.error("[VERIFY_ORB] APP_ID not configured — cannot verify orb proofs");
    return res.status(503).json({ success: false, error: "Orb verification service not configured" });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, verification_level")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    return res.status(404).json({ success: false, error: "Profile not found" });
  }

  if (existing.verification_level === "orb") {
    return res.status(200).json({ success: true, message: "Already orb-verified" });
  }

  const { data: nullifierConflict } = await supabase
    .from("profiles")
    .select("id")
    .eq("nullifier_hash", proof.nullifier_hash)
    .neq("id", userId)
    .maybeSingle();

  if (nullifierConflict) {
    return res.status(403).json({
      success: false,
      error: "This orb proof is already linked to a different account",
    });
  }

  let worldcoinVerified = false;
  try {
    // CRÍTICO: enviamos `signal: userId` (el del TOKEN, no del body) para que
    // Worldcoin valide criptográficamente que el proof se generó originalmente
    // con ese signal. Bloquea cross-binding: un proof Orb generado con signal=A
    // no puede reusarse en una sesión cuyo token tiene uid=B — Worldcoin lo
    // rechazará porque el ZK-proof no encajará con otro signal.
    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: ORB_ACTION_ID,
          merkle_root: proof.merkle_root,
          proof: proof.proof,
          nullifier_hash: proof.nullifier_hash,
          verification_level: proof.verification_level,
          signal: userId,
        }),
      }
    );
    const verifyData = await verifyResponse.json();
    const errMsg = verifyData.detail ?? verifyData.error ?? "";
    worldcoinVerified =
      verifyResponse.ok ||
      errMsg.includes("already") ||
      verifyData.code === "already_verified";
    console.log("[VERIFY_ORB] Worldcoin API:", verifyResponse.status, JSON.stringify(verifyData));
  } catch (err) {
    console.error("[VERIFY_ORB] Worldcoin API unreachable:", err.message);
    return res.status(502).json({ success: false, error: "Worldcoin verification service unreachable. Please try again later." });
  }

  if (!worldcoinVerified) {
    return res.status(400).json({ success: false, error: "Worldcoin orb verification failed" });
  }

  try {
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({
        verification_level: "orb",
        nullifier_hash: proof.nullifier_hash,
        orb_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbErr) {
      // 23505 = unique_violation (PostgreSQL). Garantizado por
      // CONSTRAINT unique_nullifier en profiles(nullifier_hash). Anti-replay
      // atómico: dos cuentas distintas NUNCA pueden quedar con el mismo
      // nullifier, ni siquiera bajo race condition.
      if (dbErr.code === "23505" || /duplicate|unique/i.test(dbErr.message || "")) {
        return res.status(403).json({
          success: false,
          error: "Esta verificación Orb ya está vinculada a otra cuenta",
          code: "ORB_ALREADY_LINKED",
        });
      }
      console.error("[VERIFY_ORB] DB error:", dbErr.message);
      return res.status(500).json({ success: false, error: "Database error" });
    }
  } catch (err) {
    console.error("[VERIFY_ORB] Error:", err.message);
    return res.status(500).json({ success: false, error: "Database error" });
  }

  return res.status(200).json({
    success: true,
    message: "Orb verification saved",
    worldcoinVerified,
  });
}
