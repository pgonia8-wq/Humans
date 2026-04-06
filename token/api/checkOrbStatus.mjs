import { supabase, cors } from "./_supabase.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, verified")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return res.status(200).json({
        orbVerified: false,
        reason: "USER_NOT_FOUND",
      });
    }

    return res.status(200).json({
      orbVerified: profile.verified === true,
      verified: profile.verified ?? false,
    });
  } catch (err) {
    console.error("[CHECK_ORB_STATUS]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
