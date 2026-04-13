import { requireOrb } from "../token/api/_orbGuard.mjs";
/* ─────────────────────────────────────────────────────────────────────────────
   DESTINO: api/createProfile.mjs
   BUGS CORREGIDOS:

   [C1] Sin CORS headers — cualquier llamada desde el browser o World App
        WebView falla antes de llegar al handler (el browser aborta con
        "blocked by CORS policy"). Se añaden los headers estándar y el
        handler OPTIONS para preflight.

   [C2] createClient() sin null coalescing — si SUPABASE_URL o
        SUPABASE_SERVICE_ROLE_KEY no están definidas en Vercel, el SDK
        de Supabase lanza un error críptico ("supabaseUrl is required").
        Se añade ?? "" y log de error al inicio para detectarlo rápido.

   [C3] Llave de cierre de la función mal indentada.

   [C4] requireOrb() se llamaba ANTES de validar el formato de userId:
        un userId malformado alcanzaba Supabase sin sanitizar. Ahora la
        validación de formato ocurre primero.
   ─────────────────────────────────────────────────────────────────────────── */

import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./_rateLimit.mjs";

if (!process.env.SUPABASE_URL) {
  console.error("[CREATE_PROFILE] ERROR: SUPABASE_URL no configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[CREATE_PROFILE] ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada");
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

  if (rateLimit(req, { max: 10, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Demasiadas solicitudes. Intenta en un minuto." });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return res.status(400).json({ success: false, error: "No userId provided" });
    }

    if (!/^0x[a-fA-F0-9]{10,}$/.test(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId format" });
    }

    const orbOk = await requireOrb(userId, res);
    if (!orbOk) return;

    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, verified, tier, verification_level")
      .eq("id", userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      return res.status(200).json({ success: true, profile: existing });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        tier: "free",
        verified: false,
        username: "Anon",
        avatar_url: "",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(200).json({ success: true, profile: inserted });
  } catch (err) {
    console.error("[CREATE_PROFILE] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
