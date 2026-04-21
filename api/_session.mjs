/**
 * _session.mjs — Sesiones HMAC firmadas server-side.
 *
 * Este sistema NO usa Supabase Auth ni JWT. La única prueba criptográfica de
 * identidad es la firma SIWE de la wallet World App (verificada en
 * /api/walletVerify). Tras esa verificación el backend emite un session token
 * firmado con HMAC-SHA256(SESSION_SECRET) que el cliente envía en el header
 * Authorization: Bearer <token> en cada request sensible.
 *
 * Endpoints sensibles IGNORAN cualquier userId/walletAddress del body. La
 * identidad sale exclusivamente del token verificado server-side. Forjar un
 * userId requeriría romper HMAC con SESSION_SECRET.
 *
 * Formato del token (compacto, 0 dependencias externas):
 *   base64url(payload).base64url(sig)
 *   payload = JSON { uid, wallet, iat, exp }
 *   sig     = HMAC-SHA256(SESSION_SECRET, payload_b64)
 */

import crypto from "node:crypto";

const SESSION_SECRET   = process.env.SESSION_SECRET || "";
const TOKEN_TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 días
const SKEW_MS          = 30 * 1000; // tolerancia de reloj

if (!SESSION_SECRET) {
  console.error("[SESSION] ERROR: SESSION_SECRET no configurada — los tokens no son seguros");
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s + pad, "base64");
}

function sign(payloadB64) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest();
}

function safeEq(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Emite un session token. Llamarlo SOLO tras verificación criptográfica
 * (p.ej. firma SIWE válida en walletVerify.mjs).
 */
export function issueSessionToken({ userId, walletAddress, ttlMs = TOKEN_TTL_MS }) {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET no configurada");
  }
  if (!userId || typeof userId !== "string") {
    throw new Error("userId requerido para emitir token");
  }
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    throw new Error("walletAddress inválida para emitir token");
  }
  const now = Date.now();
  const payload = {
    uid: userId,
    wallet: walletAddress.toLowerCase(),
    iat: now,
    exp: now + ttlMs,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sigB64    = b64url(sign(payloadB64));
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verifica un token. Devuelve { ok, user?, status?, code?, error? }.
 * Cero confianza en el cliente: la identidad se reconstruye desde el token
 * cuya firma sólo el servidor puede generar.
 */
export function verifySessionToken(token) {
  if (!SESSION_SECRET) {
    return { ok: false, status: 500, code: "SESSION_NOT_CONFIGURED", error: "Servicio de sesión no configurado" };
  }
  if (!token || typeof token !== "string") {
    return { ok: false, status: 401, code: "AUTH_REQUIRED", error: "Sesión requerida" };
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return { ok: false, status: 401, code: "AUTH_MALFORMED", error: "Token malformado" };
  }
  const [payloadB64, sigB64] = parts;

  let expected, given;
  try {
    expected = sign(payloadB64);
    given    = b64urlDecode(sigB64);
  } catch {
    return { ok: false, status: 401, code: "AUTH_MALFORMED", error: "Token malformado" };
  }

  if (!safeEq(expected, given)) {
    return { ok: false, status: 401, code: "AUTH_INVALID", error: "Firma de sesión inválida" };
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, status: 401, code: "AUTH_MALFORMED", error: "Payload inválido" };
  }

  const now = Date.now();
  if (typeof payload.exp !== "number" || now > payload.exp + SKEW_MS) {
    return { ok: false, status: 401, code: "AUTH_EXPIRED", error: "Sesión expirada. Vuelve a conectar tu wallet." };
  }
  if (typeof payload.iat !== "number" || payload.iat - SKEW_MS > now) {
    return { ok: false, status: 401, code: "AUTH_INVALID", error: "Sesión inválida (futuro)" };
  }
  if (!payload.uid || !payload.wallet) {
    return { ok: false, status: 401, code: "AUTH_INVALID", error: "Sesión incompleta" };
  }

  return { ok: true, user: { userId: payload.uid, walletAddress: payload.wallet } };
}

/**
 * Extrae el bearer token de un Express/Vercel req.
 */
export function extractBearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Helper de alto nivel: lee Authorization, verifica HMAC, devuelve user probado.
 * Cero queries DB para autenticación (sólo verificación de firma).
 */
export function requireSession(req) {
  return verifySessionToken(extractBearer(req));
}
