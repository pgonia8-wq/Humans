import { supabase, cors, mapActivityRow } from "./_supabase.mjs";

  export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

    const { id, limit = "50" } = req.query;
    if (!id) return res.status(400).json({ error: "Missing token id" });

    try {
      const { data, error, count } = await supabase
        .from("token_activity")
        .select("*", { count: "exact" })
        .eq("token_id", id)
        .order("timestamp", { ascending: false })
        .limit(Number(limit));

      if (error) throw error;

      return res.status(200).json({
        activities: (data ?? []).map(mapActivityRow),
        total: count ?? 0,
      });
    } catch (err) {
      console.error("[tokenActivity]", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  