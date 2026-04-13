import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./_rateLimit.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const userId = req.query?.userId || req.headers["x-user-id"];
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  if (rateLimit(req, { max: 30, windowMs: 60000 }).limited) {
    return res.status(429).json({ error: "Too many requests" });
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("id, type, title, message, severity, suspension_until, is_read, created_at")
        .eq("user_id", userId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const now = new Date();
      const active = (data || []).map(n => {
        if (n.type === "suspension" && n.suspension_until && new Date(n.suspension_until) < now) {
          return { ...n, expired: true };
        }
        return { ...n, expired: false };
      });

      return res.status(200).json({ notifications: active });
    } catch (err) {
      console.error("[NOTIFICATIONS GET]", err.message);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  if (req.method === "POST") {
    const { notificationId, action } = req.body || {};
    if (!notificationId) return res.status(400).json({ error: "Missing notificationId" });

    try {
      if (action === "read") {
        await supabase.from("user_notifications").update({ is_read: true }).eq("id", notificationId).eq("user_id", userId);
      } else if (action === "dismiss") {
        await supabase.from("user_notifications").update({ is_dismissed: true }).eq("id", notificationId).eq("user_id", userId);
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("[NOTIFICATIONS POST]", err.message);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
