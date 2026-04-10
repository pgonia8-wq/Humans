import { supabase } from "./_supabase.mjs";

  export async function createTicket({ orderId, type, userId, username, tokenId, tokenSymbol, amountWld, direction, description, metadata }) {
    const { data, error } = await supabase
      .from("ledger")
      .insert({
        order_id: orderId || null,
        type,
        user_id: userId,
        username: username || "anon",
        token_id: tokenId || null,
        token_symbol: tokenSymbol || "",
        amount_wld: amountWld,
        direction,
        description,
        metadata: metadata || {},
      })
      .select("id")
      .single();

    if (error) console.error("[LEDGER]", error.message);
    return data?.id || null;
  }

  export async function createBuyTickets({ orderId, userId, username, tokenId, tokenSymbol, amountWld, fee, netWld, tokensOut, newPrice }) {
    const tickets = [
      {
        order_id: orderId, type: "buy_payment", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: amountWld,
        direction: "in", description: `User paid ${amountWld} WLD to buy ${tokenSymbol}`,
        metadata: { tokens_received: tokensOut },
      },
      {
        order_id: orderId, type: "buy_fee", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: fee,
        direction: "in", description: `Buy fee 2% → treasury`,
        metadata: { fee_percent: 0.02 },
      },
      {
        order_id: orderId, type: "buy_curve_deposit", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: netWld,
        direction: "in", description: `${netWld.toFixed(6)} WLD deposited into bonding curve`,
        metadata: { tokens_out: tokensOut, price_after: newPrice },
      },
    ];

    const { error } = await supabase.from("ledger").insert(tickets);
    if (error) console.error("[LEDGER/BUY]", error.message);
  }

  export async function createSellTickets({ orderId, userId, username, tokenId, tokenSymbol, tokensSold, curveReturn, slippage, fee, wldReceived }) {
    const tickets = [
      {
        order_id: orderId || null, type: "sell_curve_withdraw", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: curveReturn,
        direction: "out", description: `${curveReturn.toFixed(6)} WLD withdrawn from bonding curve`,
        metadata: { tokens_sold: tokensSold },
      },
      {
        order_id: orderId || null, type: "sell_slippage", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: slippage,
        direction: "in", description: `Sell slippage ${curveReturn > 0 ? ((slippage / curveReturn) * 100).toFixed(1) : "0"}% → treasury`,
        metadata: { slippage_percent: curveReturn > 0 ? slippage / curveReturn : 0 },
      },
      {
        order_id: orderId || null, type: "sell_fee", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: fee,
        direction: "in", description: `Sell fee 3% → treasury`,
        metadata: { fee_percent: 0.03 },
      },
      {
        order_id: orderId || null, type: "sell_payout", user_id: userId, username,
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: wldReceived,
        direction: "out", description: `User receives ${wldReceived.toFixed(6)} WLD from selling ${tokensSold} ${tokenSymbol}`,
        metadata: { tokens_sold: tokensSold },
      },
    ];

    const { error } = await supabase.from("ledger").insert(tickets);
    if (error) console.error("[LEDGER/SELL]", error.message);
  }

  export async function createGraduationTickets({ tokenId, tokenSymbol, totalWld, toPool, toTreasury, finalPrice }) {
    const tickets = [
      {
        type: "graduation_pool", user_id: "system", username: "system",
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: toPool,
        direction: "out", description: `70% graduation liquidity → DEX pool`,
        metadata: { final_price: finalPrice, total_wld: totalWld },
      },
      {
        type: "graduation_treasury", user_id: "system", username: "system",
        token_id: tokenId, token_symbol: tokenSymbol, amount_wld: toTreasury,
        direction: "in", description: `30% graduation → treasury`,
        metadata: { final_price: finalPrice, total_wld: totalWld },
      },
    ];

    const { error } = await supabase.from("ledger").insert(tickets);
    if (error) console.error("[LEDGER/GRADUATION]", error.message);
  }
  