/* ─────────────────────────────────────────────────────────────────────────────
   api/nonce.mjs
   Genera nonce con crypto.randomUUID() y lo persiste en tabla nonces de
   Supabase con TTL de 5 minutos para prevenir replay attacks.
   ─────────────────────────────────────────────────────────────────────────── */

import crypto from "node:crypto";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (rateLimit(req, { max: 30, windowMs: 60000 }).limited) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Intenta en un minuto." });
  }

  try {
    const nonce = crypto.randomUUID().replace(/-/g, "");

    await supabase.from("nonces").insert({
      nonce,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      used: false,
    });

    return res.status(200).json({ nonce });
  } catch (err) {
    console.error("[NONCE] Error:", err);
    return res.status(500).json({ error: "Error generando nonce" });
  }
}
