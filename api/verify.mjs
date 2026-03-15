// /api/verify.mjs
import { createClient } from "@supabase/supabase-js";
import { verifyCloudProof } from "@worldcoin/idkit-core";

const APP_ID = "app_6a98c88249208506dcd4e04b529111fc";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[VERIFY] Missing Supabase env vars");
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async (request) => {
  console.log("[VERIFY] Request recibida:", {
    method: request.method,
    timestamp: new Date().toISOString(),
  });

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    console.log("[VERIFY] Body recibido:", Object.keys(body));

    const { payload } = body;

    if (!payload || !payload.finalPayload) {
      console.error("[VERIFY] Missing payload or finalPayload");
      return new Response(
        JSON.stringify({ success: false, error: "Missing payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { finalPayload } = payload;

    if (finalPayload.status !== "success") {
      console.warn("[VERIFY] Verification failed:", finalPayload.status);
      return new Response(
        JSON.stringify({ success: false, error: "Verification failed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("[VERIFY] Verifying proof...");
    const verifyResult = await verifyCloudProof({
      app_id: APP_ID,
      nullifier_hash: finalPayload.nullifier_hash,
      merkle_root: finalPayload.merkle_root,
      proof: finalPayload.proof,
      verification_level: finalPayload.verification_level,
    });

    if (!verifyResult.success) {
      console.warn("[VERIFY] Proof invalid");
      return new Response(
        JSON.stringify({ success: false, error: "Invalid proof" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const nullifierHash = finalPayload.nullifier_hash;
    const userId = body.userId || nullifierHash;

    let { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("nullifier_hash", nullifierHash)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (!profile) {
      console.log("[VERIFY] Creating new profile");
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          nullifier_hash: nullifierHash,
          username: body.username || `user_${nullifierHash.slice(0, 8)}`,
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      profile = newProfile;
    } else {
      console.log("[VERIFY] Updating existing profile");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        nullifier_hash: nullifierHash,
        profile,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[VERIFY] Error:", err.message, err.stack);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
