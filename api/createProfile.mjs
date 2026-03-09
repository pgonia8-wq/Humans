
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: "No userId provided" });
    }

    // Insert profile si no existe
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        tier: "free",
        username: "Anon",
        avatar_url: ""
      })
      .select()
      .maybeSingle(); // devuelve null si ya existe

    if (error) throw error;

    res.status(200).json({ success: true, profile: data });
  } catch (err) {
    console.error("[CREATE PROFILE] error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
                          }
