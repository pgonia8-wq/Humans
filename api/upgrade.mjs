import { supabase } from "../supabaseClient.mjs";
import { nanoid } from "nanoid";

const PREMIUM_LIMIT = 10000;
const PREMIUM_PLUS_LIMIT = 3000;

// Obtiene precio dinámico
async function getUpgradePrice(tier) {
  if (tier === "premium") {
    const { count } = await supabase
      .from("upgrades")
      .select("*", { count: "exact" })
      .eq("tier", "premium");
    return count < PREMIUM_LIMIT ? 10 : 20;
  } else {
    const { count } = await supabase
      .from("upgrades")
      .select("*", { count: "exact" })
      .eq("tier", "premium+");
    return count < PREMIUM_PLUS_LIMIT ? 15 : 35;
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

// Verifica tx on chain (Etherscan API for Optimism)
async function verifyTxOnChain(transactionId) {
  const apiKey = "B7PCP5XSYD41ZDT96PZ8R1X15CDH5H2US1";  // ← obtén gratis en https://optimistic.etherscan.io/myapikey
  const res = await fetch(`https://api-optimistic.etherscan.io/api?module=transaction&action=gettxreceiptstatus&txhash=\( {transactionId}&apikey= \){apiKey}`);
  const data = await res.json();
  return data.status === "1" && data.result === "1";  // 1 = success
}

// Handler principal
export default async function handler(req, res) {
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

  try {
    // Verificar tx on chain
    const isTxSuccess = await verifyTxOnChain(transactionId);
    if (!isTxSuccess) {
      return res.status(400).json({ success: false, error: "Transacción no exitosa on chain" });
    }

    const price = await getUpgradePrice(tier);

    // Insert upgrade
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
    return res.status(500).json({ success: false, error: err.message || "Server error" });
  }
      }
