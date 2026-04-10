import { supabase, cors } from "./_supabase.mjs";
import { requireOrb } from "./_orbGuard.mjs";
import { recordPriceSnapshot } from "./_snapshot.mjs";
import { createBuyTickets, createGraduationTickets } from "./_ledger.mjs";
import {
  solveBuy, curvePercent, checkGraduation, spotPrice, getWldUsdRate,
  TOTAL_SUPPLY, MAX_CREATOR_HOLD,
  GRADUATION_WLD, GRADUATION_HOLDERS, MAX_RETRIES,
} from "./_curve.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const tokenId = req.query.id;
  const { amountWld, userId, transactionId } = req.body ?? {};
  if (!tokenId || !amountWld || !userId || !transactionId) {
    return res.status(400).json({ error: "Missing tokenId, amountWld, userId" });
  }
  if (amountWld <= 0 || amountWld > 120) {
    return res.status(400).json({ error: "amountWld must be between 0 and 120 WLD" });
  }

  const orbOk = await requireOrb(userId, res);
  if (!orbOk) return;

    const APP_ID = process.env.APP_ID ?? "";
    const RP_KEY = process.env.RP_SIGNING_KEY ?? "";
    if (RP_KEY) {
      try {
        const txVerify = await fetch(
          `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}`,
          { headers: { Authorization: `Bearer ${RP_KEY}` } }
        );
        const txData = await txVerify.json();
        if (!txVerify.ok || (txData.transaction_status && txData.transaction_status !== "mined")) {
          return res.status(402).json({ error: "Payment not confirmed on-chain", details: txData });
        }
      } catch (verifyErr) {
        console.error("[BUY] Payment verification error:", verifyErr.message);
        return res.status(502).json({ error: "Could not verify payment" });
      }
    }

    const { data: txDupe } = await supabase
      .from("payment_orders")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("status", "completed")
      .maybeSingle();
    if (txDupe) {
      return res.status(409).json({ error: "Transaction already used for a previous buy" });
    }
  
  const wldUsd = await getWldUsdRate();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  const username = profile?.username ?? "anon";

  let orderId = null;
  try {
    const reference = "ref_" + (transactionId || Date.now().toString(36)).slice(0, 16);
    const { data: order } = await supabase
      .from("payment_orders")
      .insert({
        user_id: userId,
        username,
        token_id: tokenId,
        token_symbol: "",
        amount_wld: amountWld,
        estimated_tokens: 0,
        spot_price: 0,
        reference,
        transaction_id: transactionId || null,
        status: "processing",
        type: "buy",
      })
      .select("id")
      .maybeSingle();
    orderId = order?.id || null;
  } catch (e) {
    console.error("[BUY] order creation skipped:", e.message);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data: token, error: tErr } = await supabase
        .from("tokens")
        .select("*")
        .eq("id", tokenId)
        .single();
      if (tErr || !token) return res.status(404).json({ error: "Token not found" });
      if (token.graduated) return res.status(400).json({ error: "Token graduated — trade on DEX" });

      const supply = Number(token.circulating_supply ?? 0);
      const { tokensOut, fee, netWld, newSupply, newPrice } = solveBuy(amountWld, supply);

      if (tokensOut <= 0) return res.status(400).json({ error: "Amount too small" });

      if (userId === token.creator_id) {
        const { data: existing } = await supabase
          .from("holdings")
          .select("amount")
          .eq("user_id", userId)
          .eq("token_id", tokenId)
          .maybeSingle();
        const current = Number(existing?.amount ?? 0);
        if (current + tokensOut > TOTAL_SUPPLY * MAX_CREATOR_HOLD) {
          return res.status(400).json({ error: "Creator max hold: " + (MAX_CREATOR_HOLD * 100) + "%" });
        }
      }

      const newPriceUsd = newPrice * wldUsd;
      const totalWldInCurve = Number(token.total_wld_in_curve ?? 0) + netWld;
      const treasuryBalance = Number(token.treasury_balance ?? 0) + fee;
      const cp = curvePercent(totalWldInCurve);

      const { data: updated, error: updateErr } = await supabase
        .from("tokens")
        .update({
          circulating_supply: newSupply,
          price_wld: newPrice,
          price_usdc: newPriceUsd,
          total_wld_in_curve: totalWldInCurve,
          treasury_balance: treasuryBalance,
          curve_percent: cp,
          market_cap: newSupply * newPriceUsd,
          volume_24h: Number(token.volume_24h ?? 0) + amountWld * wldUsd,
        })
        .eq("id", tokenId)
        .eq("circulating_supply", supply)
        .select("id")
        .maybeSingle();

      if (updateErr) throw updateErr;
      if (!updated) {
        if (attempt < MAX_RETRIES - 1) continue;
        return res.status(409).json({ error: "Concurrent trade detected, please retry" });
      }

      const { data: holdingRow } = await supabase
        .from("holdings")
        .select("amount, avg_buy_price")
        .eq("user_id", userId)
        .eq("token_id", tokenId)
        .maybeSingle();

      const prevAmount = Number(holdingRow?.amount ?? 0);
      const prevAvg = Number(holdingRow?.avg_buy_price ?? 0);
      const newAmount = prevAmount + tokensOut;
      const unitPrice = netWld / tokensOut;
      const avgPrice = prevAmount > 0
        ? (prevAvg * prevAmount + unitPrice * tokensOut) / newAmount
        : unitPrice;

      if (holdingRow) {
            const { data: hUpd } = await supabase.from("holdings")
              .update({
                amount: newAmount,
                avg_buy_price: avgPrice,
                token_name: token.name, token_symbol: token.symbol,
                token_emoji: token.emoji ?? "\u{1F31F}",
                current_price: newPrice,
                value: newAmount * newPrice,
                pnl: (newPrice - avgPrice) * newAmount,
                pnl_percent: avgPrice > 0 ? ((newPrice - avgPrice) / avgPrice) * 100 : 0,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .eq("token_id", tokenId)
              .eq("amount", prevAmount)
              .select("user_id")
              .maybeSingle();

            if (!hUpd) {
              if (attempt < MAX_RETRIES - 1) continue;
              return res.status(409).json({ error: "Concurrent holdings update, please retry" });
            }
          } else {
            await supabase.from("holdings").insert({
              user_id: userId, token_id: tokenId,
              token_name: token.name, token_symbol: token.symbol,
              token_emoji: token.emoji ?? "\u{1F31F}",
              amount: tokensOut, avg_buy_price: unitPrice,
              current_price: newPrice, value: tokensOut * newPrice,
              pnl: 0, pnl_percent: 0,
              updated_at: new Date().toISOString(),
            });
          }

      if (prevAmount === 0) {
        await supabase.rpc("increment_holders", { tid: tokenId });
      }

      await supabase.from("token_activity").insert({
        type: "buy", user_id: userId, username,
        token_id: tokenId, token_symbol: token.symbol,
        amount: tokensOut, price: newPrice, total: amountWld,
        timestamp: new Date().toISOString(),
      });

      await recordPriceSnapshot(tokenId, newPrice, newPriceUsd, newSupply, amountWld * wldUsd, "buy");

      if (orderId) {
        await supabase.from("payment_orders").update({
          status: "completed", completed_at: new Date().toISOString(),
          token_symbol: token.symbol, estimated_tokens: tokensOut, spot_price: spotPrice(supply),
        }).eq("id", orderId);
      }

      try {
        await createBuyTickets({
          orderId, userId, username,
          tokenId, tokenSymbol: token.symbol,
          amountWld, fee, netWld, tokensOut, newPrice,
        });
      } catch (le) {
        console.error("[BUY] ledger error (non-fatal):", le.message);
      }

      const currentHolders = Number(token.holders ?? 0) + (prevAmount === 0 ? 1 : 0);
      if (checkGraduation(totalWldInCurve, currentHolders, newSupply)) {
        await triggerGraduation(tokenId, token.symbol, totalWldInCurve, newPrice);
      }

      return res.status(200).json({
        success: true,
        tokensReceived: tokensOut, fee,
        avgPrice: unitPrice, newPrice, newPriceUsd,
        newSupply, curvePercent: cp,
        message: "Bought " + tokensOut.toLocaleString() + " " + token.symbol,
      });
    } catch (err) {
      console.error("[BUY attempt=" + attempt + "]", err.message);
      if (attempt >= MAX_RETRIES - 1) {
        if (orderId) {
          await supabase.from("payment_orders").update({
            status: "failed", error_message: err.message,
          }).eq("id", orderId).catch(() => {});
        }
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}

async function triggerGraduation(tokenId, symbol, totalWld, finalPrice) {
  try {
    const toPool = totalWld * 0.70;
    const toTreasury = totalWld * 0.30;

    const { data: updated } = await supabase.from("tokens").update({
      graduated: true, graduated_at: new Date().toISOString(),
      graduation_pool_wld: toPool, graduation_treasury_wld: toTreasury,
      curve_percent: 100,
    }).eq("id", tokenId).eq("graduated", false).select("id").maybeSingle();

    if (!updated) {

      return;
    }

    await supabase.from("token_activity").insert({
      type: "graduate", user_id: "system", username: "system",
      token_id: tokenId, token_symbol: symbol,
      amount: totalWld, price: finalPrice, total: totalWld,
      timestamp: new Date().toISOString(),
    });

    try {
      await createGraduationTickets({ tokenId, tokenSymbol: symbol, totalWld, toPool, toTreasury, finalPrice });
    } catch (le) {
      console.error("[GRADUATION] ledger error:", le.message);
    }


  } catch (err) {
    console.error("[GRADUATION_TRIGGER]", err.message);
  }
}
