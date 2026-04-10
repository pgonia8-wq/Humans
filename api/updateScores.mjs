import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const CRON_SECRET = process.env.CRON_SECRET;
  const authHeader = req.headers?.authorization;
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[UPDATE_SCORES] Supabase env vars missing");
      return res.status(500).json({
        success: false,
        error: "Supabase env vars missing",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (
      !process.env.CRON_SECRET ||
      req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return res.status(401).end("Unauthorized");
    }

    const { error } = await supabase.rpc("update_post_scores");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Scores updated",
    });
  } catch (err) {
    console.error("[UPDATE_SCORES] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
