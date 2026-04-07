import { supabase, cors } from "./_supabase.mjs";
import { recordPriceSnapshot } from "./_snapshot.mjs";
import { createBuyTickets, createGraduationTickets } from "./_ledger.mjs";
import {
  solveBuy, curvePercent, checkGraduation, spotPrice, getWldUsdRate,
  TOTAL_SUPPLY, GRADUATION_WLD, GRADUATION_HOLDERS, MAX_RETRIES,
} from "./_curve.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

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

    const { data: order, error: oErr } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (oErr || !order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "pending") {
      return res.status(400).json({ error: "Order already " + order.status });
    }

    const elapsed = Date.now() - new Date(order.created_at).getTime();
    if (elapsed > 5 * 60 * 1000) {
      await supabase.from("payment_orders").update({ status: "expired" }).eq("id", orderId);
      return res.status(400).json({ error: "Order expired (5 min limit)" });
    }

    const tokenId = order.token_id;
    const amountWld = Number(order.amount_wld);
    const userId = order.user_id;
    const username = order.username;

    const wldUsd = await getWldUsdRate();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const { data: token, error: tErr } = await supabase
          .from("tokens")
          .select("*")
          .eq("id", tokenId)
          .single();
        if (tErr || !token) return res.status(404).json({ error: "Token not found" });
        if (token.graduated) return res.status(400).json({ error: "Token graduated" });

        const supply = Number(token.circulating_supply ?? 0);
        const { tokensOut, fee, netWld, newSupply, newPrice } = solveBuy(amountWld, supply);
        if (tokensOut <= 0) return res.status(400).json({ error: "Amount too small after recalc" });

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

        await supabase.from("holdings").upsert({
          user_id: userId, token_id: tokenId,
          token_name: token.name, token_symbol: token.symbol,
          token_emoji: token.emoji ?? "\u{1F31F}",
          amount: newAmount, avg_buy_price: avgPrice,
          current_price: newPrice, value: newAmount * newPrice,
          pnl: (newPrice - avgPrice) * newAmount,
          pnl_percent: avgPrice > 0 ? ((newPrice - avgPrice) / avgPrice) * 100 : 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,token_id" });

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

        await supabase.from("payment_orders").update({
          status: "completed",
          transaction_id: transactionId,
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
          return res.status(500).json({ error: err.message });
        }
      }
    }
  } catch (err) {
    console.error("[confirmBuy]", err.message);
    return res.status(500).json({ error: err.message });
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
      console.log("[GRADUATION] Already graduated or concurrent graduation for " + symbol);
      return;
    }

    await supabase.from("token_activity").insert({
      type: "graduate", user_id: "system", username: "system",
      token_id: tokenId, token_symbol: symbol,
      amount: totalWld, price: finalPrice, total: totalWld,
      timestamp: new Date().toISOString(),
    });

    await createGraduationTickets({ tokenId, tokenSymbol: symbol, totalWld, toPool, toTreasury, finalPrice });

    console.log("[GRADUATION] " + symbol + " graduated! Pool: " + toPool.toFixed(2) + ", Treasury: " + toTreasury.toFixed(2));
  } catch (err) {
    console.error("[GRADUATION_TRIGGER]", err.message);
  }
}
