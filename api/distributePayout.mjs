import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";

if (!process.env.SUPABASE_URL) {
  console.error("[PAYOUT] ERROR: SUPABASE_URL no configurada");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[PAYOUT] ERROR: SUPABASE_SERVICE_ROLE_KEY no configurada");
}

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const WORLD_CHAIN_RPC = process.env.WORLD_CHAIN_RPC ?? "https://worldchain-mainnet.g.alchemy.com/public";
const WLD_CONTRACT = "0x2cFc85d8E48F8EaB294be644d9E25C3030863003";
const WLD_DECIMALS = 18;
const RECEIVER_WALLET = process.env.RECEIVER_WALLET ?? "";

const CREATOR_SHARE = 0.70;
const PLATFORM_SHARE = 0.25;
const POOL_SHARE = 0.05;

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

async function transferWLD(privateKey, toAddress, amount) {
  const provider = new ethers.JsonRpcProvider(WORLD_CHAIN_RPC, { chainId: 480, name: "worldchain" });
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(WLD_CONTRACT, ERC20_ABI, wallet);
  const amountWei = ethers.parseUnits(amount.toFixed(18), WLD_DECIMALS);

  if (amountWei <= 0n) return null;

  const tx = await contract.transfer(toAddress, amountWei);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, status: receipt.status === 1 ? "confirmed" : "failed" };
}

export default async function handler(req, res) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const privateKey = process.env.PAYOUT_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "PAYOUT_WALLET_PRIVATE_KEY not configured" });
  }
  if (!RECEIVER_WALLET) {
    return res.status(500).json({ error: "RECEIVER_WALLET not configured" });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: tips, error: tipsError } = await supabase
      .from("tips")
      .update({ distributed_at: new Date().toISOString() })
      .is("distributed_at", null)
      .gte("created_at", sevenDaysAgo)
      .select("from_user_id, to_post_id, amount, id");

    if (tipsError) {
      console.error("[PAYOUT] Error fetching tips:", tipsError.message);
      return res.status(500).json({ error: "Error fetching tips" });
    }

    if (!tips || tips.length === 0) {
      return res.status(200).json({ success: true, message: "No tips to distribute", processed: 0 });
    }

    const postIds = [...new Set(tips.map(t => t.to_post_id).filter(Boolean))];
    const { data: posts } = await supabase
      .from("posts")
      .select("id, user_id")
      .in("id", postIds);

    const postOwnerMap = {};
    (posts || []).forEach(p => { postOwnerMap[p.id] = p.user_id; });

    const creatorTotals = {};
    const creatorTipIds = {};
    let totalAmount = 0;

    for (const tip of tips) {
      const creatorId = postOwnerMap[tip.to_post_id];
      if (!creatorId) continue;
      const amount = Number(tip.amount) || 0;
      if (amount <= 0) continue;
      totalAmount += amount;
      creatorTotals[creatorId] = (creatorTotals[creatorId] || 0) + amount;
      if (!creatorTipIds[creatorId]) creatorTipIds[creatorId] = [];
      creatorTipIds[creatorId].push(tip.id);
    }

    if (totalAmount <= 0) {
      return res.status(200).json({ success: true, message: "No positive tips to distribute", processed: 0 });
    }

    const results = [];
    let creatorsPaid = 0;
    let totalCreatorPaid = 0;

    for (const [creatorId, total] of Object.entries(creatorTotals)) {
      const creatorAmount = total * CREATOR_SHARE;

      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", creatorId)
        .maybeSingle();

      if (creatorProfile?.wallet_address && ethers.isAddress(creatorProfile.wallet_address)) {
        try {
          const txResult = await transferWLD(privateKey, creatorProfile.wallet_address, creatorAmount);
          if (txResult) {
            results.push({ creatorId, amount: creatorAmount, txHash: txResult.txHash, status: txResult.status });
            totalCreatorPaid += creatorAmount;
            creatorsPaid++;
          }
        } catch (err) {
          console.error(`[PAYOUT] Transfer to creator ${creatorId} failed:`, err.message);
          const failedIds = creatorTipIds[creatorId] || [];
          if (failedIds.length > 0) {
            await supabase
              .from("tips")
              .update({ distributed_at: null })
              .in("id", failedIds);
            console.warn(`[PAYOUT] Rolled back distributed_at for ${failedIds.length} tips of creator ${creatorId} — will retry next run`);
          }
          results.push({ creatorId, amount: creatorAmount, error: err.message, retryable: true });
        }
      } else {
        const { error: balErr } = await supabase.rpc("credit_balance", {
          p_user_id: creatorId,
          p_amount: creatorAmount,
        });
        if (balErr) {
          console.error(`[PAYOUT] Balance credit for ${creatorId} failed:`, balErr.message);
          const failedIds = creatorTipIds[creatorId] || [];
          if (failedIds.length > 0) {
            await supabase
              .from("tips")
              .update({ distributed_at: null })
              .in("id", failedIds);
          }
          results.push({ creatorId, amount: creatorAmount, error: balErr.message, retryable: true });
        } else {
          results.push({ creatorId, amount: creatorAmount, method: "balance_credit" });
          totalCreatorPaid += creatorAmount;
          creatorsPaid++;
        }
      }
    }

    const platformAmount = totalAmount * PLATFORM_SHARE;
    const poolAmount = totalAmount * POOL_SHARE;
    const platformTotal = platformAmount + poolAmount;

    await supabase.from("payout_logs").insert({
      total_tips: totalAmount,
      creator_total: totalCreatorPaid,
      platform_total: platformTotal,
      pool_total: poolAmount,
      creators_paid: creatorsPaid,
      tips_processed: tips.length,
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      totalTips: totalAmount,
      distribution: {
        creators: { share: "70%", amount: totalCreatorPaid, paid: creatorsPaid },
        platform: { share: "25%", amount: platformAmount },
        pool: { share: "5%", amount: poolAmount, note: "on books — funds go to receiver" },
      },
      processed: tips.length,
      details: results,
    });
  } catch (err) {
    console.error("[PAYOUT] Error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
