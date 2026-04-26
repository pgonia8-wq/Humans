import { createClient } from "@supabase/supabase-js"
import { ethers } from "ethers"
import { signTotemUpdate } from "../../lib/oracleSigner.mjs" // 👈 Importamos tu archivo intacto

// ==========================================
// CONFIGURACIÓN E INSTANCIAS
// ==========================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Conexión rápida al RPC para leer el nonce directo del contrato (Seguridad Anti-Replay)
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL_WORLDCHAIN)
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS

// ABI mínimo para leer el nonce (verificado según tu oracleSigner.mjs)
const oracleAbi = ["function nonces(address totem) view returns (uint256)"]
const oracleContract = new ethers.Contract(ORACLE_ADDRESS, oracleAbi, provider)

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { totem_address, caller_address } = body

    if (!totem_address || !caller_address) {
      return json({ error: "Missing addresses" }, 400)
    }

    // ==========================================
    // 1. LEER INTELIGENCIA + SOCIAL (SUPABASE)
    // ==========================================
    
    // A) Inteligencia Anti-Bot (Nuestras tablas biométricas)
    const { data: session } = await supabase
      .from("feed_sessions")
      .select("anomaly_score, fingerprint_entropy")
      .eq("user_id", caller_address)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() // maybeSingle evita errores 500 si no hay datos aún

    // B) Reputación Social Real (Tu tabla de usuarios)
    // Buscamos el reputation_score real de World App
    const { data: profile } = await supabase
      .from("profiles")
      .select("reputation_score")
      .eq("wallet_address", caller_address)
      .maybeSingle()

    // ==========================================
    // 2. MATEMÁTICA SEPARADA (Social vs Bot)
    // ==========================================
    
    // --- CÁLCULO DE INFLUENCE (El motor de IA Anti-Bot) ---
    let anomalyScore = session ? session.anomaly_score : 0
    let entropy = session ? session.fingerprint_entropy : 50 // Entropía base humana
    
    const anomalyRatio = Math.min(1, anomalyScore / 10)
    const entropyBonus = Math.min(0.2, entropy / 200)
    
    // Penalización por comportamiento de bot
    const botPenalty = Math.max(0, anomalyRatio - entropyBonus)

    // Rango Influence: 925 - 1075 (El rango de tu Smart Contract)
    // 1000 es el estado neutral. Baja si eres bot.
    const baseInfluence = 1000 - (75 * botPenalty)
    const finalInfluence = Math.max(975, Math.min(1025, Math.floor(baseInfluence)))

    // --- CÁLCULO DE SCORE (Tu Red Social) ---
    // Tomamos el score real de interacciones, likes, tips (Rango 1 - 10000)
    let baseScore = profile ? (profile.reputation_score || 1) : 1
    const finalScore = Math.max(1, Math.min(10000, Math.floor(baseScore)))

    // ==========================================
    // 3. GENERAR FIRMA USANDO TU ARCHIVO
    // ==========================================
    
    // Obtenemos el nonce actual desde la blockchain
    const currentNonce = await oracleContract.nonces(totem_address)
    
    // Válido por 15 mins (evita firmas zombies en el mempool)
    const deadline = Math.floor(Date.now() / 1000) + 900 

    // ⚡ AQUÍ LLAMAMOS A TU CÓDIGO (oracleSigner.mjs) ⚡
    const signature = await signTotemUpdate({
      totem: totem_address,
      caller: caller_address,
      score: finalScore,
      influence: finalInfluence,
      nonce: Number(currentNonce),
      deadline: deadline
    })

    // ==========================================
    // 4. RESPUESTA AL CLIENTE (FRONTEND)
    // ==========================================
    return json({
      ok: true,
      payload: {
        totem: totem_address,
        caller: caller_address,
        score: finalScore,
        influence: finalInfluence,
        nonce: Number(currentNonce),
        deadline: deadline,
        signature: signature
      }
    })

  } catch (error) {
    console.error("[CLAIM_ERROR]", error)
    return json({ error: true, details: error.message }, 500)
  }
}
