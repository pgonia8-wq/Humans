import { supabase, cors, rateLimit } from "./_supabase.mjs";
import { requireOrb } from "./_orbGuard.mjs";
import { recordPriceSnapshot } from "./_snapshot.mjs";
import { createBuyTickets, createGraduationTickets } from "./_ledger.mjs";
import {
  solveBuy, curvePercent, checkGraduation, spotPrice, getWldUsdRate,
  TOTAL_SUPPLY, GRADUATION_WLD, GRADUATION_HOLDERS, MAX_RETRIES,
} from "./_curve.mjs";

const APP_ID = process.env.APP_ID ?? "";
const RP_KEY = process.env.RP_SIGNING_KEY ?? "";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  if (!RP_KEY) {
    console.error("[confirmBuy] FATAL: RP_SIGNING_KEY not configured");
    return res.status(500).json({ error: "Server misconfiguration: payment verification unavailable" });
  }

  const { orderId, transactionId } = req.body ?? {};
  if (!orderId || !transactionId) {
    return res.status(400).json({ error: "Missing orderId, transactionId" });
  }

  try {
    const { data: txDupe } = await supabase
      .from("payment_orders")
      .select("id")
      .eq("transaction_id", transactionId)
      .eq("status", "completed")
      .maybeSingle();

    if (txDupe) {
      return res.status(409).json({ error: "Transaction already used" });
    }

    const { data: claimed, error: claimErr } = await supabase
      .from("payment_orders")
      .update({
        status: "processing",
        transaction_id: transactionId,
      })
      .eq("id", orderId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimErr) {
      console.error("[confirmBuy] claim error:", claimErr.message);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (!claimed) {
      return res.status(409).json({ error: "Order already claimed, expired, or not found" });
    }

    const order = claimed;

    const elapsed = Date.now() - new Date(order.created_at).getTime();
    if (elapsed > 5 * 60 * 1000) {
      await supabase.from("payment_orders").update({ status: "expired" }).eq("id", orderId).eq("status", "processing");
      return res.status(400).json({ error: "Order expired (5 min limit)" });
    }

    const tokenId = order.token_id;
    const amountWld = Number(order.amount_wld);
    const userId = order.user_id;
    const username = order.username;

    if (!rateLimit(userId, res)) return;

    const orbOk = await requireOrb(userId, res);
    if (!orbOk) {
      await supabase.from("payment_orders").update({ status: "failed", error_message: "ORB verification required" }).eq("id", orderId);
      return;
    }

    try {
      const txVerify = await fetch(
        `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${APP_ID}`,
        { headers: { Authorization: `Bearer ${RP_KEY}` } }
      );
      const txData = await txVerify.json();
      if (!txVerify.ok || (txData.transaction_status && txData.transaction_status !== "mined")) {
        await supabase.from("payment_orders").update({ status: "failed", error_message: "Payment not confirmed on-chain" }).eq("id", orderId);
        return res.status(402).json({ error: "Payment not confirmed on-chain", details: txData });
      }
    } catch (verifyErr) {
      console.error("[confirmBuy] Payment verification error:", verifyErr.message);
      await supabase.from("payment_orders").update({ status: "failed", error_message: "Could not verify payment" }).eq("id", orderId);
      return res.status(502).json({ error: "Could not verify payment" });
    }

    const wldUsd = await getWldUsdRate();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { data: token, error: tErr } = await supabase
          .from("tokens")
          .select("*")
          .eq("id", tokenId)
          .single();
        if (tErr || !token) {
          await supabase.from("payment_orders").update({ status: "failed", error_message: "Token not found" }).eq("id", orderId);
          return res.status(404).json({ error: "Token not found" });
        }
        if (token.graduated) {
          await supabase.from("payment_orders").update({ status: "failed", error_message: "Token graduated" }).eq("id", orderId);
          return res.status(400).json({ error: "Token graduated" });
        }

        const supply = Number(token.circulating_supply ?? 0);
        const { tokensOut, fee, netWld, newSupply, newPrice } = solveBuy(amountWld, supply);
        if (tokensOut <= 0) {
          await supabase.from("payment_orders").update({ status: "failed", error_message: "Amount too small" }).eq("id", orderId);
          return res.status(400).json({ error: "Amount too small after recalc" });
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
          return res.status(409).json({ error: "Concurrent trade, please retry" });
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
          const { data: hUpd, error: hErr } = await supabase.from("holdings")
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
            console.warn("[confirmBuy] Holdings OCC conflict, retrying");
            await supabase.from("tokens").update({
              circulating_supply: supply, price_wld: Number(token.price_wld),
              price_usdc: Number(token.price_usdc), total_wld_in_curve: Number(token.total_wld_in_curve),
              treasury_balance: Number(token.treasury_balance), curve_percent: Number(token.curve_percent),
              market_cap: Number(token.market_cap), volume_24h: Number(token.volume_24h),
            }).eq("id", tokenId).eq("circulating_supply", supply);
            if (attempt < MAX_RETRIES - 1) continue;
            return res.status(409).json({ error: "Concurrent holdings update, please retry" });
          }
        } else {
          const { error: hInsertErr } = await supabase.from("holdings").insert({
            user_id: userId, token_id: tokenId,
            token_name: token.name, token_symbol: token.symbol,
            token_emoji: token.emoji ?? "\u{1F31F}",
            amount: tokensOut, avg_buy_price: unitPrice,
            current_price: newPrice, value: tokensOut * newPrice,
            pnl: 0, pnl_percent: 0,
            updated_at: new Date().toISOString(),
          });
          if (hInsertErr) {
            if (hInsertErr.code === "23505") {
              console.warn("[confirmBuy] Holdings INSERT 23505 — concurrent buy, retrying as OCC update");
              if (attempt < MAX_RETRIES - 1) continue;
              return res.status(409).json({ error: "Concurrent holdings insert, please retry" });
            }
            throw hInsertErr;
          }
          await supabase.rpc("increment_holders", { tid: tokenId });
        }

        await supabase.from("token_activity").insert({
          type: "buy", user_id: userId, username,
          token_id: tokenId, token_symbol: token.symbol,
          amount: tokensOut, price: newPrice, total: amountWld,
          timestamp: new Date().toISOString(),
        });

        await recordPriceSnapshot(tokenId, newPrice, newPriceUsd, newSupply, amountWld * wldUsd, "buy");

        await supabase.from("payment_orders").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", orderId);

        await createBuyTickets({
          orderId, userId, username,
          tokenId, tokenSymbol: token.symbol,
          amountWld, fee, netWld, tokensOut, newPrice,
        });

        const currentHolders = Number(token.holders ?? 0) + (prevAmount === 0 ? 1 : 0);
        if (checkGraduation(totalWldInCurve, currentHolders, newSupply)) {
          await triggerGraduation(tokenId, token.symbol, totalWldInCurve, newPrice);
        }

        await supabase.rpc("log_audit", { p_event: "token_confirm_buy", p_user: userId, p_details: JSON.stringify({ orderId, transactionId }) });

        supabase.from("admin_logs").insert({
          category: "activity", event: "token_confirm_buy", severity: "info",
          user_id: userId, username, endpoint: "/api/confirmBuy",
          details: { orderId, transactionId, tokenId, tokenSymbol: token.symbol, amountWld, tokensOut, newPrice },
        }).catch(() => {});

        return res.status(200).json({
          success: true, orderId,
          tokensReceived: tokensOut, fee,
          avgPrice: unitPrice, newPrice, newPriceUsd,
          newSupply, curvePercent: cp,
          message: "Bought " + tokensOut.toLocaleString() + " " + token.symbol,
        });
      } catch (err) {
        console.error("[confirmBuy attempt=" + attempt + "]", err.message);
        if (attempt >= MAX_RETRIES - 1) {
          await supabase.from("payment_orders").update({
            status: "failed", error_message: err.message,
          }).eq("id", orderId);
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    }
  } catch (err) {
    console.error("[confirmBuy]", err.message);
    return res.status(500).json({ error: "Internal server error" });
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

    await createGraduationTickets({ tokenId, tokenSymbol: symbol, totalWld, toPool, toTreasury, finalPrice });

  } catch (err) {
    console.error("[GRADUATION_TRIGGER]", err.message);
  }
}
