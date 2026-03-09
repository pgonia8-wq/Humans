import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "No userId provided" });
    }

    // Verificar si ya existe
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      return res.status(200).json({ success: true, profile: existing });
    }

    // Crear nuevo
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        tier: "free",
        username: "Anon",
        avatar_url: ""
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return res.status(200).json({ success: true, profile: inserted });

  } catch (err) {
    console.error("[CREATE PROFILE] Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
  }
