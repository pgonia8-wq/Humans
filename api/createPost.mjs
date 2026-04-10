import { createClient } from "@supabase/supabase-js";
import { rateLimitPersistent } from "./_rateLimit.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { user_id, content, image_url } = req.body ?? {};

  if (!user_id || typeof user_id !== "string") {
    return res.status(400).json({ error: "user_id required" });
  }

  const rl = await rateLimitPersistent("create_post:" + user_id, { windowMs: 3600000, max: 15 });
  if (rl.limited) {
    return res.status(429).json({ error: "Max 15 posts per hour" });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return res.status(400).json({ error: "content required" });
  }
  if (content.length > 10000) {
    return res.status(400).json({ error: "content too long" });
  }

  const now = new Date().toISOString();

  try {
    const { data, error } = await supabase.from("posts").insert({
      user_id,
      content: content.trim(),
      image_url: image_url || null,
      timestamp: now,
      created_at: now,
      deleted_flag: false,
      visibility_score: 0,
      likes: 0,
      comments: 0,
      reposts: 0,
      tips_total: 0,
      boost_score: 0,
      views: 0,
      likes_count: 0,
      replies_count: 0,
      is_ad: false,
      monetized: false,
      is_boosted: false,
    }).select("id").maybeSingle();

    if (error) {
      console.error("[CREATE_POST] DB error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, postId: data?.id });
  } catch (err) {
    console.error("[CREATE_POST] Error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
