import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const IMPRESSION_VALUE = 0.001;

const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const { postId, campaignId, userId, type, country, language, interests } = req.body || {};

  if (!postId || !campaignId || !type) {
    return res.status(400).json({ error: "postId, campaignId, and type are required" });
  }

  if (type !== "impression" && type !== "click") {
    return res.status(400).json({ error: "type must be impression or click" });
  }

  try {
    let value = IMPRESSION_VALUE;
    let creatorEarning = IMPRESSION_VALUE * 0.7;
    let platformEarning = IMPRESSION_VALUE * 0.3;

    if (type === "click") {
      const { data: campaign, error } = await supabase
        .from("campaigns")
        .select("cpc, budget, spent, status")
        .eq("id", campaignId)
        .single();

      if (error || !campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.status !== "active") {
        return res.status(400).json({ error: "Campaign is not active" });
      }

      const cpc = campaign.cpc || 0;
      if (campaign.spent + cpc > campaign.budget) {
        await supabase.from("campaigns").update({ status: "paused" }).eq("id", campaignId);
        return res.status(400).json({ error: "Campaign budget exhausted" });
      }

      value = cpc;
      creatorEarning = cpc * 0.7;
      platformEarning = cpc * 0.3;

      await supabase
        .from("campaigns")
        .update({ spent: campaign.spent + cpc })
        .eq("id", campaignId);
    }

    await supabase.from("ad_metrics").insert({
      post_id: postId,
      campaign_id: campaignId,
      user_id: userId || null,
      type,
      value,
      creator_earning: creatorEarning,
      platform_earning: platformEarning,
      country: country || "unknown",
      language: language || "unknown",
      interests: interests || null,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[trackAd] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
