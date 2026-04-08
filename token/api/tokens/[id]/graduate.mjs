import { supabase, cors } from "../../_supabase.mjs";
import {
  checkGraduation, graduationSplit, spotPrice,
  GRADUATION_WLD, GRADUATION_HOLDERS,
} from "../../_curve.mjs";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const tokenId = req.query.id;
  if (!tokenId) return res.status(400).json({ error: "Missing tokenId" });

  try {
    const { data: token, error: tErr } = await supabase
      .from("tokens")
      .select("*")
      .eq("id", tokenId)
      .single();
    if (tErr || !token) return res.status(404).json({ error: "Token not found" });
    if (token.graduated) return res.status(400).json({ error: "Already graduated" });

    const totalWld = Number(token.total_wld_in_curve ?? 0);
    const holders  = Number(token.holders ?? 0);

    const supply = Number(token.circulating_supply ?? 0);
    if (!checkGraduation(totalWld, holders, supply)) {
      return res.status(400).json({
        error: "Graduation conditions not met",
        wldProgress: `${totalWld.toFixed(2)}/${GRADUATION_WLD}`,
        holdersProgress: `${holders}/${GRADUATION_HOLDERS}`,
        wldPercent: Math.min(100, (totalWld / GRADUATION_WLD) * 100),
        holdersPercent: Math.min(100, (holders / GRADUATION_HOLDERS) * 100),
      });
    }

    const { toPool, toTreasury } = graduationSplit(totalWld);
    const finalPrice = Number(token.price_wld ?? 0);

    const { data: updated, error: updateErr } = await supabase
      .from("tokens")
      .update({
        graduated: true,
        graduated_at: new Date().toISOString(),
        graduation_pool_wld: toPool,
        graduation_treasury_wld: toTreasury,
        curve_percent: 100,
      })
      .eq("id", tokenId)
      .eq("graduated", false)
      .select("id")
      .maybeSingle();

    if (updateErr) throw updateErr;
    if (!updated) return res.status(409).json({ error: "Already graduated (concurrent)" });

    await supabase.from("token_activity").insert({
      type: "graduate",
      user_id: "system",
      username: "system",
      token_id: tokenId,
      token_symbol: token.symbol,
      amount: totalWld,
      price: finalPrice,
      total: totalWld,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      graduated: true,
      totalLiquidity: totalWld,
      toPool,
      toTreasury,
      finalPrice,
      finalPriceUsd: finalPrice * 3.0,
      holders,
      message: `${token.symbol} graduated! ${toPool.toFixed(2)} WLD → DEX pool, ${toTreasury.toFixed(2)} WLD → treasury.`,
    });
  } catch (err) {
    console.error("[GRADUATE]", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
