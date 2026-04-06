import { supabase } from "./_supabase.mjs";

export async function recordPriceSnapshot(tokenId, priceWld, priceUsdc, supply, volume, type) {
  try {
    await supabase.from("price_snapshots").insert({
      token_id: tokenId,
      price_wld: priceWld,
      price_usdc: priceUsdc,
      supply: supply ?? 0,
      volume: volume ?? 0,
      type: type ?? "trade",
      created_at: new Date().toISOString(),
    });

    await supabase.rpc("update_24h_change", { tid: tokenId }).catch(() => {});
    await supabase.rpc("update_buy_pressure", { tid: tokenId }).catch(() => {});
  } catch (err) {
    console.error("[SNAPSHOT]", err.message);
  }
}
