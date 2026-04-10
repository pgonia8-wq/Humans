import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const PREMIUM_LIMIT = 10000;
const PREMIUM_PLUS_LIMIT = 3000;

// Obtiene precio dinámico
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

// Crea token de referido
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

// Verifica tx on-chain (Etherscan API for Optimism — token creation chain)
async function verifyTxOnChain(transactionId) {
    const apiKey = process.env.ETHERSCAN_API_KEY ?? "";
    if (!apiKey) {
      console.error("[UPGRADE] ETHERSCAN_API_KEY not configured");
      return { success: false, error: "ETHERSCAN_API_KEY not configured" };
    }
    try {
      const resp = await fetch(`https://api-optimistic.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=${transactionId}&apikey=${apiKey}`);
      const data = await resp.json();
      const ok = data.status === "1" && data.result?.status === "1";
      return { success: ok, error: ok ? null : "Transaction not successful on chain" };
    } catch (err) {
      console.error("[UPGRADE] Etherscan API error:", err.message);
      return { success: false, error: "Failed to verify transaction on chain" };
    }
  }
  
// Handler principal
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET" && req.query.getPrice === "true") {
    const tier = req.query.tier;
    if (!tier) return res.status(400).json({ success: false, error: "Missing tier" });
    const price = await getUpgradePrice(tier);
    return res.status(200).json({ success: true, price });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const body = req.body || {};
  const { userId, tier, transactionId } = body;

  if (!userId || !tier || !transactionId) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
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

    const txResult = await verifyTxOnChain(transactionId);
    if (!txResult.success) {
      return res.status(400).json({ success: false, error: txResult.error || "Transaction verification failed" });
    }

    const { data: userProfile } = await supabase
      .from("profiles")
      .select("wallet")
      .eq("id", userId)
      .maybeSingle();

    if (userProfile?.wallet) {
      try {
        const txResp = await fetch(`https://api-optimistic.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionId}&apikey=${process.env.ETHERSCAN_API_KEY}`);
        const txDetail = await txResp.json();
        const txFrom = txDetail?.result?.from?.toLowerCase();
        if (txFrom && txFrom !== userProfile.wallet.toLowerCase()) {
          return res.status(403).json({ success: false, error: "Transaction sender does not match user wallet" });
        }
      } catch (e) {
        console.warn("[UPGRADE] Could not verify tx ownership:", e.message);
      }
    }

    const price = await getUpgradePrice(tier);

    const { error: insertError } = await supabase.from("upgrades").insert({
      user_id: userId,
      tier,
      price,
      start_date: new Date().toISOString(),
      transaction_id: transactionId,
    });

    if (insertError) throw insertError;

    // Update profiles.tier
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ tier })
      .eq("id", userId);

    if (updateError) throw updateError;

    const newReferralToken = await createReferralToken(userId);

    return res.status(200).json({ success: true, price, referralToken: newReferralToken });
  } catch (err) {
    console.error("[BACKEND] Error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
