/**
 * AutonomousGrowthBrain.tsx
 * SEEDS — Autonomous Growth Engine
 *
 * Silent background system for "H by Humans" World App.
 * Returns null. Runs every 12–15 minutes. Fully autonomous.
 *
 * Improves feed performance over time using scoring, decay,
 * learning, feed health rules, and timing optimization.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient"; // CORRECCIÓN AGB-1: supabase faltaba — usado en getCachedTrends()
import { useRunConnectedPipeline } from "./hooks/useRunConnectedPipeline";
import { usePublishQueuedPosts } from "./hooks/usePublishQueuedPosts";
import { useGetContentQueue } from "./hooks/useGetContentQueue";
// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | "crypto_news"
  | "market_analysis"
  | "worldcoin_updates"
  | "trading_signals"
  | "tech"
  | "memecoins";

type OfficialAccount =
  | "@news"
  | "@crypto"
  | "@trading"
  | "@memes"
  | "@builders";

type EngineMode = "CALM" | "OPTIMIZE" | "GROWTH" | "COOLDOWN";

interface PostMetrics {
  id: string;
  category: Category;
  account: OfficialAccount;
  impressions: number;
  clicks: number;
  wld_earned: number;
  created_at: number; // unix ms
  topic: string;
  hour: number; // 0–23, hour of day when published
}

interface LearningMemory {
  topCategories: Category[];
  weakCategories: Category[];
  recentTopics: string[];
  bestHours: number[];    // top 3 performing hours of day
  worstHours: number[];   // bottom 3 performing hours of day
  lastUpdated: number;
}

interface BrainState {
  mode: EngineMode;
  cycleCount: number;
  lastCycleAt: number;
  lastPublishAt: number;
  publishedThisHour: number;
  hourWindowStart: number;
  recentCategorySeq: Category[];
  recentAccountSeq: OfficialAccount[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  "crypto_news",
  "market_analysis",
  "worldcoin_updates",
  "trading_signals",
  "tech",
  "memecoins",
];

const ACCOUNTS: OfficialAccount[] = [
  "@news",
  "@crypto",
  "@trading",
  "@memes",
  "@builders",
];

const TOPIC_HINTS: Record<Category, string[]> = {
  crypto_news: [
    "BTC rally", "ETH update", "altcoin season", "market cap milestone",
    "crypto regulation", "exchange volume surge", "stablecoin peg",
  ],
  market_analysis: [
    "support levels", "resistance break", "volume spike", "RSI divergence",
    "trend continuation", "bear trap", "bull flag pattern",
  ],
  worldcoin_updates: [
    "WLD news", "World ID expansion", "Orb rollout", "ecosystem grant",
    "World App feature", "WLD liquidity", "Worldcoin partnership",
  ],
  trading_signals: [
    "buy signal", "trend reversal", "breakout alert", "swing trade setup",
    "short squeeze", "DCA opportunity", "consolidation zone",
  ],
  tech: [
    "AI breakthrough", "Web3 infrastructure", "Layer 2 scaling",
    "developer tools", "zero knowledge proof", "cross-chain bridge", "smart contract audit",
  ],
  memecoins: [
    "DOGE spike", "new memecoin launch", "community token rally",
    "viral meme coin", "meme season", "low cap gem", "dog coin trend",
  ],
};

const STORAGE_MEMORY  = "seeds_learning_memory";
const STORAGE_BRAIN   = "seeds_brain_state";
const STORAGE_METRICS = "seeds_post_metrics";
const STORAGE_LOCK    = "seeds_brain_lock";

const LOCK_TTL_MS          = 5 * 60 * 1000;   // 5 min — stale lock expiry
const CYCLE_MIN_MS         = 12 * 60 * 1000;
const CYCLE_MAX_MS         = 15 * 60 * 1000;
const BOOT_DELAY_MS = 20000 + Math.random() * 5000; // 20–25s
const PUBLISH_DELAY_MIN_MS = 2  * 60 * 1000;
const PUBLISH_DELAY_MAX_MS = 10 * 60 * 1000;
const MAX_POSTS_PER_HOUR   = 6;
const MAX_QUEUE_SIZE       = 20;
const MAX_STORED_METRICS   = 500;

// ─── Utility ──────────────────────────────────────────────────────────────────

const now      = (): number => Date.now();
const currentHour = (): number => new Date().getHours();
const randInt  = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or unavailable — fail silently
  }
}

// CORRECCIÓN AGB-2: tipo Trend mal indentado (parecía estar dentro de save()).
// Movido al nivel de módulo correctamente.
type Trend = {
  topic: string;
  category: string;
  strength: number;
};

async function getCachedTrends(): Promise<Trend[]> {
  try {
    const { data } = await supabase
      .from("trends_cache")
      .select("topic, category, strength")
      .gt("expires_at", new Date().toISOString())
      .limit(30);

    return data ?? [];
  } catch {
    return [];
  }
}

function weightedPick(trends: Trend[]): string {
  const total = trends.reduce((sum, t) => sum + t.strength, 0);
  let r = Math.random() * total;

  for (const t of trends) {
    r -= t.strength;
    if (r <= 0) return t.topic;
  }

  return trends[0]?.topic ?? "trending topic";
}
// ─── Concurrency Lock ─────────────────────────────────────────────────────────

function acquireLock(): boolean {
  const existing = load<{ ts: number } | null>(STORAGE_LOCK, null);
  if (existing && now() - existing.ts < LOCK_TTL_MS) {
    return false; // Lock is held and not stale
  }
  save(STORAGE_LOCK, { ts: now() });
  return true;
}

function releaseLock(): void {
  localStorage.removeItem(STORAGE_LOCK);
}

// ─── Performance Scoring & Decay ──────────────────────────────────────────────

function scoreWithDecay(post: PostMetrics): number {
  const raw = post.impressions * 0.2 + post.clicks * 3 + post.wld_earned * 5;
  const ageMs = now() - post.created_at;
  const ONE_DAY   = 24 * 60 * 60 * 1000;
  const THREE_DAYS = 3 * ONE_DAY;
  const weight = ageMs <= ONE_DAY ? 1.0 : ageMs <= THREE_DAYS ? 0.6 : 0.3;
  return raw * weight;
}

// ─── Timing Optimization ──────────────────────────────────────────────────────

/**
 * Groups post scores by hour of day.
 * Returns best 3 hours and worst 3 hours based on average performance.
 */
