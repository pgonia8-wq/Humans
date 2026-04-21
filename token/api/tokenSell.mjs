import { supabase, cors } from "./_supabase.mjs";
  import { requireOrb } from "./_orbGuard.mjs";
  import { recordPriceSnapshot } from "./_snapshot.mjs";
  import { createSellTickets } from "./_ledger.mjs";
  import {
    solveSell, curvePercent, spotPrice, getWldUsdRate,
    CREATOR_LOCK_HOURS, MAX_RETRIES,
  } from "./_curve.mjs";
  import { trackRequest, trackTrade, trackOccConflict, trackPartialPayout, trackFailedTrade, triggerAlert, isTradingPaused, isTokenFrozen } from "../../api/_metrics.mjs";
  import { canTrade, shouldThrottle } from "../../api/_infra.mjs";
  import { smartRateLimit, detectTradingLoop } from "../../api/lib/rateLimiter.adapter.mjs";
  import { createTrace, startSpan, endSpan, failSpan, finishTrace, log, SPANS, LOG_TYPES } from "../../api/_tracer.mjs";

  export default async function handler(req, res) {
    const t0 = Date.now();
    const reqId = Math.random().toString(36).slice(2, 10);
    cors(res, req);
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

    const tokenId = req.query.id;
    const body = req.body ?? {};
    const tokensToSell = body.tokensToSell || body.tokens_to_sell;
    const userId = body.userId || body.user_id;

    const trace = createTrace("/api/tokenSell", userId);
    const reqSpan = startSpan(trace, SPANS.REQUEST_START);

    console.log(JSON.stringify({ op: "SELL_START", reqId, traceId: trace.traceId, tokenId, tokensToSell, userId, ts: new Date().toISOString() }));
    if (!tokenId || !tokensToSell || !userId) {
      endSpan(reqSpan, { reason: "missing_params" });
      finishTrace(trace, "error");
      log(trace, SPANS.REQUEST_START, LOG_TYPES.ERROR, "400", { reason: "missing_params" });
      return res.status(400).json({ error: "Missing tokenId, tokensToSell, userId" });
    }
    if (tokensToSell <= 0) {
      endSpan(reqSpan, { reason: "invalid_amount" });
      finishTrace(trace, "error");
      return res.status(400).json({ error: "tokensToSell must be positive" });
    }

    if (isTradingPaused()) {
      trackFailedTrade("other");
      finishTrace(trace, "blocked");
      log(trace, SPANS.REQUEST_START, LOG_TYPES.TRADE, "503", { reason: "trading_paused" });
      return res.status(503).json({ error: "Trading is temporarily paused" });
    }
    if (isTokenFrozen(tokenId)) {
      trackFailedTrade("other");
      finishTrace(trace, "blocked");
      log(trace, SPANS.REQUEST_START, LOG_TYPES.TRADE, "503", { reason: "token_frozen", tokenId });
      return res.status(503).json({ error: "This token is temporarily frozen" });
    }
    if (!canTrade()) {
      trackFailedTrade("other");
      finishTrace(trace, "blocked");
      log(trace, SPANS.REQUEST_START, LOG_TYPES.INFRA, "503", { reason: "system_lockdown" });
      return res.status(503).json({ error: "System is in lockdown mode, trading disabled" });
    }
    if (shouldThrottle("SELL")) {
      finishTrace(trace, "throttled");
      return res.status(429).json({ error: "System under load, please retry" });
    }

    const rl = smartRateLimit(userId, "trade", { tokenId, tokensToSell });
    if (rl.limited) {
      trackFailedTrade("other");
      finishTrace(trace, "rate_limited");
      log(trace, SPANS.RATE_LIMIT_CHECK, LOG_TYPES.RATE_LIMIT, "429", { reason: rl.reason, userId });
      return res.status(429).json({ error: "Rate limited: " + rl.reason, retryAfterMs: rl.retryAfterMs });
    }
    const loopCheck = detectTradingLoop(userId, "sell");
    if (loopCheck.looping) {
      trackFailedTrade("other");
      finishTrace(trace, "rate_limited");
      log(trace, SPANS.RATE_LIMIT_CHECK, LOG_TYPES.RATE_LIMIT, "429", { reason: loopCheck.reason, userId });
      return res.status(429).json({ error: "Rapid buy/sell loop detected, please slow down" });
    }

    const authSpan = startSpan(trace, SPANS.AUTH_CHECK);
    const orbOk = await requireOrb(userId, res);
    if (!orbOk) {
      failSpan(authSpan, "orb_check_failed");
      finishTrace(trace, "auth_failed");
      return;
    }
    endSpan(authSpan);

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
            return res.status(403).json({ error: "Creator locked for " + hoursLeft + " more hours" });
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
          return res.status(400).json({ error: "Insufficient balance: have " + heldAmount + ", selling " + tokensToSell });
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

        const { data: prof } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .maybeSingle();
        const username = prof?.username ?? "anon";

        if (newAmount > 0) {
          const { data: hUpd } = await supabase.from("holdings")
            .update({
              amount: newAmount, current_price: newPrice,
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
            }).eq("id", tokenId).eq("circulating_supply", supply);
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
            }).eq("id", tokenId).eq("circulating_supply", supply);
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

        await supabase.from("token_activity").insert({
          type: "sell", user_id: userId, username,
          token_id: tokenId, token_symbol: token.symbol,
          amount: tokensToSell, price: newPrice, total: wldReceived,
          timestamp: new Date().toISOString(),
        });

        await recordPriceSnapshot(tokenId, newPrice, newPriceUsd, newSupply, wldReceived * wldUsd, "sell");

        await createSellTickets({
          orderId: null, userId, username,
          tokenId, tokenSymbol: token.symbol,
          tokensSold: tokensToSell,
          curveReturn, slippage: slippageAmt,
          fee, wldReceived,
        });

        await supabase.rpc("log_audit", { p_event: "token_sell", p_user: userId, p_details: JSON.stringify({ tokenId, tokensToSell, heldAmount, wldReceived }) });

      const elapsed = Date.now() - t0;
      trackRequest(elapsed); trackTrade(wldReceived, "sell", fee);
      if (elapsed > 500) triggerAlert("SLOW_SELL", { reqId, elapsed });
      finishTrace(trace, "ok");
      log(trace, SPANS.RESPONSE, LOG_TYPES.TRADE, "200", { tokenId, tokensToSell, wldReceived, fee, newPrice, elapsed });
      console.log(JSON.stringify({ op: "SELL_OK", reqId, traceId: trace.traceId, tokenId, userId, tokensToSell, wldReceived, fee, newPrice, newSupply, elapsed_ms: elapsed }));
      supabase.from("admin_logs").insert({ category: "activity", event: "token_sell", severity: "info", user_id: userId, username, endpoint: "/api/tokenSell", latency_ms: elapsed, details: { tokenId, tokenSymbol: token.symbol, tokensToSell, wldReceived, fee, newPrice, reqId, traceId: trace.traceId } }).catch(() => {});
      return res.status(200).json({
          success: true,
          wldReceived, fee,
          slippage: slippageAmt,
          grossWld: curveReturn,
          avgPrice: tokensToSell > 0 ? wldReceived / tokensToSell : 0,
          newPrice, newPriceUsd, newSupply,
          curvePercent: cp,
          message: "Sold " + tokensToSell.toLocaleString() + " " + token.symbol + " for " + wldReceived.toFixed(6) + " WLD",
        });
      } catch (err) {
        const elapsed = Date.now() - t0;
        trackRequest(elapsed, true);
        trackFailedTrade("other");
        if (err.message?.includes("concurrent") || err.message?.includes("OCC")) trackOccConflict();
        finishTrace(trace, "error");
        log(trace, SPANS.WRITE_OPERATION, LOG_TYPES.ERROR, "500", { tokenId, attempt, error: err.message, elapsed });
        console.error(JSON.stringify({ op: "SELL_ERR", reqId, traceId: trace.traceId, tokenId, userId, attempt, error: err.message, elapsed_ms: elapsed }));
        supabase.from("admin_logs").insert({ category: "error", event: "sell_error", severity: attempt >= MAX_RETRIES - 1 ? "error" : "warning", user_id: userId, endpoint: "/api/tokenSell", latency_ms: elapsed, details: { tokenId, attempt, error: err.message, reqId, traceId: trace.traceId } }).catch(() => {});
        if (attempt >= MAX_RETRIES - 1) {
          return res.status(500).json({ error: "Internal server error" });
        }
      }
    }
  }
  