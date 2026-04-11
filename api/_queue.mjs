import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

const OP_TYPES = { BUY: "BUY", SELL: "SELL", LIKE: "LIKE", POST: "POST", DELETE: "DELETE" };
const STATUSES = { PENDING: "PENDING", PROCESSING: "PROCESSING", DONE: "DONE", FAILED: "FAILED" };
const PRIORITIES = { high: 1, medium: 2, low: 3 };

const BACKPRESSURE = {
  DROP_LOW: 150000,
  DROP_MEDIUM: 300000,
  TRADING_ONLY: 500000,
  SOCIAL_DISABLED: 800000,
  HARD_LOCKDOWN: 1500000,
};

const PROTECTED_TYPES = new Set([OP_TYPES.BUY, OP_TYPES.SELL]);

const inMemoryQueue = [];
const MAX_MEMORY_QUEUE = 10000;
const BATCH_SIZE = 200;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

const workerState = {
  running: false,
  processed: 0,
  failed: 0,
  dropped: 0,
  lastRun: null,
  intervalMs: 500,
  timer: null,
};

let cachedQueueSize = 0;
let lastQueueSizeCheck = 0;
const QUEUE_SIZE_CACHE_MS = 5000;

function priorityFor(type) {
  if (type === OP_TYPES.BUY || type === OP_TYPES.SELL) return "high";
  if (type === OP_TYPES.POST) return "medium";
  return "low";
}

async function estimateQueueSize() {
  const now = Date.now();
  if (now - lastQueueSizeCheck < QUEUE_SIZE_CACHE_MS) return cachedQueueSize;
  try {
    const { count } = await supabase
      .from("operation_queue")
      .select("id", { count: "exact", head: true })
      .in("status", [STATUSES.PENDING, STATUSES.PROCESSING]);
    cachedQueueSize = count || 0;
    lastQueueSizeCheck = now;
  } catch {}
  return cachedQueueSize + inMemoryQueue.length;
}

function shouldDrop(type, priority, queueSize) {
  if (PROTECTED_TYPES.has(type)) return false;

  if (queueSize >= BACKPRESSURE.HARD_LOCKDOWN) return true;
  if (queueSize >= BACKPRESSURE.SOCIAL_DISABLED) return true;
  if (queueSize >= BACKPRESSURE.TRADING_ONLY && !PROTECTED_TYPES.has(type)) return true;
  if (queueSize >= BACKPRESSURE.DROP_MEDIUM && (priority === "medium" || priority === "low")) return true;
  if (queueSize >= BACKPRESSURE.DROP_LOW && priority === "low") return true;

  return false;
}

export async function enqueue(type, payload, userId, priority = null) {
  const effectivePriority = priority || priorityFor(type);
  const queueSize = await estimateQueueSize();

  if (shouldDrop(type, effectivePriority, queueSize)) {
    workerState.dropped++;
    console.warn(JSON.stringify({
      event: "QUEUE_BACKPRESSURE_DROP",
      type, priority: effectivePriority, queueSize,
      threshold: queueSize >= BACKPRESSURE.HARD_LOCKDOWN ? "HARD_LOCKDOWN" :
                 queueSize >= BACKPRESSURE.SOCIAL_DISABLED ? "SOCIAL_DISABLED" :
                 queueSize >= BACKPRESSURE.TRADING_ONLY ? "TRADING_ONLY" :
                 queueSize >= BACKPRESSURE.DROP_MEDIUM ? "DROP_MEDIUM" : "DROP_LOW",
    }));
    return { queued: false, reason: "backpressure", queueSize };
  }

  const op = {
    type,
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    user_id: userId,
    status: STATUSES.PENDING,
    priority: effectivePriority,
    retries: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from("operation_queue").insert(op).select("id").maybeSingle();
    if (error) {
      if (error.message?.includes("does not exist")) return enqueueInMemory(op);
      throw error;
    }
    cachedQueueSize++;
    return { queued: true, id: data?.id, storage: "db", queueSize: cachedQueueSize };
  } catch (err) {
    return enqueueInMemory(op);
  }
}

function enqueueInMemory(op) {
  if (inMemoryQueue.length >= MAX_MEMORY_QUEUE) {
    if (PROTECTED_TYPES.has(op.type)) {
      const lowIdx = inMemoryQueue.findIndex(o => o.priority === "low");
      if (lowIdx >= 0) {
        inMemoryQueue.splice(lowIdx, 1);
        workerState.dropped++;
      } else {
        return { queued: false, reason: "queue_full" };
      }
    } else {
      return { queued: false, reason: "queue_full" };
    }
  }
  op.id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  inMemoryQueue.push(op);
  inMemoryQueue.sort((a, b) => PRIORITIES[a.priority] - PRIORITIES[b.priority]);
  return { queued: true, id: op.id, storage: "memory", queueSize: inMemoryQueue.length };
}

async function fetchBatch() {
  try {
    const { data, error } = await supabase
      .from("operation_queue")
      .select("*")
      .eq("status", STATUSES.PENDING)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      if (error.message?.includes("does not exist")) return fetchMemoryBatch();
      throw error;
    }
    return data || [];
  } catch {
    return fetchMemoryBatch();
  }
}

