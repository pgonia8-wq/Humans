/* ─────────────────────────────────────────────────────────────────────────────
   api/walletVerify.mjs
   Verifica firma SIWE de World App Safe wallets usando verifySiweMessage()
   de @worldcoin/minikit-js. Recibe payload completo + nonce del frontend.
   ─────────────────────────────────────────────────────────────────────────── */

import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";
import { verifySiweMessage } from "@worldcoin/minikit-js";
import { issueSessionToken } from "./_session.mjs";

if (!process.env.SUPABASE_URL) {
  console.error("[WALLET_VERIFY] ERROR: SUPABASE_URL no configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[WALLET_VERIFY] ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (rateLimit(req, { max: 15, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Demasiadas solicitudes. Intenta en un minuto." });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { payload, nonce, userId } = body;

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ success: false, error: "payload es requerido (MiniAppWalletAuthSuccessPayload)" });
  }
  if (!nonce || typeof nonce !== "string") {
    return res.status(400).json({ success: false, error: "nonce es requerido" });
  }
  if (!payload.message || !payload.signature || !payload.address) {
    return res.status(400).json({ success: false, error: "payload incompleto: message, signature y address son requeridos" });
  }

  const { data: nonceClaimed, error: nonceClaimErr } = await supabase
    .from("nonces")
    .update({ used: true })
    .eq("nonce", nonce)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .select("nonce")
    .maybeSingle();

  if (nonceClaimErr || !nonceClaimed) {
    return res.status(401).json({ success: false, error: "Nonce inválido, expirado o ya usado" });
  }

  try {
    const validMessage = await verifySiweMessage(payload, nonce);

    if (!validMessage.isValid) {
      return res.status(401).json({ success: false, error: "Firma SIWE inválida" });
    }
  } catch (err) {
    console.error("[WALLET_VERIFY] verifySiweMessage error:", err.message);
    return res.status(401).json({ success: false, error: "Error verificando firma SIWE: " + err.message });
  }

  const verifiedAddress = payload.address;

  if (userId) {
    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          wallet_address: verifiedAddress,
          wallet_verified: true,
          wallet_verified_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateErr) {
        console.error("[WALLET_VERIFY] Error:", updateErr.message);
        return res.status(200).json({
          success: true,
          address: verifiedAddress,
          warning: "Firma válida pero no se pudo actualizar el perfil: " + updateErr.message,
        });
      }
    } catch (dbErr) {
      console.error("[WALLET_VERIFY] Error:", dbErr.message);
    }
  }

  // ── Emisión de session token HMAC (única vía de auth para endpoints sensibles)
  // Se firma SOLO tras verificar criptográficamente la firma SIWE de la wallet.
  // El cliente debe enviarlo en `Authorization: Bearer <token>` para crear
  // tótems o ejecutar trades. Sin token válido, esos endpoints rechazan 401.
  let sessionToken = null;
  if (userId && process.env.SESSION_SECRET) {
    try {
      sessionToken = issueSessionToken({ userId, walletAddress: verifiedAddress });
    } catch (err) {
      console.error("[WALLET_VERIFY] Issue token failed:", err.message);
    }
  }

  return res.status(200).json({
    success: true,
    address: verifiedAddress,
    sessionToken,
  });
}
