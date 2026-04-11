import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const page = parseInt(req.query?.page || "0");
  const limit = 50;
  const since = req.query?.since || new Date(Date.now() - 86400000).toISOString();

  try {
    const { data, count, error } = await supabase
      .from("admin_logs")
      .select("*", { count: "exact" })
      .in("severity", ["error", "critical"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(page * limit, page * limit + limit - 1);

    if (error) throw error;

    const { data: summary } = await supabase
      .from("admin_logs")
      .select("endpoint, severity")
      .in("severity", ["error", "critical"])
      .gte("created_at", since);

    const byEndpoint = {};
    (summary || []).forEach(s => {
      byEndpoint[s.endpoint || "unknown"] = (byEndpoint[s.endpoint || "unknown"] || 0) + 1;
    });

    return res.status(200).json({
      errors: data || [],
      total: count || 0,
      page,
      summary: {
        totalErrors: count || 0,
        byEndpoint,
        criticalCount: (summary || []).filter(s => s.severity === "critical").length,
      },
    });
  } catch (err) {
    console.error("[ADMIN/ERRORS]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
