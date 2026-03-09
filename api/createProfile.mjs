// api/createProfile.mjs (versión corregida)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Verifica existencia (con .maybeSingle)
    const { data: existing, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      console.log("[CREATE PROFILE] Already exists:", existing);
      return res.status(200).json({ success: true, profile: existing });
    }

    // Insert sin select posterior
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        tier: "free",
        username: "Anon",
        avatar_url: ""
      })
      .select()  // select devuelve array
      .single();  // .single() aquí es seguro porque insert devuelve 1 fila

    if (insertError) throw insertError;

    console.log("[CREATE PROFILE] New profile created:", inserted);
    return res.status(200).json({ success: true, profile: inserted });

  } catch (err: any) {
    console.error("[CREATE PROFILE] error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal error" });
  }
      }
