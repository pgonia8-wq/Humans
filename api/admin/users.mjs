import { supabase, adminAuth, cors } from "./_auth.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const search = req.query?.search || "";
  const page = parseInt(req.query?.page || "0");
  const limit = 30;
  const offset = page * limit;
  const filter = req.query?.filter || "all";

  try {
    let query = supabase
      .from("profiles")
      .select("id, username, avatar_url, tier, verified, verification_level, reputation_score, banned, ban_reason, created_at", { count: "exact" });

    if (search) {
      query = query.or(`username.ilike.%${search}%,id.ilike.%${search}%`);
    }
    if (filter === "banned") query = query.eq("banned", true);
    if (filter === "verified") query = query.eq("verified", true);
    if (filter === "reported") {
      const { data: reportedIds } = await supabase
        .from("reports")
        .select("user_id")
        .eq("status", "pending");
      const ids = [...new Set((reportedIds || []).map(r => r.user_id).filter(Boolean))];
      if (ids.length > 0) query = query.in("id", ids);
      else return res.status(200).json({ users: [], total: 0, page });
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      users: data || [],
      total: count || 0,
      page,
    });
  } catch (err) {
    console.error("[ADMIN/USERS]", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}
