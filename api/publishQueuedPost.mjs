import { createClient } from "@supabase/supabase-js";

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

  const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers?.authorization;
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(403).json({ error: "Forbidden" });
    }

  const { account } = req.body ?? {};

  if (!account || typeof account !== "string") {
    return res.status(400).json({ error: "account required" });
  }

  try {
    const { data: candidates, error: selectErr } = await supabase
      .from("content_queue")
      .select("id, category, account, topic, content, image_url, created_at")
      .eq("status", "queued")
      .eq("account", account)
      .order("created_at", { ascending: true })
      .limit(1);

    if (selectErr) throw new Error(selectErr.message);

    if (!candidates || candidates.length === 0) {
      return res.status(200).json({ published: 0 });
    }

    const post = candidates[0];
    const publishedAt = post.created_at || new Date().toISOString();
    const hourOfDay = new Date(publishedAt).getHours();

    const OFFICIAL_PROFILES = {
      "@news":          { username: "H News" },
      "@crypto":        { username: "H Crypto" },
      "@trading":       { username: "H Trading" },
      "@memes":         { username: "H Memes" },
      "@builders":      { username: "H Builders" },
      "@sports":        { username: "H Sports" },
      "@entertainment": { username: "H Entertainment" },
      "@world":         { username: "H World" },
    };

    const meta = OFFICIAL_PROFILES[account];
    if (meta) {
      await supabase
        .from("profiles")
        .upsert(
          { id: account, username: meta.username, verified: false, tier: "official" },
          { onConflict: "id", ignoreDuplicates: true }
        );
    }

    const { error: updateErr } = await supabase
      .from("content_queue")
      .update({ status: "published", published_at: publishedAt })
      .eq("id", post.id);

    if (updateErr) throw new Error(updateErr.message);

    const { error: postInsertErr } = await supabase
      .from("posts")
      .insert({
        user_id: account,
        content: post.content,
        image_url: post.image_url || null,
        timestamp: publishedAt,
        created_at: publishedAt,
        deleted_flag: false,
        visibility_score: 1,
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
      });

    if (postInsertErr) {
      console.error("[PUBLISH_QUEUED] Post insert error:", postInsertErr.message);
      return res.status(500).json({ error: postInsertErr.message });
    }

    await supabase
      .from("post_metrics")
      .insert({
        queue_id: post.id,
        category: post.category,
        account: post.account,
        topic: post.topic,
        impressions: 0,
        clicks: 0,
        wld_earned: 0,
        published_at: publishedAt,
        hour_of_day: hourOfDay,
      })
      .then(({ error }) => {
        if (error) console.warn("[PUBLISH_QUEUED] Metrics insert failed:", error.message);
      });

    return res.status(200).json({ published: 1 });
  } catch (err) {
    console.error("[PUBLISH_QUEUED] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
