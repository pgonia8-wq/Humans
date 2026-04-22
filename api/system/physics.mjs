/**
 * GET /api/system/physics
 *
 * Métricas agregadas DERIVADAS de datos reales (totems / trades / totem_history).
 * Toda matemática es determinista, BigInt-safe en lo posible y cero invención:
 * si una fuente no tiene datos suficientes, el campo viaja con `available:false`
 * para que el frontend lo oculte (Ley P1 estricta).
 *
 * Respuesta:
 *   {
 *     fetchedAt:        <unix sec>,
 *     totalTotems:      number,
 *     totalVolume:      number,           // suma volume_24h de la tabla totems
 *     avgPrice:         number,           // promedio aritmético precio
 *     topTotem:         TotemProfile|null,
 *     curvePressureBps: { value:number, available:boolean, windowSec:number },
 *     buyMomentumBps:   { value:number, available:boolean, windowSec:number },
 *     priceDriftAvg:   { value:number, available:boolean, windowSec:number },
 *     volatilityBps:    { value:number, available:boolean, windowSec:number },
 *     systemBias:       "BULL" | "NEUTRAL" | "BEAR",
 *     oracleStatus:     { state:"FRESH"|"STALE"|"UNKNOWN", lastSignedAgeSec:number|null },
 *     networkStatus:    { state:"OK"|"DEGRADED" }
 *   }
 *
 * Responde SIEMPRE 200 con JSON válido. Errores internos van al log.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

const WINDOW_HOUR_SEC = 3600;
const WINDOW_DAY_SEC  = 86_400;

// Umbrales de bias (bps de presión neta sobre WLD movido en la ventana)
const BIAS_BULL_BPS = 1500;   // > +15% → bull
const BIAS_BEAR_BPS = -1500;  // < −15% → bear

// Antigüedad máxima admitida para considerar el oracle "FRESH"
const ORACLE_FRESH_MAX_AGE_SEC = 5 * 60;

export default async function handler(_req, res) {
  const nowSec = Math.floor(Date.now() / 1000);
  try {
    // ── 1. Lista actual de tótems (necesaria para totals + bias por totem)
    const { data: totems, error: tErr } = await supabase
      .from("totems")
      .select("address, name, score, influence, level, badge, price, supply, volume_24h, created_at");
    if (tErr) throw tErr;

    const list = (totems ?? []).map((t) => ({
      address:    t.address,
      name:       t.name        ?? "",
      score:      Number(t.score      ?? 0),
      influence:  Number(t.influence  ?? 0),
      level:      Number(t.level      ?? 1),
      badge:      t.badge       ?? "",
      price:      Number(t.price      ?? 0),
      supply:     Number(t.supply     ?? 0),
      volume_24h: Number(t.volume_24h ?? 0),
      created_at: t.created_at  ?? new Date().toISOString(),
    }));

    const totalTotems = list.length;
    const totalVolume = list.reduce((s, t) => s + t.volume_24h, 0);
    const avgPrice    = totalTotems > 0
      ? list.reduce((s, t) => s + t.price, 0) / totalTotems
      : 0;
    const topTotem    = totalTotems > 0
      ? list.slice().sort((a, b) => b.volume_24h - a.volume_24h)[0]
      : null;

    // ── 2. Trades última hora → curvePressure + buyMomentum
    const sinceHourIso = new Date(Date.now() - WINDOW_HOUR_SEC * 1000).toISOString();
    const { data: tradesH } = await supabase
      .from("trades")
      .select("type, wld, tokens, timestamp")
      .gte("timestamp", sinceHourIso);

    const tradesHourList = tradesH ?? [];
    const totalTrades    = tradesHourList.length;

    let buyWld = 0, sellWld = 0, buyCount = 0;
    for (const t of tradesHourList) {
      const w = Number(t.wld ?? 0);
      if (t.type === "buy")  { buyWld  += w; buyCount += 1; }
      if (t.type === "sell") { sellWld += w; }
    }
    const wldMoved = buyWld + sellWld;

    const curvePressureBps = wldMoved > 0
      ? { value: Math.round(((buyWld - sellWld) / wldMoved) * 10_000), available: true,  windowSec: WINDOW_HOUR_SEC }
      : { value: 0,                                                     available: false, windowSec: WINDOW_HOUR_SEC };

    const buyMomentumBps = totalTrades > 0
      ? { value: Math.round((buyCount / totalTrades) * 10_000), available: true,  windowSec: WINDOW_HOUR_SEC }
      : { value: 0,                                              available: false, windowSec: WINDOW_HOUR_SEC };

    // ── 3. Supply velocity (24h) → diff de supply usando totem_history
    //    Para cada tótem, comparamos el último registro vs el más antiguo dentro
    //    de la ventana 24h. Promediamos. Si no hay datos, available:false.
    let priceDriftAvg = { value: 0, available: false, windowSec: WINDOW_DAY_SEC };
    let volatilityBps  = { value: 0, available: false, windowSec: WINDOW_DAY_SEC };

    if (totalTotems > 0) {
      const sinceDayIso = new Date(Date.now() - WINDOW_DAY_SEC * 1000).toISOString();
      const { data: hist } = await supabase
        .from("totem_history")
        .select("totem, price, timestamp")
        .gte("timestamp", sinceDayIso)
        .order("timestamp", { ascending: true });

      if (Array.isArray(hist) && hist.length > 1) {
        // Agrupar por totem
        const byTotem = new Map();
        for (const h of hist) {
          if (!byTotem.has(h.totem)) byTotem.set(h.totem, []);
          byTotem.get(h.totem).push(h);
        }

        // priceDriftAvg: media de (priceLast - priceFirst) (proxy si supply no
        // está en totem_history). Marcamos campo aparte para no confundir.
        const deltas = [];
        const logReturns = [];
        for (const arr of byTotem.values()) {
          if (arr.length < 2) continue;
          const first = arr[0];
          const last  = arr[arr.length - 1];
          const dp = Number(last.price ?? 0) - Number(first.price ?? 0);
          deltas.push(dp);
          // log returns (para volatilidad — desviación estándar)
          for (let i = 1; i < arr.length; i++) {
            const p0 = Number(arr[i - 1].price ?? 0);
            const p1 = Number(arr[i].price ?? 0);
            if (p0 > 0 && p1 > 0) logReturns.push(Math.log(p1 / p0));
          }
        }

        if (deltas.length > 0) {
          const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
          priceDriftAvg = { value: avgDelta, available: true, windowSec: WINDOW_DAY_SEC };
        }
        if (logReturns.length > 1) {
          const mean = logReturns.reduce((s, x) => s + x, 0) / logReturns.length;
          const varc = logReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / logReturns.length;
          const stddev = Math.sqrt(varc);
          // Stddev en bps (×10000). Cap a 10000.
          volatilityBps = { value: Math.min(10_000, Math.round(stddev * 10_000)), available: true, windowSec: WINDOW_DAY_SEC };
        }
      }
    }

    // ── 4. systemBias derivado de curvePressure
    let systemBias = "NEUTRAL";
    if (curvePressureBps.available) {
      if (curvePressureBps.value >  BIAS_BULL_BPS) systemBias = "BULL";
      if (curvePressureBps.value <  BIAS_BEAR_BPS) systemBias = "BEAR";
    }

    // ── 5. Oracle status: usa max(score signedAt) del set de tótems si existe.
    //    Como no almacenamos signedAt en `totems`, lo aproximamos desde
    //    totem_history (último timestamp = última observación oracle indirecta).
    let oracleStatus = { state: "UNKNOWN", lastSignedAgeSec: null };
    try {
      const { data: lastH } = await supabase
        .from("totem_history")
        .select("timestamp")
        .order("timestamp", { ascending: false })
        .limit(1);
      if (lastH && lastH.length > 0) {
        const ts = Math.floor(new Date(lastH[0].timestamp).getTime() / 1000);
        const age = Math.max(0, nowSec - ts);
        oracleStatus = {
          state: age <= ORACLE_FRESH_MAX_AGE_SEC ? "FRESH" : "STALE",
          lastSignedAgeSec: age,
        };
      }
    } catch (e) {
      console.warn("[/api/system/physics] oracle probe failed:", e?.message);
    }

    // ── 6. Network status: por ahora siempre OK (no hay sensor de infra
    //    accesible aquí). El día que se exponga uno, este campo lo refleja.
    const networkStatus = { state: "OK" };

    return res.status(200).json({
      fetchedAt: nowSec,
      totalTotems,
      totalVolume,
      avgPrice,
      topTotem,
      curvePressureBps,
      buyMomentumBps,
      priceDriftAvg,
      volatilityBps,
      systemBias,
      oracleStatus,
      networkStatus,
    });
  } catch (err) {
    console.error("[/api/system/physics] unhandled:", err);
    // Fallback shape: mantenemos la forma para no romper el frontend.
    return res.status(200).json({
      fetchedAt:        nowSec,
      totalTotems:      0,
      totalVolume:      0,
      avgPrice:         0,
      topTotem:         null,
      curvePressureBps: { value: 0, available: false, windowSec: WINDOW_HOUR_SEC },
      buyMomentumBps:   { value: 0, available: false, windowSec: WINDOW_HOUR_SEC },
      priceDriftAvg:   { value: 0, available: false, windowSec: WINDOW_DAY_SEC  },
      volatilityBps:    { value: 0, available: false, windowSec: WINDOW_DAY_SEC  },
      systemBias:       "NEUTRAL",
      oracleStatus:     { state: "UNKNOWN", lastSignedAgeSec: null },
      networkStatus:    { state: "DEGRADED" },
      error:            err?.message ?? "internal error",
    });
  }
}
