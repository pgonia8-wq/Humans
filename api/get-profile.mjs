/* ─────────────────────────────────────────────────────────────────────────────
   DESTINO: api/get-profile.mjs
   BUGS CORREGIDOS:

   [G1] Sin CORS headers — cualquier llamada desde el browser o World App
        WebView falla antes de llegar al handler (el browser aborta con
        "blocked by CORS policy"). Se añaden los headers estándar y el
        handler OPTIONS para preflight.

   [G2] createClient() sin null coalescing — si SUPABASE_URL o
        SUPABASE_SERVICE_ROLE_KEY no están definidas en Vercel, el SDK
        de Supabase lanza "supabaseUrl is required" en lugar de un mensaje
        claro. Se añade ?? "" y validación al inicio.
   ─────────────────────────────────────────────────────────────────────────── */

import { createClient } from "@supabase/supabase-js";

// [G2] Validar variables de entorno al inicio
if (!process.env.SUPABASE_URL) {
  console.error("[GET_PROFILE] ERROR: SUPABASE_URL no configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[GET_PROFILE] ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const userId = req.query?.userId;

  if (!userId) {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[GET_PROFILE] Error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!profile) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    return res.status(200).json({ success: true, profile });
  } catch (err) {
    console.error("[GET_PROFILE] Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
