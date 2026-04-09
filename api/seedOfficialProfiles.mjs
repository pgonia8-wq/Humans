import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const OFFICIAL_ACCOUNTS = [
  { id: "@news",          username: "H News",          tier: "official" },
  { id: "@crypto",        username: "H Crypto",        tier: "official" },
  { id: "@trading",       username: "H Trading",       tier: "official" },
  { id: "@memes",         username: "H Memes",         tier: "official" },
  { id: "@builders",      username: "H Builders",      tier: "official" },
  { id: "@sports",        username: "H Sports",        tier: "official" },
  { id: "@entertainment", username: "H Entertainment", tier: "official" },
  { id: "@world",         username: "H World",         tier: "official" },
  { id: "@scanner",       username: "H Scanner",       tier: "official" },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const results = [];

    for (const account of OFFICIAL_ACCOUNTS) {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: account.id,
            username: account.username,
            verified: false,
            tier: account.tier,
          },
          { onConflict: "id" }
        );

      results.push({
        id: account.id,
        status: error ? `error: ${error.message}` : "ok",
      });
    }

    const allOk = results.every((r) => r.status === "ok");
    return res.status(allOk ? 200 : 207).json({
      success: allOk,
      results,
    });
  } catch (err) {
    console.error("[SEED] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
