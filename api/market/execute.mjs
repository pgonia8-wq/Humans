/**
 * execute.mjs — Verificador / Indexador de trades
 *
 * MODO DEV (BONDING_CURVE_ADDRESS no configurada):
 *   - NO llama a ningún RPC ni blockchain
 *   - Valida estructura de inputs
 *   - Anti-replay via tx_hash UNIQUE en DB
 *   - Guarda trade usando los estimados del preview
 *   - Actualiza métricas de caché del Totem
 *
 * MODO PRODUCCIÓN (BONDING_CURVE_ADDRESS configurada):
 *   - Obtiene receipt de World Chain
 *   - Valida: confirmado + to=BondingCurve + evento correcto
 *   - Decodifica Buy(totem, user, wldIn, tokensOut) / Sell(totem, user, tokensIn, wldOut)
 *   - Anti-replay via tx_hash UNIQUE
 *   - Persiste valores REALES del evento (no los estimados del frontend)
 *
 * ACTIVAR PRODUCCIÓN:
 *   Configura: BONDING_CURVE_ADDRESS=0x...
 *   Opcionalmente: WORLD_CHAIN_RPC=https://...
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Feature flag: producción sólo cuando hay contrato configurado ─────────────
const BONDING_CURVE_ADDR = (process.env.BONDING_CURVE_ADDRESS || "").toLowerCase().trim();
const IS_PRODUCTION      = BONDING_CURVE_ADDR.length === 42 && BONDING_CURVE_ADDR.startsWith("0x");

// ── World Chain RPC (solo producción) ─────────────────────────────────────────
const WORLD_CHAIN_RPC = process.env.WORLD_CHAIN_RPC
  || "https://worldchain-mainnet.g.alchemy.com/public";

// ── Curva: helper para precio estimado (cache UI, no fuente de verdad) ────────
// dV(s) = INITIAL_PRICE_WEI + CURVE_K * s² / SCALE
const INITIAL_PRICE_WEI = 5.5e8;
const CURVE_K           = 235;
const SCALE             = 1e20;

function estimatePriceFromSupply(supply) {
  const s   = supply;
  const dV  = INITIAL_PRICE_WEI + (CURVE_K * s * s) / SCALE;
  return dV / 1e18;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const {
    txHash, type, totemAddress, userId, walletAddress,
    // Estimados del preview (requeridos en modo dev, advisory en producción)
    estimatedWld, estimatedTokens,
  } = req.body ?? {};

  // ── 1. Validación de inputs ────────────────────────────────────────────────
  if (!txHash || typeof txHash !== "string" || txHash.length < 8) {
    return res.status(400).json({ error: "txHash inválido" });
  }
  if (!["buy", "sell"].includes(type)) {
    return res.status(400).json({ error: "type debe ser 'buy' o 'sell'" });
  }
  if (!totemAddress || !/^0x[0-9a-fA-F]{40}$/.test(totemAddress)) {
    return res.status(400).json({ error: "totemAddress inválido" });
  }
  if (!userId) {
    return res.status(400).json({ error: "userId requerido" });
  }
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: "walletAddress inválido" });
  }

  const totemLower = totemAddress.toLowerCase();

  // ── 2. Leer estado actual del totem (necesario en ambos modos) ────────────
  const { data: totem } = await supabase
    .from("totems")
    .select("supply, price, volume_24h, score")
    .eq("address", totemLower)
    .single();

  if (!totem) {
    return res.status(404).json({ error: "Totem no encontrado en DB" });
  }

  // ── 3. Obtener wldAmount y tokenAmount según modo ─────────────────────────
  let wldAmount, tokenAmount;

  if (IS_PRODUCTION) {
    // ── MODO PRODUCCIÓN: verificar on-chain ───────────────────────────────
    const onChainResult = await verifyOnChain(txHash, type, totemLower, walletAddress.toLowerCase());
    if (onChainResult.error) {
      return res.status(onChainResult.status ?? 400).json({ error: onChainResult.error });
    }
    wldAmount   = onChainResult.wldAmount;
    tokenAmount = onChainResult.tokenAmount;

  } else {
    // ── MODO DEV/SIMULACIÓN: usar estimados del frontend ──────────────────

    // C1: El hash DEV debe tener prefijo explícito — rechaza hashes reales
    if (!txHash.startsWith("0xdev")) {
      return res.status(400).json({
        error: "En modo simulación el txHash debe empezar con '0xdev'",
        hint:  "En producción configura BONDING_CURVE_ADDRESS=0x...",
      });
    }

    // C2: Validación mínima — no se acepta basura en la DB
    if (!userId || !totemAddress) {
      return res.status(400).json({ error: "userId y totemAddress son requeridos" });
    }
    if (!["buy", "sell"].includes(type)) {
      return res.status(400).json({ error: "type debe ser 'buy' o 'sell'" });
    }
    const _wld    = Number(estimatedWld);
    const _tokens = Number(estimatedTokens);
    if (!Number.isFinite(_wld) || _wld <= 0) {
      return res.status(400).json({ error: "estimatedWld debe ser un número positivo" });
    }
    if (!Number.isFinite(_tokens) || _tokens <= 0) {
      return res.status(400).json({ error: "estimatedTokens debe ser un número positivo" });
    }

    wldAmount   = _wld;
    tokenAmount = Math.floor(_tokens);
  }

  // ── 4. Anti-replay: tx_hash UNIQUE ────────────────────────────────────────
  const { error: insertErr } = await supabase.from("trades").insert({
    user:      userId,
    totem:     totemLower,
    type,
    amount:    wldAmount,
    tokens:    tokenAmount,
    tx_hash:   txHash.toLowerCase(),
    timestamp: new Date().toISOString(),
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return res.status(409).json({ error: "Esta transacción ya fue procesada (anti-replay)" });
    }
    return res.status(500).json({ error: "Error al guardar trade", detail: insertErr.message });
  }

  // ── 5. Actualizar métricas de caché del Totem ─────────────────────────────
  const newSupply = type === "buy"
    ? (totem.supply ?? 0) + tokenAmount
    : Math.max(0, (totem.supply ?? 0) - tokenAmount);

  const newPrice     = estimatePriceFromSupply(newSupply);
  const newVolume24h = (totem.volume_24h ?? 0) + wldAmount;

  await supabase.from("totems").update({
    supply:     newSupply,
    price:      newPrice,
    volume_24h: newVolume24h,
  }).eq("address", totemLower);

  // ── 6. Snapshot de precio para chart ──────────────────────────────────────
  await supabase.from("totem_history").insert({
    totem: totemLower,
    price: newPrice,
    score: totem.score ?? 0,
  });

  return res.status(200).json({
    ok:           true,
    mode:         IS_PRODUCTION ? "production" : "simulation",
    type,
    wldAmount,
    tokenAmount,
    newPrice,
    newSupply,
    txHash,
  });
}

// ── Verificación on-chain (solo producción) ───────────────────────────────────
async function verifyOnChain(txHash, type, totemLower, walletLower) {
  let ethers;
  try {
    ethers = await import("ethers");
  } catch {
    return { error: "ethers no disponible en el servidor", status: 500 };
  }

  // Validar formato txHash (producción requiere hash real)
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { error: "txHash inválido para producción (debe ser 0x + 64 hex)" };
  }

  const BUY_TOPIC  = ethers.id("Buy(address,address,uint256,uint256)");
  const SELL_TOPIC = ethers.id("Sell(address,address,uint256,uint256)");
  const coder      = ethers.AbiCoder.defaultAbiCoder();

  const provider = new ethers.JsonRpcProvider(WORLD_CHAIN_RPC);

  // Obtener receipt con reintentos
  let receipt;
  for (let i = 0; i < 6; i++) {
    try {
      receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) break;
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      return { error: "Error al consultar World Chain: " + err.message, status: 502 };
    }
  }
  if (!receipt) return { error: "Transacción no encontrada o aún pendiente", status: 404 };
  if (receipt.status !== 1) return { error: "La transacción falló on-chain (status=0)" };

  // Buscar evento Buy o Sell emitido por el contrato BondingCurve
  const expectedTopic = type === "buy" ? BUY_TOPIC : SELL_TOPIC;
  const eventLog = receipt.logs?.find(
    l => l.address.toLowerCase() === BONDING_CURVE_ADDR && l.topics[0] === expectedTopic
  );
  if (!eventLog) {
    return {
      error: `No se encontró evento ${type === "buy" ? "Buy" : "Sell"} del contrato BondingCurve`,
    };
  }

  // Validar totem y user del evento (topics indexados)
  const eventTotem = "0x" + eventLog.topics[1].slice(26).toLowerCase();
  const eventUser  = "0x" + eventLog.topics[2].slice(26).toLowerCase();
  if (eventTotem !== totemLower) return { error: "Totem del evento no coincide" };
  if (eventUser  !== walletLower) return { error: "Usuario del evento no coincide" };

  // Decodificar valores del evento
  try {
    let wldAmount, tokenAmount;
    if (type === "buy") {
      const [wldIn, tokensOut] = coder.decode(["uint256", "uint256"], eventLog.data);
      wldAmount   = Number(ethers.formatUnits(wldIn, 18));
      tokenAmount = Number(tokensOut);
    } else {
      const [tokensIn, wldOut] = coder.decode(["uint256", "uint256"], eventLog.data);
      tokenAmount = Number(tokensIn);
      wldAmount   = Number(ethers.formatUnits(wldOut, 18));
    }
    if (wldAmount <= 0 || tokenAmount <= 0) {
      return { error: "Valores del evento incoherentes (≤ 0)" };
    }
    return { wldAmount, tokenAmount };
  } catch (err) {
    return { error: "No se pudo decodificar el evento: " + err.message };
  }
}
