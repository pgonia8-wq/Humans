/**
 * api/walletVerify.mjs – CORREGIDO
 *
 * ERRORES CORREGIDOS:
 * [W1] CRÍTICO: walletVerify.mjs importa `verifySignedNonce` desde `./nonce.mjs`,
 *      pero nonce.mjs SOLO tiene un export default (el handler) — NO exporta
 *      `verifySignedNonce`. Esto causa un error de importación silencioso donde
 *      `verifySignedNonce` es `undefined` y la llamada falla con
 *      "verifySignedNonce is not a function".
 *      SOLUCIÓN: implementar la verificación inline usando el SDK de MiniKit
 *      o directamente con ethers/viem.
 * [W2] No se validan los campos del body (message, signature, address)
 * [W3] SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no validadas al inicio
 * [W4] No se verifica que el nonce recibido fue generado recientemente
 *      (anti-replay de nonces expirados)
 * [W5] CORS: se mantiene "*" (requerido por World App WebView)
 */

import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

// [W3] Validar variables de entorno al inicio
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

// [W4] TTL de nonce: 5 minutos
const NONCE_TTL_MS = 5 * 60 * 1000;

/** [W1] Verificar firma ECDSA inline — reemplaza la función inexistente de nonce.mjs */
function verifySignedNonce(message, signature) {
  try {
    // Recuperar la dirección que firmó el mensaje
    const recovered = ethers.verifyMessage(message, signature);
    return { success: true, address: recovered };
  } catch (err) {
    console.error("[WALLET_VERIFY] Error al recuperar firma:", err.message);
    return { success: false, address: null, error: err.message };
  }
}

export default async function handler(req, res) {
  console.log("[WALLET_VERIFY] Verificando wallet signature...");

  // [W5] CORS requerido para World App WebView
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { message, signature, address, userId } = body;

  // [W2] Validar campos requeridos
  if (!message || typeof message !== "string") {
    return res.status(400).json({ success: false, error: "message es requerido" });
  }
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ success: false, error: "signature es requerida" });
  }
  if (!address || typeof address !== "string") {
    return res.status(400).json({ success: false, error: "address es requerida" });
  }

  console.log("[WALLET_VERIFY] address:", address, "userId:", userId ?? "(no proporcionado)");

  // [W4] Verificar que el nonce en el mensaje no esté expirado
  // Formato esperado del mensaje: "Nonce: <hex_32bytes>\nTimestamp: <ISO>"
  // Si el mensaje incluye timestamp, verificarlo
  const tsMatch = message.match(/Timestamp:\s*(\d{4}-\d{2}-\d{2}T[\d:.Z]+)/);
  if (tsMatch) {
    const msgTime = new Date(tsMatch[1]).getTime();
    if (Date.now() - msgTime > NONCE_TTL_MS) {
      console.warn("[WALLET_VERIFY] Nonce expirado. Mensaje tiene más de 5 minutos.");
      return res.status(400).json({ success: false, error: "Nonce expirado. Solicita uno nuevo." });
    }
  } else {
    console.warn("[WALLET_VERIFY] El mensaje no contiene Timestamp — no se puede verificar expiración.");
  }

  // [W1] Verificar la firma con la implementación correcta
  const verifyResult = verifySignedNonce(message, signature);
  if (!verifyResult.success) {
    console.error("[WALLET_VERIFY] Firma inválida:", verifyResult.error);
    return res.status(401).json({ success: false, error: "Firma inválida" });
  }

  const recoveredAddress = verifyResult.address;
  console.log("[WALLET_VERIFY] Dirección recuperada:", recoveredAddress, "esperada:", address);

  // Comparar de forma case-insensitive (Ethereum addresses son case-insensitive)
  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
    console.error("[WALLET_VERIFY] La firma no corresponde a la dirección declarada.");
    return res.status(401).json({
      success: false,
      error: "La firma no corresponde a la dirección proporcionada",
      expected: address,
      recovered: recoveredAddress,
    });
  }

  // Actualizar perfil en Supabase si se proporcionó userId
  if (userId) {
    try {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          wallet_address: address,
          wallet_verified: true,
          wallet_verified_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateErr) {
        console.error("[WALLET_VERIFY] Error actualizando perfil:", updateErr.message);
        // No bloqueamos la respuesta — la firma sí es válida
        return res.status(200).json({
          success: true,
          address: recoveredAddress,
          warning: "Firma válida pero no se pudo actualizar el perfil: " + updateErr.message,
        });
      }

      console.log("[WALLET_VERIFY] Perfil actualizado con wallet:", address, "userId:", userId);
    } catch (dbErr) {
      console.error("[WALLET_VERIFY] Error inesperado en Supabase:", dbErr.message);
    }
  }

  return res.status(200).json({
    success: true,
    address: recoveredAddress,
  });
}
