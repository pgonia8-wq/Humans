import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import crypto from "node:crypto";
import { rateLimit } from "./lib/rateLimiter.adapter.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const PREMIUM_LIMIT = 10000;
const PREMIUM_PLUS_LIMIT = 3000;
const VALID_TIERS = ["premium", "premium+"];
const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;

const APP_ID = process.env.APP_ID ?? "";

async function getUpgradePrice(tier) {
  if (tier === "premium") {
    const { count } = await supabase
      .from("upgrades")
      .select("*", { count: "exact" })
      .eq("tier", "premium");
    return (count ?? 0) < PREMIUM_LIMIT ? 10 : 20;
  } else {
    const { count } = await supabase
      .from("upgrades")
      .select("*", { count: "exact" })
      .eq("tier", "premium+");
    return (count ?? 0) < PREMIUM_PLUS_LIMIT ? 15 : 35;
  }
}

async function createReferralToken(userId) {
  const token = nanoid(10);
  const { error } = await supabase.from("referral_tokens").insert({
    token,
    created_by: userId,
    tier: "premium",
    boost_limit: 1,
    tips_allowed: false,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
  return token;
}

async function verifyWorldcoinPayment(transactionId) {
  const rpKey = process.env.RP_SIGNING_KEY ?? "";
  if (!rpKey || !APP_ID) {
    console.error("[UPGRADE] RP_SIGNING_KEY or APP_ID not configured");
    return { ok: false, status: "", error: "Payment verification not configured" };
  }
  try {
    const resp = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}`,
      { headers: { Authorization: `Bearer ${rpKey}` } }
    );
    const data = await resp.json();
    const status = data?.transactionStatus ?? data?.status ?? "";
    return { ok: resp.ok, status, data };
  } catch (err) {
    console.error("[UPGRADE] Worldcoin payment verification error:", err.message);
    return { ok: false, status: "", error: err.message };
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET" && req.query.getPrice === "true") {
    const tier = req.query.tier;
    if (!tier || !VALID_TIERS.includes(tier)) {
      return res.status(400).json({ success: false, error: "Invalid or missing tier" });
    }
    const price = await getUpgradePrice(tier);
    return res.status(200).json({ success: true, price });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (rateLimit(req, { max: 10, windowMs: 60000 }).limited) {
    return res.status(429).json({ success: false, error: "Too many requests" });
  }

  const body = req.body || {};
  const { userId, tier, transactionId } = body;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ success: false, error: "Missing userId" });
  }

  if (!tier || !VALID_TIERS.includes(tier)) {
    return res.status(400).json({ success: false, error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` });
  }

  if (!transactionId || !TX_HASH_RE.test(transactionId)) {
    return res.status(400).json({ success: false, error: "Invalid transactionId format" });
  }

  const { data: _profile } = await supabase
    .from("profiles")
    .select("verification_level")
    .eq("id", userId)
    .maybeSingle();

  if (!_profile || !_profile.verification_level) {
    return res.status(403).json({ error: "Device verification required" });
  }

  try {
    const { data: existingTx } = await supabase
      .from("upgrades")
      .select("id")
      .eq("transaction_id", transactionId)
      .maybeSingle();
    if (existingTx) {
      return res.status(200).json({ success: true, message: "Upgrade ya procesado" });
    }

    const { ok: txOk, status: txStatus, error: txErr } = await verifyWorldcoinPayment(transactionId);
    if (!txOk) {
      return res.status(502).json({ success: false, error: txErr || "Could not verify payment with Worldcoin" });
    }
    if (txStatus === "failed") {
      return res.status(402).json({ success: false, error: "Payment transaction failed" });
    }
    if (txStatus === "pending" || txStatus === "") {
      return res.status(202).json({ success: false, error: "Payment pending confirmation, retry in a moment", transactionStatus: "pending" });
    }

    const price = await getUpgradePrice(tier);

    const { error: insertError } = await supabase.from("upgrades").insert({
      user_id: userId,
      tier,
      price,
      start_date: new Date().toISOString(),
      transaction_id: transactionId,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return res.status(200).json({ success: true, message: "Upgrade ya procesado" });
      }
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tier })
      .eq("id", userId);

    if (updateError) throw updateError;

    const newReferralToken = await createReferralToken(userId);

    return res.status(200).json({ success: true, price, referralToken: newReferralToken });
  } catch (err) {
    console.error("[UPGRADE] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