function analyzeHourPerformance(posts: PostMetrics[]): {
  bestHours: number[];
  worstHours: number[];
} {
  const hourMap: Record<number, number[]> = {};

  for (const post of posts) {
    const h = post.hour ?? new Date(post.created_at).getHours();
    if (!hourMap[h]) hourMap[h] = [];
    hourMap[h].push(scoreWithDecay(post));
  }

  const hourAvgs = Object.entries(hourMap).map(([h, scores]) => ({
    hour: Number(h),
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  hourAvgs.sort((a, b) => b.avg - a.avg);

  return {
    bestHours:  hourAvgs.slice(0, 3).map((x) => x.hour),
    worstHours: hourAvgs.slice(-3).map((x) => x.hour),
  };
}

function isGoodHourToPublish(bestHours: number[], worstHours: number[]): boolean {
  const h = currentHour();
  if (worstHours.includes(h)) return false;
  if (bestHours.length === 0)  return true; // No data yet — always ok
  return bestHours.includes(h) || !worstHours.includes(h);
}

// ─── Learning Engine ──────────────────────────────────────────────────────────

function updateMemory(posts: PostMetrics[]): LearningMemory {
  const current = load<LearningMemory>(STORAGE_MEMORY, {
    topCategories: [],
    weakCategories: [],
    recentTopics: [],
    bestHours: [],
    worstHours: [],
    lastUpdated: 0,
  });

  // Score categories
  const catScores: Partial<Record<Category, number>> = {};
  for (const cat of CATEGORIES) catScores[cat] = 0;

  for (const post of posts) {
    catScores[post.category] = (catScores[post.category] ?? 0) + scoreWithDecay(post);
  }

  const sorted = (Object.entries(catScores) as [Category, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const topCategories  = sorted.slice(0, 3).map(([c]) => c);
  const weakCategories = sorted.slice(-3).map(([c]) => c).reverse();

  // Update recent topics (last 50)
  const newTopics = posts.map((p) => p.topic).filter(Boolean);
  const recentTopics = [...newTopics, ...current.recentTopics]
    .filter((v, i, a) => a.indexOf(v) === i) // deduplicate
    .slice(0, 50);

  // Timing analysis
  const { bestHours, worstHours } = analyzeHourPerformance(posts);

  const updated: LearningMemory = {
    topCategories,
    weakCategories,
    recentTopics,
    bestHours,
    worstHours,
    lastUpdated: now(),
  };

  save(STORAGE_MEMORY, updated);
  return updated;
}

// ─── Feed Health ──────────────────────────────────────────────────────────────

/**
 * Returns true if posting this category + account is feed-healthy.
 * Rules:
 *  - No 3 consecutive posts from the same category
 *  - No two consecutive posts from the same official account
 */
function isFeedHealthy(
  recentCatSeq: Category[],
  recentAccSeq: OfficialAccount[],
  category: Category,
  account: OfficialAccount
): boolean {
  const last2Cats = recentCatSeq.slice(-2);
  if (last2Cats.length === 2 && last2Cats.every((c) => c === category)) return false;

  const lastAcc = recentAccSeq[recentAccSeq.length - 1];
  if (lastAcc === account) return false;

  return true;
}

function pickCategory(
  pool: Category[],
  recentCatSeq: Category[],
  recentAccSeq: OfficialAccount[],
  account: OfficialAccount
): Category {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  for (const cat of shuffled) {
    if (isFeedHealthy(recentCatSeq, recentAccSeq, cat, account)) return cat;
  }

  // Fallback: try any category
  for (const cat of CATEGORIES.sort(() => Math.random() - 0.5)) {
    if (isFeedHealthy(recentCatSeq, recentAccSeq, cat, account)) return cat;
  }

  return randFrom(CATEGORIES);
}

// ─── Decision Engine ──────────────────────────────────────────────────────────

function decideMode(
  publishedThisHour: number,
  queueSize: number,
  avgScore: number,
  cycleCount: number
): EngineMode {
  if (publishedThisHour >= MAX_POSTS_PER_HOUR || queueSize >= MAX_QUEUE_SIZE) {
    return "COOLDOWN";
  }
  if (avgScore > 80 && cycleCount > 3) return "OPTIMIZE";
  if (cycleCount <= 2 || avgScore < 20) return "GROWTH";
  return "CALM";
}

interface CycleDecision {
  shouldGenerate: boolean;
  shouldPublish: boolean;
  postsToGenerate: number;
  account: OfficialAccount;
  category: Category;
  topic: string;
  mode: EngineMode;
}

function buildDecision(
  mode: EngineMode,
  memory: LearningMemory,
  state: BrainState,
  queueSize: number,
  trends: Trend[] // 
): CycleDecision {
  const softRandom = Math.random() < 0.12;
  if (softRandom) {
  }

  // Account selection: avoid repeating last account
  const lastAcc = state.recentAccountSeq[state.recentAccountSeq.length - 1];
  const availableAccounts = ACCOUNTS.filter((a) => a !== lastAcc);
  const account = softRandom ? randFrom(ACCOUNTS) : randFrom(availableAccounts);

  // Category pool based on mode
  let pool: Category[];
  if (softRandom) {
    pool = memory.weakCategories.length > 0 ? memory.weakCategories : CATEGORIES;
  } else if (mode === "OPTIMIZE" && memory.topCategories.length > 0) {
    pool = memory.topCategories;
  } else if (mode === "GROWTH") {
    pool = CATEGORIES;
  } else {
    pool =
      memory.topCategories.length > 0
        ? [...memory.topCategories, ...CATEGORIES]
        : CATEGORIES;
  }

  const category = pickCategory(pool, state.recentCategorySeq, state.recentAccountSeq, account);

  // Topic selection (avoid recently used topics)
  const usedTopics = new Set(memory.recentTopics);
  const hints = TOPIC_HINTS[category] ?? [];
  const freshTopics = hints.filter((t) => !usedTopics.has(t));
  let topic: string;

if (trends.length > 0 && Math.random() < 0.7) {
  topic = weightedPick(trends); // usa temas reales
} else {
  topic =
    freshTopics.length > 0
      ? randFrom(freshTopics)
      : randFrom(hints); // fallback
}
  // Post count to generate
  let postsToGenerate: number;
  if (mode === "GROWTH")   postsToGenerate = randInt(3, 4);
  else if (mode === "OPTIMIZE") postsToGenerate = randInt(2, 3);
  else if (mode === "CALM")     postsToGenerate = randInt(2, 3);
  else postsToGenerate = 0; // COOLDOWN

  // Clamp to queue headroom
  const headroom = MAX_QUEUE_SIZE - queueSize;
  postsToGenerate = Math.max(0, Math.min(postsToGenerate, headroom));

  const goodHour = isGoodHourToPublish(memory.bestHours, memory.worstHours);
  const shouldGenerate = mode !== "COOLDOWN" && postsToGenerate > 0;
const shouldPublish =
  queueSize > 0 &&
  state.publishedThisHour < MAX_POSTS_PER_HOUR &&
  goodHour;
  
  return {
    shouldGenerate,
    shouldPublish,
    postsToGenerate,
    account,
    category,
    topic,
    mode,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AutonomousGrowthBrain(): null {
  const { run: runPipeline, isLoading: isPipelineLoading } =
    useRunConnectedPipeline();
  const { publish, isLoading: isPublishLoading } = usePublishQueuedPosts();
  const { queue, metrics: liveMetrics } = useGetContentQueue();

  const isRunning = useRef(false);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest hook values accessible inside timers without re-registering effects
  const pipelineRef   = useRef({ runPipeline, isPipelineLoading });
  const publishRef    = useRef({ publish, isPublishLoading });
  const queueRef      = useRef({ queue, liveMetrics });

  useEffect(() => { pipelineRef.current  = { runPipeline, isPipelineLoading }; });
  useEffect(() => { publishRef.current   = { publish, isPublishLoading }; });
  useEffect(() => { queueRef.current     = { queue, liveMetrics }; });

  const runCycle = useCallback(async () => {
    // Prevent concurrent local executions
    if (isRunning.current) {
      return;
    }

    // Distributed lock via localStorage
    if (!acquireLock()) {
      return;
    }

    isRunning.current = true;

    try {
      const { runPipeline, isPipelineLoading } = pipelineRef.current;
      const { publish, isPublishLoading }       = publishRef.current;
      const { queue, liveMetrics }              = queueRef.current;

      // ── 1. Awareness ──────────────────────────────────────────────────────
      const storedMetrics = load<PostMetrics[]>(STORAGE_METRICS, []);
      const allMetrics = [
        ...storedMetrics,
        ...(liveMetrics ?? []),
      ].reduce<PostMetrics[]>((acc, m) => {
        if (!acc.find((x) => x.id === m.id)) acc.push(m);
        return acc;
      }, []);

      const rawState = load<BrainState>(STORAGE_BRAIN, {
        mode: "CALM",
        cycleCount: 0,
        lastCycleAt: 0,
        lastPublishAt: 0,
        publishedThisHour: 0,
        hourWindowStart: now(),
        recentCategorySeq: [],
        recentAccountSeq: [],
      });

      // Reset hourly window if more than 60 min have passed
      const hourElapsed = now() - rawState.hourWindowStart > 60 * 60 * 1000;
      const state: BrainState = hourElapsed
        ? { ...rawState, publishedThisHour: 0, hourWindowStart: now() }
        : rawState;

      const queueSize = queue?.length ?? 0;

      // ── 2. Learning ───────────────────────────────────────────────────────
      const memory = updateMemory(allMetrics);

      // ── 3. Average score (recent posts) ───────────────────────────────────
      const cutoff = now() - 60 * 60 * 1000;
      const recent = allMetrics.filter((m) => m.created_at > cutoff);
      const avgScore =
        recent.length > 0
          ? recent.reduce((s, m) => s + scoreWithDecay(m), 0) / recent.length
          : 0;

      // ── 4. Mode ───────────────────────────────────────────────────────────
      const mode = decideMode(
        state.publishedThisHour,
        queueSize,
        avgScore,
        state.cycleCount
      );

      const trends = await getCachedTrends();
      // ── 5. Decision ───────────────────────────────────────────────────────
       const decision = buildDecision(mode, memory, state, queueSize, trends);

      // ── 6. Generate ───────────────────────────────────────────────────────
      if (decision.shouldGenerate && !isPipelineLoading) {
        try {
          const result = await runPipeline({
            category: decision.category,
            account: decision.account,
            topic: decision.topic,
            count: decision.postsToGenerate,
          });


          // Track used topics
          const generatedTopics: string[] = result?.topics ?? [decision.topic];
          save<LearningMemory>(STORAGE_MEMORY, {
            ...memory,
            recentTopics: [...generatedTopics, ...memory.recentTopics].slice(0, 50),
          });
        } catch (err) {
          console.error("❌ [SEEDS] Pipeline error:", err);
        }
      }

      // ── 7. Publish (with human-like delay) ───────────────────────────────
      if (decision.shouldPublish && !isPublishLoading) {
        const delayMs = randInt(PUBLISH_DELAY_MIN_MS, PUBLISH_DELAY_MAX_MS);

        setTimeout(async () => {
          try {
            const result = await publish({
              account: decision.account,
            });

            const published = result?.published ?? 0;

            const updatedState = load<BrainState>(STORAGE_BRAIN, state);
            save<BrainState>(STORAGE_BRAIN, {
              ...updatedState,
              lastPublishAt: now(),
              publishedThisHour: updatedState.publishedThisHour + published,
              recentCategorySeq: [
                ...updatedState.recentCategorySeq,
                decision.category,
              ].slice(-10),
              recentAccountSeq: [
                ...updatedState.recentAccountSeq,
                decision.account,
              ].slice(-10),
            });
          } catch (err) {
            console.error("❌ [SEEDS] Publish error:", err);
          }
        }, delayMs);
      }

      // ── 8. Save state ─────────────────────────────────────────────────────
      save<BrainState>(STORAGE_BRAIN, {
        ...state,
        mode,
        cycleCount: state.cycleCount + 1,
        lastCycleAt: now(),
      });

      // Trim stored metrics
      save<PostMetrics[]>(STORAGE_METRICS, allMetrics.slice(-MAX_STORED_METRICS));
    } catch (err) {
      console.error("💥 [SEEDS] Unhandled cycle error:", err);
    } finally {
      isRunning.current = false;
      releaseLock();
    }
  }, []); // No deps — uses refs

  const scheduleNext = useCallback(() => {
    const delay = randInt(CYCLE_MIN_MS, CYCLE_MAX_MS);
    cycleTimer.current = setTimeout(async () => {
      await runCycle();
      scheduleNext();
    }, delay);
  }, [runCycle]);

  useEffect(() => {

    const boot = setTimeout(async () => {
      try {
        await fetch("/api/seedOfficialProfiles", { method: "POST" });
      } catch (e) {
        console.warn("[SEEDS] Could not seed official profiles:", e);
      }
      await runCycle();
      scheduleNext();
    }, BOOT_DELAY_MS);

    return () => {
      clearTimeout(boot);
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      releaseLock();
    };
  }, [runCycle, scheduleNext]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION — src/pages/HomePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Import the component at the top of your file:
//
//    import AutonomousGrowthBrain from "../components/AutonomousGrowthBrain";
//
// 2. Render it once inside your HomePage JSX (position doesn't matter,
//    it renders nothing):
//
//    export default function HomePage() {
//      return (
//        <>
//          <AutonomousGrowthBrain />
//          {/* rest of your feed UI */}
//        </>
//      );
//    }
//
// localStorage keys used (do not reuse these keys elsewhere):
//   seeds_learning_memory  — top/weak categories, recent topics, best hours
//   seeds_brain_state      — mode, cycle count, hourly publish counter
//   seeds_post_metrics     — up to 500 scored post records
//   seeds_brain_lock       — distributed lock (auto-released after each cycle)
// ─────────────────────────────────────────────────────────────────────────────
