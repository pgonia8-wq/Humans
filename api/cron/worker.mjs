import { createClient } from "@supabase/supabase-js"
import { Redis } from "@upstash/redis"

// =========================
// CONFIGURACIÓN E INSTANCIAS
// =========================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const redis = Redis.fromEnv()

const BUCKET_SIZE_MS = 5000 
const OVERFLOW_THRESHOLD = 50 
const MAX_EVENTS_PER_RUN = 20000 

// Prioridades de lectura (Packs de 50 eventos c/u)
const BUDGET = {
  critical: 200,   // Prioridad máxima (Detección de anomalías)
  engagement: 200, // Prioridad alta (Likes, Shares)
  raw: 50          // Prioridad baja (Scrolls/Ruido)
}

// Shards configurados en la ingesta
const SHARDS = ["00", "01", "02", "03", "0a", "0b"] 

// =========================
// UTILS MATEMÁTICOS
// =========================
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: { "Content-Type": "application/json" } 
  })
}

function avgArr(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function chunkArray(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  )
}

// =========================
// HANDLER PRINCIPAL (CRON)
// =========================
export async function GET() {
  try {
    let events = []
    let systemUnderAttack = false
    const pipe = redis.pipeline()

    // 1. LECTURA JERÁRQUICA CON PIPELINE
    for (const shard of SHARDS) {
      for (const type of ["critical", "engagement", "raw"]) {
        const q = `totem_queue:${type}:${shard}`
        const overflowKey = `queue_overflow:${q}`
        
        pipe.get(overflowKey)
        // Leemos según el presupuesto asignado a la prioridad
        for (let i = 0; i < BUDGET[type]; i++) {
          pipe.lpop(q)
        }
      }
    }

    const results = await pipe.exec()

    // 2. PARSE DETERMINÍSTICO Y CONTROL DE MEMORIA
    let cursor = 0
    for (const shard of SHARDS) {
      for (const type of ["critical", "engagement", "raw"]) {
        // Chequeo de Overflow (Señal de ataque)
        const overflow = Number(results[cursor]) || 0
        cursor++
        if (overflow > OVERFLOW_THRESHOLD) systemUnderAttack = true

        // Procesar packs extraídos
        for (let i = 0; i < BUDGET[type]; i++) {
          const pack = results[cursor]
          cursor++
          if (!pack) continue

          try {
            const parsed = JSON.parse(pack)
            events.push(...parsed)
          } catch (e) {}

          if (events.length >= MAX_EVENTS_PER_RUN) break
        }
        if (events.length >= MAX_EVENTS_PER_RUN) break
      }
      if (events.length >= MAX_EVENTS_PER_RUN) break
    }

    if (events.length === 0) return json({ ok: true, message: "empty" })

    // 3. AGRUPACIÓN LÓGICA (SESIONES Y BUCKETS)
    const sessions = new Map()
    const buckets = new Map()
    const sessionKeys = []

    for (const ev of events) {
      const sKey = `${ev.user_id}:${ev.session_id}`
      const bKey = `${Math.floor(ev.ts / BUCKET_SIZE_MS)}:${ev.post_id}`

      if (!sessions.has(sKey)) {
        sessions.set(sKey, [])
        sessionKeys.push({ user_id: ev.user_id, session_id: ev.session_id })
      }
      sessions.get(sKey).push(ev)

      if (!buckets.has(bKey)) buckets.set(bKey, [])
      buckets.get(bKey).push(ev)
    }

    // 4. BATCH FETCH (CLAVE COMPUESTA USER_ID + SESSION_ID)
    const existingMap = new Map()
    for (const c of chunkArray(sessionKeys, 500)) {
      const { data, error } = await supabase
        .from("feed_sessions")
        .select("*")
        .or(
          c.map(k => `and(user_id.eq.${k.user_id},session_id.eq.${k.session_id})`).join(",")
        )
      
      if (error) throw error
      for (const s of data || []) {
        existingMap.set(`${s.user_id}:${s.session_id}`, s)
      }
    }

    const sessionUpdates = []
    const bucketUpdates = []

    // 5. CEREBRO DE SESIÓN (FINGERPRINT & ENTROPÍA)
    for (const [key, evs] of sessions.entries()) {
      const { user_id, session_id } = evs[0]
      let s = existingMap.get(key) || {
        user_id, session_id, event_count: 0, interactions: 0,
        avg_velocity: 0, avg_jitter: 0, velocity_count: 0, jitter_count: 0,
        scroll_depth: 0, anomaly_score: 0
      }

      let vArr = [], jArr = []

      for (const ev of evs) {
        const m = ev.metrics || {}
        s.event_count++

        if (m.scroll_depth !== undefined) s.scroll_depth = Math.max(s.scroll_depth, m.scroll_depth)
        
        if (m.velocity !== undefined) {
          s.velocity_count++
          s.avg_velocity = ((s.avg_velocity * (s.velocity_count - 1)) + m.velocity) / s.velocity_count
          vArr.push(m.velocity)
        }

        if (m.jitter !== undefined) {
          s.jitter_count++
          s.avg_jitter = ((s.avg_jitter * (s.jitter_count - 1)) + m.jitter) / s.jitter_count
          jArr.push(m.jitter)
        }

        if (["like", "share", "comment_intent"].includes(ev.event)) s.interactions++
        if (!ev.is_trusted || ev.batch_suspected_bot) s.anomaly_score++
      }

      // Aplicar castigo si el sistema está bajo ataque
      if (systemUnderAttack) s.anomaly_score += 2

      const fingerprint = {
        vel: Math.round(avgArr(vArr) * 10),
        jit: Math.round(avgArr(jArr) * 10),
        depth: Math.round(s.scroll_depth * 10)
      }
      s.fingerprint = fingerprint
      s.fingerprint_entropy = Math.abs(fingerprint.vel - fingerprint.jit) + fingerprint.depth
      
      sessionUpdates.push(s)
    }

    // 6. CEREBRO TEMPORAL (TCE - COORDINACIÓN BOTS)
    for (const [key, evs] of buckets.entries()) {
      const [bucket_id, post_id] = key.split(":")
      const users = new Set()
      const jitters = []
      let trusted = 0

      for (const ev of evs) {
        users.add(ev.user_id)
        if (ev.metrics?.jitter !== undefined) jitters.push(ev.metrics.jitter)
        if (ev.is_trusted) trusted++
      }

      const avgJit = avgArr(jitters)
      let coord = (users.size > 3 && avgJit < 0.1) ? Math.min(1, (0.1 - avgJit) * 10) : 0
      if (systemUnderAttack && users.size > 10) coord = 1 // Modo Paranoia total

      bucketUpdates.push({
        bucket_id, post_id, 
        user_count: users.size, 
        avg_jitter: avgJit,
        trust_ratio: evs.length ? trusted / evs.length : 0,
        coordination_score: coord,
        created_at: new Date().toISOString()
      })
    }

    // 7. PERSISTENCIA EN BLOQUES (UPSERT)
    for (const c of chunkArray(sessionUpdates, 1000)) {
      await supabase.from("feed_sessions").upsert(c, { onConflict: "user_id,session_id" })
    }

    for (const c of chunkArray(bucketUpdates, 1000)) {
      await supabase.from("feed_buckets").upsert(c, { onConflict: "bucket_id,post_id" })
    }

    // 8. LIMPIEZA DE SEÑALES DE OVERFLOW
    if (systemUnderAttack) {
      const clearPipe = redis.pipeline()
      for (const shard of SHARDS) {
        for (const type of ["critical", "engagement", "raw"]) {
          clearPipe.del(`queue_overflow:totem_queue:${type}:${shard}`)
        }
      }
      await clearPipe.exec()
    }

    return json({ 
      ok: true, 
      processed: events.length, 
      sessions: sessionUpdates.length, 
      attack: systemUnderAttack 
    })

  } catch (err) {
    console.error("[WORKER_ERROR]", err)
    return json({ error: true, message: err.message }, 500)
  }
}
