import { supabase, adminAuth, cors, writeLog } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!adminAuth(req, res)) return;

  const { userId, action, reason } = req.body || {};
  if (!userId || !action) return res.status(400).json({ error: "Missing userId or action" });
  if (!["ban", "unban"].includes(action)) return res.status(400).json({ error: "action must be ban or unban" });

  try {
    if (action === "ban") {
      const { error } = await supabase
        .from("profiles")
        .update({
          banned: true,
          ban_reason: reason || "Violated community guidelines",
          banned_at: new Date().toISOString(),
        })
        .eq("id", userId);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        event: "admin_ban",
        user_id: userId,
        details: JSON.stringify({ reason, action: "ban" }),
      }).catch(() => {});

      await writeLog({ category: "admin_action", event: "user_banned", severity: "warning", user_id: userId, details: { reason, action: "ban" }, endpoint: "/api/admin/ban" });
      return res.status(200).json({ success: true, message: "User banned" });
    }

    if (action === "unban") {
      const { error } = await supabase
        .from("profiles")
        .update({
          banned: false,
          ban_reason: null,
          banned_at: null,
        })
        .eq("id", userId);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        event: "admin_unban",
        user_id: userId,
        details: JSON.stringify({ action: "unban" }),
      }).catch(() => {});

      await writeLog({ category: "admin_action", event: "user_unbanned", severity: "info", user_id: userId, details: { action: "unban" }, endpoint: "/api/admin/ban" });
      return res.status(200).json({ success: true, message: "User unbanned" });
    }
  } catch (err) {
    console.error("[ADMIN/BAN]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
