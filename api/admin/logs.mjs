import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const category = req.query?.category || "all";
  const severity = req.query?.severity || "all";
  const userId = req.query?.userId || null;
  const page = parseInt(req.query?.page || "0");
  const limit = 50;
  const since = req.query?.since || null;

  try {
    let query = supabase
      .from("admin_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (category !== "all") query = query.eq("category", category);
    if (severity !== "all") query = query.eq("severity", severity);
    if (userId) query = query.eq("user_id", userId);
    if (since) query = query.gte("created_at", since);

    const { data, count, error } = await query
      .range(page * limit, page * limit + limit - 1);

    if (error) throw error;

    return res.status(200).json({ logs: data || [], total: count || 0, page });
  } catch (err) {
    console.error("[ADMIN/LOGS]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
