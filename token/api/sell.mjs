import { supabase, cors } from "./_supabase.mjs";
import { requireOrb } from "./_orbGuard.mjs";
import {
  solveSell, curvePercent, getWldUsdRate,
  CREATOR_LOCK_HOURS, MAX_RETRIES,
} from "./_curve.mjs";
import { trackRequest, trackTrade, trackFailedTrade, isTradingPaused, isTokenFrozen } from "../../api/_metrics.mjs";
import { canTrade, shouldThrottle } from "../../api/_infra.mjs";
import { smartRateLimit, detectTradingLoop } from "../../api/_smartRate.mjs";

export default async function handler(req, res) {
  cors(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const t0 = Date.now();
  const { tokenId, tokensToSell, userId } = req.body ?? {};
  if (!tokenId || !tokensToSell || !userId) {
    return res.status(400).json({ error: "Missing tokenId, tokensToSell, userId" });
  }
  if (tokensToSell <= 0) return res.status(400).json({ error: "tokensToSell must be positive" });

  if (isTradingPaused()) {
    trackFailedTrade("other");
    return res.status(503).json({ error: "Trading is temporarily paused" });
  }
  if (isTokenFrozen(tokenId)) {
    trackFailedTrade("other");
    return res.status(503).json({ error: "This token is temporarily frozen" });
  }
  if (!canTrade()) {
    trackFailedTrade("other");
    return res.status(503).json({ error: "System is in lockdown mode, trading disabled" });
  }
  if (shouldThrottle("SELL")) {
    return res.status(429).json({ error: "System under load, please retry" });
  }

  const rl = smartRateLimit(userId, "trade", { tokenId, tokensToSell });
  if (rl.limited) {
    trackFailedTrade("other");
    return res.status(429).json({ error: "Rate limited: " + rl.reason, retryAfterMs: rl.retryAfterMs });
  }
  const loopCheck = detectTradingLoop(userId, "sell");
  if (loopCheck.looping) {
    trackFailedTrade("other");
    return res.status(429).json({ error: "Rapid buy/sell loop detected, please slow down" });
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

      if (userId === token.creator_id) {
        const elapsed = Date.now() - new Date(token.created_at).getTime();
        const lockMs = CREATOR_LOCK_HOURS * 3600000;
        if (elapsed < lockMs) {
          const hoursLeft = Math.ceil((lockMs - elapsed) / 3600000);
          return res.status(403).json({ error: `Creator locked for ${hoursLeft} more hours` });
        }
      }

      const { data: holding } = await supabase
        .from("holdings")
        .select("amount, avg_buy_price")
        .eq("user_id", userId)
        .eq("token_id", tokenId)
        .maybeSingle();

      const heldAmount = Number(holding?.amount ?? 0);
      if (heldAmount < tokensToSell) {
        return res.status(400).json({ error: `Insufficient balance: have ${heldAmount}, selling ${tokensToSell}` });
      }

      const supply = Number(token.circulating_supply ?? 0);
      if (tokensToSell > supply) {
        return res.status(400).json({ error: "Cannot sell more than circulating supply" });
      }

      const treasuryBal = Number(token.treasury_balance ?? 0);
      const {
        wldReceived, fee, slippageAmt, totalFees,
        curveReturn, newSupply, newPrice,
      } = solveSell(tokensToSell, supply, treasuryBal);

      if (wldReceived <= 0) {
        return res.status(400).json({ error: "Sell amount too small" });
      }

      const totalWldInCurve = Number(token.total_wld_in_curve ?? 0);
      if (curveReturn > totalWldInCurve) {
        return res.status(400).json({ error: "Insufficient liquidity in curve" });
      }

      const newPriceUsd = newPrice * wldUsd;
      const newTotalWld = totalWldInCurve - curveReturn;
      const newTreasury = Number(token.treasury_balance ?? 0) + totalFees;
      const cp = curvePercent(newTotalWld);

      const { data: updated, error: updateErr } = await supabase
        .from("tokens")
        .update({
          circulating_supply: newSupply,
          price_wld: newPrice,
          price_usdc: newPriceUsd,
          total_wld_in_curve: newTotalWld,
          treasury_balance: newTreasury,
          curve_percent: cp,
          market_cap: newSupply * newPriceUsd,
          volume_24h: Number(token.volume_24h ?? 0) + wldReceived * wldUsd,
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

      const newAmount = heldAmount - tokensToSell;
      const avgBuyPrice = Number(holding?.avg_buy_price ?? 0);

      if (newAmount > 0) {
        const { data: hUpd } = await supabase.from("holdings")
          .update({
            amount: newAmount,
            current_price: newPrice,
            value: newAmount * newPrice,
            pnl: (newPrice - avgBuyPrice) * newAmount,
            pnl_percent: avgBuyPrice > 0 ? ((newPrice - avgBuyPrice) / avgBuyPrice) * 100 : 0,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("token_id", tokenId)
          .eq("amount", heldAmount)
          .select("user_id")
          .maybeSingle();

        if (!hUpd) {
          await supabase.from("tokens").update({
            circulating_supply: supply, price_wld: Number(token.price_wld),
            price_usdc: Number(token.price_usdc), total_wld_in_curve: Number(token.total_wld_in_curve),
            treasury_balance: Number(token.treasury_balance), curve_percent: Number(token.curve_percent),
            market_cap: Number(token.market_cap), volume_24h: Number(token.volume_24h),
          }).eq("id", tokenId).eq("circulating_supply", newSupply);
          if (attempt < MAX_RETRIES - 1) continue;
          return res.status(409).json({ error: "Concurrent holdings update, please retry" });
        }
      } else {
        const { data: hDel } = await supabase.from("holdings")
          .delete()
          .eq("user_id", userId)
          .eq("token_id", tokenId)
          .eq("amount", heldAmount)
          .select("user_id")
          .maybeSingle();

        if (!hDel) {
          await supabase.from("tokens").update({
            circulating_supply: supply, price_wld: Number(token.price_wld),
            price_usdc: Number(token.price_usdc), total_wld_in_curve: Number(token.total_wld_in_curve),
            treasury_balance: Number(token.treasury_balance), curve_percent: Number(token.curve_percent),
            market_cap: Number(token.market_cap), volume_24h: Number(token.volume_24h),
          }).eq("id", tokenId).eq("circulating_supply", newSupply);
          if (attempt < MAX_RETRIES - 1) continue;
          return res.status(409).json({ error: "Concurrent holdings update, please retry" });
        }
        await supabase.rpc("decrement_holders", { tid: tokenId });
      }

      const { error: balErr } = await supabase.rpc("credit_balance", {
        p_user_id: userId,
        p_amount: wldReceived,
      });
      if (balErr) {
        console.error("[SELL] credit_balance RPC failed, retrying:", balErr.message);
        const { error: retryErr } = await supabase.rpc("credit_balance", { p_user_id: userId, p_amount: wldReceived });
        if (retryErr) {
          console.error("[SELL] credit_balance retry also failed:", retryErr.message);
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      await supabase.from("token_activity").insert({
        type: "sell",
        user_id: userId,
        username: profile?.username ?? "anon",
        token_id: tokenId,
        token_symbol: token.symbol,
        amount: tokensToSell,
        price: newPrice,
        total: wldReceived,
        timestamp: new Date().toISOString(),
      });

      await supabase.rpc("log_audit", { p_event: "token_sell", p_user: userId, p_details: JSON.stringify({ tokenId, tokensToSell, heldAmount, wldReceived }) });

      const elapsed = Date.now() - t0;
      trackRequest(elapsed);
      trackTrade(wldReceived, "sell", fee);
      supabase.from("admin_logs").insert({ category: "activity", event: "token_sell", severity: "info", user_id: userId, endpoint: "/api/sell", latency_ms: elapsed, details: { tokenId, tokenSymbol: token.symbol, tokensToSell, wldReceived, fee, newPrice } }).catch(() => {});

      return res.status(200).json({
        success: true,
        wldReceived,
        fee,
        slippage: slippageAmt,
        grossWld: curveReturn,
        avgPrice: tokensToSell > 0 ? wldReceived / tokensToSell : 0,
        newPrice,
        newPriceUsd,
        newSupply,
        curvePercent: cp,
        message: `Sold ${tokensToSell.toLocaleString()} ${token.symbol} for ${wldReceived.toFixed(6)} WLD`,
      });
    } catch (err) {
      const elapsed = Date.now() - t0;
      trackRequest(elapsed, true);
      trackFailedTrade("other");
      console.error(`[SELL attempt=${attempt}]`, err.message);
      if (attempt >= MAX_RETRIES - 1) {
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
