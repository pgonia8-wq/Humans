import { supabase, cors } from "../../_supabase.mjs";
import { requireOrb } from "../../_orbGuard.mjs";
import { recordPriceSnapshot } from "../../_snapshot.mjs";
import {
  solveBuy, curvePercent, checkGraduation, spotPrice, getWldUsdRate,
  TOTAL_SUPPLY, MAX_CREATOR_HOLD,
  GRADUATION_WLD, GRADUATION_HOLDERS, MAX_RETRIES,
} from "../../_curve.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const tokenId = req.query.id;
  const { amountWld, userId } = req.body ?? {};
  if (!tokenId || !amountWld || !userId) {
    return res.status(400).json({ error: "Missing tokenId, amountWld, userId" });
  }
  if (amountWld <= 0 || amountWld > 120) {
    return res.status(400).json({ error: "amountWld must be between 0 and 120 WLD" });
  }

  const orbOk = await requireOrb(userId, res);
  if (!orbOk) return;

  const wldUsd = await getWldUsdRate();

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
          return res.status(400).json({ error: `Creator max hold: ${MAX_CREATOR_HOLD * 100}%` });
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();
      const username = profile?.username ?? "anon";

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
        type: "buy",
        user_id: userId,
        username,
        token_id: tokenId,
        token_symbol: token.symbol,
        amount: tokensOut,
        price: newPrice,
        total: amountWld,
        timestamp: new Date().toISOString(),
      });

      await recordPriceSnapshot(tokenId, newPrice, newPriceUsd, newSupply, amountWld * wldUsd, "buy");

      if (checkGraduation(totalWldInCurve, Number(token.holders ?? 0) + (prevAmount === 0 ? 1 : 0), newSupply)) {
        await triggerGraduation(tokenId, token.symbol, totalWldInCurve, newPrice);
      }

      return res.status(200).json({
        success: true,
        tokensReceived: tokensOut,
        fee,
        avgPrice: unitPrice,
        newPrice,
        newPriceUsd,
        newSupply,
        curvePercent: cp,
        message: `Bought ${tokensOut.toLocaleString()} ${token.symbol}`,
      });
    } catch (err) {
      console.error(`[BUY attempt=${attempt}]`, err.message);
      if (attempt >= MAX_RETRIES - 1) {
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}

async function triggerGraduation(tokenId, symbol, totalWld, finalPrice) {
  try {
    const toPool     = totalWld * 0.70;
    const toTreasury = totalWld * 0.30;

    await supabase
      .from("tokens")
      .update({
        graduated: true,
        graduated_at: new Date().toISOString(),
        graduation_pool_wld: toPool,
        graduation_treasury_wld: toTreasury,
        curve_percent: 100,
      })
      .eq("id", tokenId)
      .eq("graduated", false);

    await supabase.from("token_activity").insert({
      type: "graduate",
      user_id: "system",
      username: "system",
      token_id: tokenId,
      token_symbol: symbol,
      amount: totalWld,
      price: finalPrice,
      total: totalWld,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[GRADUATION_TRIGGER]", err.message);
  }
}
