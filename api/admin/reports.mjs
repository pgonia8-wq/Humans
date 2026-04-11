import { supabase, adminAuth, cors, writeLog } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    if (!adminAuth(req, res)) return;
    const status = req.query?.status || "pending";
    const page = parseInt(req.query?.page || "0");
    const limit = 30;

    try {
      let query = supabase
        .from("reports")
        .select("id, reporter_id, post_id, user_id, reason, status, created_at", { count: "exact" });

      if (status !== "all") query = query.eq("status", status);

      const { data, count, error } = await query
        .order("created_at", { ascending: false })
        .range(page * limit, page * limit + limit - 1);

      if (error) throw error;

      return res.status(200).json({ reports: data || [], total: count || 0, page });
    } catch (err) {
      console.error("[ADMIN/REPORTS]", err.message);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  if (req.method === "POST") {
    if (!adminAuth(req, res)) return;
    const { reportId, action, banUser } = req.body || {};
    if (!reportId || !action) return res.status(400).json({ error: "Missing reportId or action" });

    try {
      const { data: report } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (!report) return res.status(404).json({ error: "Report not found" });

      await supabase
        .from("reports")
        .update({ status: action === "dismiss" ? "dismissed" : "resolved" })
        .eq("id", reportId);

      if (action === "remove_post" && report.post_id) {
        await supabase.from("posts").update({ deleted_flag: true }).eq("id", report.post_id);
      }

      if (banUser && report.user_id) {
        await supabase.from("profiles").update({
          banned: true,
          ban_reason: "Banned after report: " + (report.reason || "").slice(0, 100),
          banned_at: new Date().toISOString(),
        }).eq("id", report.user_id);
      }

      await supabase.from("audit_log").insert({
        event: "admin_report_action",
        user_id: "admin",
        details: JSON.stringify({ reportId, action, banUser }),
      }).catch(() => {});

      await writeLog({ category: "admin_action", event: `report_${action}`, severity: banUser ? "warning" : "info", user_id: report.user_id, details: { reportId, action, banUser, reason: report.reason }, endpoint: "/api/admin/reports" });
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("[ADMIN/REPORTS POST]", err.message);
      return res.status(500).json({ error: "Internal error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
