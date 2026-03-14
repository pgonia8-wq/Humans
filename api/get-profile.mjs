import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("[BACKEND] Llamada a get-profile.mjs");

  if (req.method !== "GET") {
    console.log("[BACKEND] Método no permitido:", req.method);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const userId = req.query?.userId;
  console.log("[BACKEND] userId recibido:", userId);

  if (!userId) {
    console.log("[BACKEND] No se recibió userId");
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  try {
    // Obtener perfil desde Supabase
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[BACKEND] Error al consultar profile:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (!profile) {
      console.log("[BACKEND] Perfil no encontrado para userId:", userId);
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    console.log("[BACKEND] Perfil encontrado:", profile);

    return res.status(200).json({ success: true, profile });
  } catch (err) {
    console.error("[BACKEND] Error completo get-profile.mjs:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
