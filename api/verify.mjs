import { createClient } from "@supabase/supabase-js";

// Supabase con Service Role Key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("[BACKEND] Verifying World ID…");

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { payload, action } = body;

  if (!payload || !payload.nullifier_hash || !payload.proof || !payload.merkle_root) {
    console.error("[BACKEND] Missing proof fields:", body);
    return res.status(400).json({ success: false, error: "Missing proof fields" });
  }

  const nullifierHash = payload.nullifier_hash;
  console.log("[BACKEND] nullifier_hash:", nullifierHash);

  // — Verificar en Worldcoin
  let verifyData;
  try {
    const verifyResponse = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/app_6a98c88249208506dcd4e04b529111fc`, // tu App ID
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merkle_root: payload.merkle_root,
          nullifier_hash: payload.nullifier_hash,
          proof: payload.proof,
          verification_level: payload.verification_level,
          action,
        }),
      }
    );

    verifyData = await verifyResponse.json();
    console.log("[BACKEND] Worldcoin verify response:", verifyData);

    if (!verifyData.success) {
      console.error("[BACKEND] Worldcoin rejected the proof");
      return res.status(400).json({ success: false, error: "Worldcoin validation failed", verifyData });
    }

  } catch (err) {
    console.error("[BACKEND] Error calling Worldcoin verify:", err);
    return res.status(500).json({ success: false, error: "Worldcoin service error" });
  }

  // — Guardar en profiles
  try {
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          nullifier_hash: nullifierHash,
          wallet_address: payload.walletAddress || null,
          minikitData: JSON.stringify(payload.minikitData || {}),
          verified: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: ["nullifier_hash"] }
      );

    if (upsertError) {
      console.error("[BACKEND] Supabase upsert profiles error:", upsertError);
      return res.status(500).json({ success: false, error: upsertError.message });
    }

    console.log("[BACKEND] Guardado en profiles:", nullifierHash);

  } catch (err) {
    console.error("[BACKEND] Supabase profiles error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }

  // — Guardar en world_id_proofs
  try {
    const { error: proofError } = await supabase
      .from("world_id_proofs")
      .insert([
        {
          nullifier_hash: nullifierHash,
          merkle_root: payload.merkle_root,
          proof: payload.proof,
          verification_level: payload.verification_level,
          backend_response: JSON.stringify(verifyData),
          created_at: new Date().toISOString(),
        },
      ]);

    if (proofError) {
      console.error("[BACKEND] Supabase insert world_id_proofs error:", proofError);
    } else {
      console.log("[BACKEND] Guardado en world_id_proofs:", nullifierHash);
    }

  } catch (err) {
    console.error("[BACKEND] Supabase world_id_proofs error:", err);
  }

  return res.status(200).json({ success: true, nullifier_hash: nullifierHash, verifyData });
}
