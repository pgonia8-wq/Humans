import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const page = parseInt(req.query?.page || "0");
  const limit = 50;
  const userId = req.query?.userId || null;

  try {
    let query = supabase
      .from("admin_logs")
      .select("*", { count: "exact" })
      .eq("category", "session")
      .order("created_at", { ascending: false });

    if (userId) query = query.eq("user_id", userId);

    const { data, count, error } = await query
      .range(page * limit, page * limit + limit - 1);

    if (error) throw error;

    return res.status(200).json({ sessions: data || [], total: count || 0, page });
  } catch (err) {
    console.error("[ADMIN/SESSIONS]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
