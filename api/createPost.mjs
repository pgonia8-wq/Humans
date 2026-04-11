import { createClient } from "@supabase/supabase-js";
  import { rateLimitPersistent } from "./_rateLimit.mjs";

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );

  function sanitizeContent(text) {
    return text
      .replace(/<script[^>]*>[sS]*?<\/script>/gi, "")
      .replace(/<iframe[^>]*>[sS]*?<\/iframe>/gi, "")
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
      .replace(/<(?!\/?(b|i|u|em|strong|br|p)\b)[^>]+>/gi, "")
      .trim();
  }

  export default async function handler(req, res) {
    const t0 = Date.now();
    const reqId = Math.random().toString(36).slice(2, 10);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const body = req.body ?? {};
    const user_id = body.user_id || body.userId;
    const { content, image_url } = body;

    console.log(JSON.stringify({ event: "create_post", reqId, userId: user_id, content_length: content?.length, ts: new Date().toISOString() }));

    if (!user_id || typeof user_id !== "string") {
      return res.status(400).json({ error: "user_id required" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("verification_level")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile || !profile.verification_level) {
      return res.status(403).json({ error: "Device verification required to create posts" });
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

    const cleanContent = sanitizeContent(content);
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase.from("posts").insert({
        user_id,
        content: cleanContent,
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
        console.error(JSON.stringify({ event: "error", type: "create_post_db", reqId, endpoint: "/api/createPost", userId: user_id, error: error.message, latency_ms: Date.now() - t0 }));
        return res.status(500).json({ error: error.message });
      }

      console.log(JSON.stringify({ event: "create_post_ok", reqId, userId: user_id, postId: data?.id, latency_ms: Date.now() - t0 }));
      return res.status(201).json({ success: true, postId: data?.id });
    } catch (err) {
      console.error(JSON.stringify({ event: "error", type: "create_post_exception", reqId, endpoint: "/api/createPost", userId: user_id, error: err.message, latency_ms: Date.now() - t0 }));
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  