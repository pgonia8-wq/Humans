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

  const { rows } = req.body ?? {};

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows array required" });
  }

  if (rows.length > 20) {
    return res.status(400).json({ error: "max 20 rows per request" });
  }

  try {
    const sanitized = rows.map((r) => ({
      category: r.category,
      account: r.account,
      topic: r.topic,
      content: r.content,
      status: "queued",
      published_at: null,
      scheduled_at: null,
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("content_queue")
      .insert(sanitized)
      .select("id");

    if (insertErr) {
      console.error("[QUEUE_CONTENT] Insert error:", insertErr.message);
      return res.status(500).json({ error: insertErr.message });
    }

    return res.status(201).json({
      queued: inserted?.length ?? 0,
      ids: inserted?.map((r) => r.id) ?? [],
    });
  } catch (err) {
    console.error("[QUEUE_CONTENT] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