function fetchMemoryBatch() {
  return inMemoryQueue.splice(0, BATCH_SIZE);
}

async function markProcessing(ids) {
  if (ids.length === 0) return;
  const dbIds = ids.filter(id => !String(id).startsWith("mem_"));
  if (dbIds.length > 0) {
    await supabase.from("operation_queue").update({ status: STATUSES.PROCESSING }).in("id", dbIds).catch(() => {});
  }
}

async function markDone(id) {
  if (String(id).startsWith("mem_")) return;
  await supabase.from("operation_queue")
    .update({ status: STATUSES.DONE, completed_at: new Date().toISOString() })
    .eq("id", id).catch(() => {});
}

async function markFailed(id, error, retries) {
  if (String(id).startsWith("mem_")) return;
  const newStatus = retries >= MAX_RETRIES ? STATUSES.FAILED : STATUSES.PENDING;
  await supabase.from("operation_queue")
    .update({ status: newStatus, error_message: error, retries, next_retry: new Date(Date.now() + BASE_BACKOFF_MS * Math.pow(2, retries)).toISOString() })
    .eq("id", id).catch(() => {});
}

const handlers = new Map();

export function registerHandler(type, fn) {
  handlers.set(type, fn);
}

async function processOp(op) {
  const handler = handlers.get(op.type);
  if (!handler) {
    console.warn(`[QUEUE] No handler for type: ${op.type}`);
    await markFailed(op.id, "no_handler", MAX_RETRIES);
    return false;
  }

  try {
    const payload = typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;
    await handler(payload, op);
    await markDone(op.id);
    workerState.processed++;
    return true;
  } catch (err) {
    const retries = (op.retries || 0) + 1;
    await markFailed(op.id, err.message, retries);
    if (retries >= MAX_RETRIES) workerState.failed++;
    return false;
  }
}

async function processBatch() {
  const batch = await fetchBatch();
  if (batch.length === 0) return 0;

  await markProcessing(batch.map(op => op.id));

  let processed = 0;
  for (const op of batch) {
    const ok = await processOp(op);
    if (ok) processed++;
  }
  return processed;
}

export function startWorker(intervalMs = 500) {
  if (workerState.running) return;
  workerState.running = true;
  workerState.intervalMs = intervalMs;

  async function tick() {
    try {
      workerState.lastRun = new Date().toISOString();
      await processBatch();
    } catch (err) {
      console.error("[QUEUE_WORKER] tick error:", err.message);
    }
    if (workerState.running) {
      workerState.timer = setTimeout(tick, workerState.intervalMs);
    }
  }

  tick();
}

export function stopWorker() {
  workerState.running = false;
  if (workerState.timer) {
    clearTimeout(workerState.timer);
    workerState.timer = null;
  }
}

export async function getQueueStats() {
  let dbStats = { pending: 0, processing: 0, done: 0, failed: 0 };
  try {
    const counts = await Promise.all([
      supabase.from("operation_queue").select("id", { count: "exact", head: true }).eq("status", STATUSES.PENDING),
      supabase.from("operation_queue").select("id", { count: "exact", head: true }).eq("status", STATUSES.PROCESSING),
      supabase.from("operation_queue").select("id", { count: "exact", head: true }).eq("status", STATUSES.DONE),
      supabase.from("operation_queue").select("id", { count: "exact", head: true }).eq("status", STATUSES.FAILED),
    ]);
    dbStats = {
      pending: counts[0].count || 0,
      processing: counts[1].count || 0,
      done: counts[2].count || 0,
      failed: counts[3].count || 0,
    };
  } catch {}

  const totalPending = (dbStats.pending || 0) + inMemoryQueue.length;

  return {
    db: dbStats,
    memory: { pending: inMemoryQueue.length, maxSize: MAX_MEMORY_QUEUE },
    worker: {
      running: workerState.running,
      processed: workerState.processed,
      failed: workerState.failed,
      dropped: workerState.dropped,
      lastRun: workerState.lastRun,
      batchSize: BATCH_SIZE,
      intervalMs: workerState.intervalMs,
    },
    backpressure: {
      totalPending,
      level: totalPending >= BACKPRESSURE.HARD_LOCKDOWN ? "HARD_LOCKDOWN" :
             totalPending >= BACKPRESSURE.SOCIAL_DISABLED ? "SOCIAL_DISABLED" :
             totalPending >= BACKPRESSURE.TRADING_ONLY ? "TRADING_ONLY" :
             totalPending >= BACKPRESSURE.DROP_MEDIUM ? "DROP_MEDIUM" :
             totalPending >= BACKPRESSURE.DROP_LOW ? "DROP_LOW" : "NORMAL",
      thresholds: { ...BACKPRESSURE },
    },
  };
}

export async function drainQueue() {
  let total = 0;
  let batch;
  do {
    batch = await processBatch();
    total += batch;
  } while (batch > 0);
  return total;
}

export async function getEstimatedQueueSize() {
  return estimateQueueSize();
}

export { OP_TYPES, STATUSES, PRIORITIES, BACKPRESSURE };
