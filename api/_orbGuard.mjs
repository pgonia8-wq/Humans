/**
 * _orbGuard.mjs — Server-side gate combinado: SESIÓN + ORB.
 *
 * Política: solo cuentas con `profiles.verification_level === "orb"` pueden
 * crear tótems o ejecutar trades. Los no verificados quedan en modo lectura.
 *
 * IMPORTANTE: este guard NO confía en `userId` del body. Lee la identidad
 * exclusivamente del session token HMAC firmado server-side (Authorization:
 * Bearer). Para forjarla habría que romper HMAC con SESSION_SECRET.
 *
 * Uso:
 *   import { requireOrbSession } from "../_orbGuard.mjs";
 *   const guard = await requireOrbSession(supabase, req);
 *   if (!guard.ok) return res.status(guard.status).json({ error: guard.error, code: guard.code });
 *   // guard.user.userId  ← probado por HMAC
 *   // guard.user.walletAddress ← probado por SIWE original
 */

import { requireSession } from "./_session.mjs";

export async function requireOrbSession(supabase, req) {
  const session = requireSession(req);
  if (!session.ok) return session;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, verification_level, wallet_address")
    .eq("id", session.user.userId)
    .maybeSingle();

  if (error) {
    console.error("[ORB_GUARD] DB error:", error.message);
    return { ok: false, status: 500, code: "DB_ERROR", error: "Error al verificar credenciales" };
  }
  if (!data) {
    return { ok: false, status: 404, code: "PROFILE_NOT_FOUND", error: "Perfil no encontrado" };
  }

  // Invalidación implícita de tokens "huérfanos": si la wallet vinculada al
  // perfil cambió (re-SIWE con otra wallet), el token viejo apunta a una
  // wallet distinta a la actual → 401. Sin blacklist, sin DB extra, atómico.
  // Forzar reconectar la wallet → emitir token nuevo en walletVerify.
  const profileWallet = (data.wallet_address || "").toLowerCase();
  if (!profileWallet || profileWallet !== session.user.walletAddress) {
    return {
      ok: false,
      status: 401,
      code: "WALLET_REBOUND",
      error: "La wallet de tu sesión cambió. Vuelve a conectar tu wallet.",
    };
  }

  if (data.verification_level !== "orb") {
    return {
      ok: false,
      status: 403,
      code: "ORB_REQUIRED",
      error: "Solo cuentas verificadas con Orb pueden realizar esta acción.",
    };
  }
  return { ok: true, user: session.user };
}

/**
 * @deprecated Uso legacy basado en userId del body. NO USAR en endpoints
 * sensibles nuevos. Conservado para compatibilidad temporal con código que
 * todavía no migra al patrón session-based.
 */
export async function requireOrbVerified(supabase, userId) {
  if (!userId || typeof userId !== "string") {
    return { ok: false, status: 400, code: "USER_REQUIRED", error: "userId requerido" };
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, verification_level")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, code: "DB_ERROR", error: "Error al verificar credenciales" };
  }
  if (!data) {
    return { ok: false, status: 404, code: "PROFILE_NOT_FOUND", error: "Perfil no encontrado" };
  }
  if (data.verification_level !== "orb") {
    return {
      ok: false,
      status: 403,
      code: "ORB_REQUIRED",
      error: "Solo cuentas verificadas con Orb pueden realizar esta acción.",
    };
  }
  return { ok: true };
}
