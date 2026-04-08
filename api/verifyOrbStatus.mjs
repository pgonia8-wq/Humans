import { createClient } from "@supabase/supabase-js";

  if (!process.env.SUPABASE_URL) {
    console.error("[VERIFY_ORB] ERROR: SUPABASE_URL not configured");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[VERIFY_ORB] ERROR: SUPABASE_SERVICE_ROLE_KEY not configured");
  }

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );

  const APP_ID = process.env.APP_ID ?? "";
  const ORB_ACTION_ID = process.env.WORLDCOIN_ORB_ACTION_ID ?? "user-orb";

  export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const body = req.body || {};
    const { userId, proof } = body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ success: false, error: "userId is required" });
    }

    if (
      !proof ||
      !proof.nullifier_hash ||
      !proof.proof ||
      !proof.merkle_root ||
      !proof.verification_level
    ) {
      return res.status(400).json({ success: false, error: "Missing proof fields" });
    }

    if (proof.verification_level !== "orb") {
      return res.status(400).json({ success: false, error: "Only orb-level verification accepted" });
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, verification_level")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      return res.status(404).json({ success: false, error: "Profile not found" });
    }

    if (existing.verification_level === "orb") {
      return res.status(200).json({ success: true, message: "Already orb-verified" });
    }

    let verifyData;
    try {
      const verifyResponse = await fetch(
        `https://developer.worldcoin.org/api/v2/verify/${APP_ID}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: ORB_ACTION_ID,
            merkle_root: proof.merkle_root,
            proof: proof.proof,
            nullifier_hash: proof.nullifier_hash,
            verification_level: proof.verification_level,
          }),
        }
      );

      verifyData = await verifyResponse.json();

      const isSuccess =
        verifyResponse.ok &&
        (verifyData.success === true || verifyData.success === "true");

      if (!isSuccess) {
        const errMsg = verifyData.detail ?? verifyData.error ?? "";
        if (errMsg.includes("already") || verifyData.code === "already_verified") {
          const { error: dbErr } = await supabase
            .from("profiles")
            .update({
              verification_level: "orb",
              orb_verified_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (dbErr) {
            console.error("[VERIFY_ORB] DB error on already_verified:", dbErr.message);
            return res.status(500).json({ success: false, error: "Database error" });
          }
          return res.status(200).json({ success: true, message: "Orb verification confirmed" });
        }
        return res.status(400).json({ success: false, error: "Orb verification failed with Worldcoin" });
      }
    } catch (err) {
      console.error("[VERIFY_ORB] Network error:", err.message);
      return res.status(500).json({ success: false, error: "Error contacting Worldcoin" });
    }

    try {
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({
          verification_level: "orb",
          orb_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (dbErr) {
        console.error("[VERIFY_ORB] DB error:", dbErr.message);
        return res.status(500).json({ success: false, error: "Database error" });
      }
    } catch (err) {
      console.error("[VERIFY_ORB] Error:", err.message);
      return res.status(500).json({ success: false, error: "Database error" });
    }

    return res.status(200).json({ success: true, message: "Orb verification saved" });
  }
  