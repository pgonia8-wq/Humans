import { supabase, cors } from "./_supabase.mjs";

const APP_ID = process.env.APP_ID ?? "";
const ACTION_ID = process.env.WORLDCOIN_ACTION_ID ?? "user-orb";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { payload, userId } = req.body ?? {};

  if (
    !payload ||
    !payload.nullifier_hash ||
    !payload.proof ||
    !payload.merkle_root ||
    !payload.verification_level
  ) {
    return res.status(400).json({ error: "Missing proof fields" });
  }

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const nullifierHash = payload.nullifier_hash;
  const verLevel = payload.verification_level;

  if (verLevel !== "orb") {
    return res.status(403).json({
      error: "ORB verification required. Device-level is not sufficient.",
      receivedLevel: verLevel,
    });
  }

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, verified, verification_level, orb_verified_at")
      .eq("id", userId)
      .maybeSingle();

    if (existing?.verification_level === "orb") {
      return res.status(200).json({
        success: true,
        orbVerified: true,
        reused: true,
      });
    }
  } catch (err) {
    console.warn("[VERIFY_ORB] Anti-replay check failed:", err.message);
  }

  try {
    const { data: nullifierUsed } = await supabase
      .from("profiles")
      .select("id")
      .eq("nullifier_hash", nullifierHash)
      .neq("id", userId)
      .maybeSingle();

    if (nullifierUsed) {
      return res.status(409).json({
        error: "This ORB proof has already been used by another account.",
        code: "NULLIFIER_REPLAY",
      });
    }
  } catch (err) {
    console.warn("[VERIFY_ORB] Nullifier replay check failed:", err.message);
  }

  let verifyData;
  try {
    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: ACTION_ID,
          merkle_root: payload.merkle_root,
          proof: payload.proof,
          nullifier_hash: nullifierHash,
          verification_level: verLevel,
        }),
      }
    );

    verifyData = await verifyResponse.json();

    const isSuccess =
      verifyResponse.ok &&
      (verifyData.success === true || verifyData.success === "true");

    if (!isSuccess) {
      return res.status(verifyResponse.status || 400).json({
        error: verifyData.detail ?? verifyData.error ?? "Worldcoin verification failed",
      });
    }
  } catch (err) {
    console.error("[VERIFY_ORB] Network error:", err.message);
    return res.status(502).json({ error: "Could not contact Worldcoin" });
  }

  try {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          verified: true,
          verification_level: "orb",
          nullifier_hash: nullifierHash,
          orb_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertError) {
      console.error("[VERIFY_ORB] Upsert error:", upsertError.message);
      return res.status(500).json({ error: upsertError.message });
    }
  } catch (err) {
    console.error("[VERIFY_ORB] DB error:", err.message);
    return res.status(500).json({ error: "Database error saving verification" });
  }

  return res.status(200).json({
    success: true,
    orbVerified: true,
  });
}
