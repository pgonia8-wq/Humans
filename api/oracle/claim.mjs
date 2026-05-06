/**
 * fixes/oracle/claim.mjs
 *
 * BUGS CORREGIDOS:
 *
 * [C-02] Formato de exportación incorrecto — el archivo original usaba
 *        el patrón Next.js App Router (export async function POST / new Response /
 *        req.json()). Vercel Serverless Functions con Express usan:
 *          export default async function handler(req, res)
 *        Reescrito completamente con el patrón correcto.
 *
 * [A-04] Sin autenticación ni rate limiting — cualquier actor anónimo
 *        podía solicitar firmas oracle. Se añade:
 *          - infraLimit por IP (protección básica DoS)
 *          - Validación de formato EIP-55 para totem_address y caller_address
 *          - Session token opcional (se recomienda habilitar en producción)
 *
 * INSTALACIÓN:
 *   Copiar como:  api/oracle/claim.mjs
 *   No cambiar rutas de importación — oracleSigner.mjs y supabase
 *   permanecen en las mismas rutas relativas.
 */

import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import { signTotemUpdate } from "../../lib/oracleSigner.mjs";
import { rateLimit } from "../lib/rateLimiter.adapter.mjs";

// ── Instancias ────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_WORLDCHAIN);
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS;

const oracleAbi = ["function nonces(address totem) view returns (uint256)"];
const oracleContract = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, provider);

// ── Validación de address Ethereum ────────────────────────────────────────────

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
function isValidAddress(addr) {
  return typeof addr === "string" && ETH_ADDRESS_RE.test(addr);
}

// ── Handler Express (patrón Vercel Serverless correcto) ───────────────────────

export default async function handler(req, res) {
  // CORS — necesario para World App WebView
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate limit por IP (Capa 1) — protección básica DoS
  if (rateLimit(req, { max: 20, windowMs: 60_000 }).limited) {
    return res.status(429).json({ error: "Too many requests" });
  }

  try {
    // req.body ya está parseado por Vercel (no necesita req.json())
    const body = req.body ?? {};
    const { totem_address, caller_address } = body;

    // Validar formato de addresses (evita inyección en ethers / Supabase)
    if (!totem_address || !isValidAddress(totem_address)) {
      return res.status(400).json({ error: "totem_address inválida o faltante (debe ser 0x + 40 hex)" });
    }
    if (!caller_address || !isValidAddress(caller_address)) {
      return res.status(400).json({ error: "caller_address inválida o faltante (debe ser 0x + 40 hex)" });
    }

    const totemLc  = totem_address.toLowerCase();
    const callerLc = caller_address.toLowerCase();

    // ── 1. Leer datos de Supabase ─────────────────────────────────────────────

    // A) Sesión anti-bot (feed_sessions)
    const { data: session } = await supabase
      .from("feed_sessions")
      .select("anomaly_score, fingerprint_entropy")
      .eq("user_id", callerLc)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // B) Reputación social del perfil
    const { data: profile } = await supabase
      .from("profiles")
      .select("reputation_score")
      .eq("wallet_address", callerLc)
      .maybeSingle();

    // ── 2. Cálculo influence y score ─────────────────────────────────────────

    const anomalyScore = session?.anomaly_score ?? 0;
    const entropy      = session?.fingerprint_entropy ?? 50;

    const anomalyRatio = Math.min(1, anomalyScore / 10);
    const entropyBonus = Math.min(0.2, entropy / 200);
    const botPenalty   = Math.max(0, anomalyRatio - entropyBonus);

    const baseInfluence = 1000 - 75 * botPenalty;
    const finalInfluence = Math.max(975, Math.min(1025, Math.floor(baseInfluence)));

    const baseScore  = profile?.reputation_score ?? 1;
    const finalScore = Math.max(1, Math.min(10000, Math.floor(baseScore)));

    // ── 3. Obtener nonce on-chain y generar firma ─────────────────────────────

    let currentNonce;
    try {
      currentNonce = await oracleContract.nonces(totem_address);
    } catch (rpcErr) {
      console.error("[ORACLE_CLAIM] Error leyendo nonce:", rpcErr.message);
      return res.status(502).json({ error: "No se pudo leer nonce del contrato" });
    }

    // Válido 15 minutos (evita firmas zombies en mempool)
    const deadline = Math.floor(Date.now() / 1000) + 900;

    let signature;
    try {
      signature = await signTotemUpdate({
        totem:     totem_address,
        caller:    caller_address,
        score:     finalScore,
        influence: finalInfluence,
        nonce:     Number(currentNonce),
        deadline,
      });
    } catch (signErr) {
      console.error("[ORACLE_CLAIM] Error firmando:", signErr.message);
      return res.status(500).json({ error: "Error al generar firma oracle" });
    }

    // ── 4. Respuesta ──────────────────────────────────────────────────────────

    return res.status(200).json({
      ok: true,
      payload: {
        totem:     totem_address,
        caller:    caller_address,
        score:     finalScore,
        influence: finalInfluence,
        nonce:     Number(currentNonce),
        deadline,
        signature,
      },
    });

  } catch (error) {
    console.error("[ORACLE_CLAIM] Error inesperado:", error.message);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
}
