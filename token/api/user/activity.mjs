import { supabase, cors, mapActivityRow } from "../_supabase.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { user_id, limit = "50" } = req.query;
  if (!user_id) return res.status(400).json({ error: "Missing user_id" });

  try {
    const { data, error, count } = await supabase
      .from("token_activity")
      .select("*", { count: "exact" })
      .eq("user_id", user_id)
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    const activities = (data ?? []).map(mapActivityRow);
    return res.status(200).json({ activities, total: count ?? activities.length });
  } catch (err) {
    console.error("[GET /api/user/activity]", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
