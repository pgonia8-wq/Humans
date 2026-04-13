import { supabase, cors, rateLimitByIp } from "./_supabase.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimitByIp(req, res)) return;

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("wallet")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "User not found" });
      throw error;
    }

    return res.status(200).json({ wallet: data.wallet || null });
  } catch (err) {
    console.error("userWallet error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
