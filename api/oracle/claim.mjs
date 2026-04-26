import { createClient } from "@supabase/supabase-js"
import { ethers } from "ethers"
import { signTotemUpdate } from "../../lib/oracleSigner.mjs" // 👈 Importamos tu archivo intacto

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Conexión rápida al RPC para leer el nonce directo del contrato (Seguridad Anti-Replay)
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL_WORLDCHAIN)
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS
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
    // 1. LEER INTELIGENCIA (SUPABASE)
    // ==========================================
    // Traemos la última sesión del usuario
    const { data: session } = await supabase
      .from("feed_sessions")
      .select("anomaly_score, fingerprint_entropy")
      .eq("user_id", caller_address)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Traemos los últimos 5 buckets de este totem para ver si hay ataque coordinado
    const { data: buckets } = await supabase
      .from("feed_buckets")
      .select("coordination_score")
      // Idealmente tu tabla tiene una columna totem_address. Si es post_id, ajústalo aquí.
      .order("created_at", { ascending: false })
      .limit(5)

    // ==========================================
    // 2. MATEMÁTICA DEL ORÁCULO
    // ==========================================
    let anomalyScore = session ? session.anomaly_score : 0
    let entropy = session ? session.fingerprint_entropy : 50
    let avgCoord = 0

    if (buckets && buckets.length > 0) {
      avgCoord = buckets.reduce((acc, b) => acc + b.coordination_score, 0) / buckets.length
    }

    // Independence Factor (Baja si hay bots coordinados)
    const independenceFactor = Math.max(0, 1 - avgCoord)
    
    // Anti-Manipulation Penalty (Sube por anomalías, baja por entropía humana real)
    const anomalyRatio = Math.min(1, anomalyScore / 10)
    const entropyBonus = Math.min(0.2, entropy / 200)
    const penalty = Math.max(0, anomalyRatio - entropyBonus)

    // ==========================================
    // 3. MAPEO A VALORES ON-CHAIN
    // ==========================================
    // Score: 1 - 10000
    const finalScore = Math.max(1, Math.min(10000, Math.floor(10000 * (1 - penalty))))
    
    // Influence: 925 - 1075 (El rango de tu Smart Contract)
    const baseInfluence = 1000 + (75 * independenceFactor) - (75 * penalty)
    const finalInfluence = Math.max(925, Math.min(1075, Math.floor(baseInfluence)))

    // ==========================================
    // 4. GENERAR FIRMA USANDO TU ARCHIVO
    // ==========================================
    const currentNonce = await oracleContract.nonces(totem_address)
    const deadline = Math.floor(Date.now() / 1000) + 900 // Válido por 15 mins

    // ⚡ AQUÍ LLAMAMOS A TU CÓDIGO ⚡
    const signature = await signTotemUpdate({
      totem: totem_address,
      caller: caller_address,
      score: finalScore,
      influence: finalInfluence,
      nonce: currentNonce.toNumber(),
      deadline: deadline
    })

    // ==========================================
    // 5. RESPUESTA AL CLIENTE
    // ==========================================
    return json({
      ok: true,
      payload: {
        totem: totem_address,
        caller: caller_address,
        score: finalScore,
        influence: finalInfluence,
        nonce: currentNonce.toNumber(),
        deadline: deadline,
        signature: signature
      }
    })

  } catch (error) {
    console.error("[CLAIM_ERROR]", error)
    return json({ error: true }, 500)
  }
}
