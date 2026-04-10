/**
 * AutonomousGrowthBrain.tsx
 * SEEDS — Autonomous Growth Engine v2
 *
 * Silent background system for "H by Humans" World App.
 * Fetches real trends from RSS, CoinGecko, news portals.
 * Generates bilingual posts (ES/EN) with distinct personalities per account.
 * Adapts frequency based on feed activity.
 * Returns null. Fully autonomous.
 */

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useRunConnectedPipeline } from "./hooks/useRunConnectedPipeline";
import { usePublishQueuedPosts } from "./hooks/usePublishQueuedPosts";
import { useGetContentQueue } from "./hooks/useGetContentQueue";
import type { Category, OfficialAccount } from "./hooks/database.types";
import {
  generatePost,
  getAccountCategories,
  getAllAccounts,
  getRandomLang,
  type TrendData,
} from "./lib/postTemplates";

type EngineMode = "CALM" | "OPTIMIZE" | "GROWTH" | "COOLDOWN";

interface PostMetrics {
  id: string;
  category: Category;
  account: OfficialAccount;
  impressions: number;
  clicks: number;
  wld_earned: number;
  created_at: number;
  topic: string;
  hour: number;
}

interface LearningMemory {
  topCategories: Category[];
  weakCategories: Category[];
  topAccounts: OfficialAccount[];
  recentTopics: string[];
  bestHours: number[];
  worstHours: number[];
  bestFormats: string[];
  avgPostLength: number;
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
  consecutiveErrors: number;
  feedActivityScore: number;
}

const CATEGORIES: Category[] = [
  "crypto_news", "market_analysis", "worldcoin_updates",
  "trading_signals", "tech", "memecoins",
  "world_news", "sports", "entertainment", "lifestyle",
];

const ACCOUNTS: OfficialAccount[] = getAllAccounts();

const STORAGE_MEMORY  = "seeds_learning_memory";
const STORAGE_BRAIN   = "seeds_brain_state";
const STORAGE_METRICS = "seeds_post_metrics";
const STORAGE_LOCK    = "seeds_brain_lock";
const STORAGE_TRENDS  = "seeds_cached_trends";

const LOCK_TTL_MS          = 5 * 60 * 1000;
const CYCLE_MIN_MS_ACTIVE  = 10 * 60 * 1000;
const CYCLE_MAX_MS_ACTIVE  = 15 * 60 * 1000;
const CYCLE_MIN_MS_QUIET   = 5 * 60 * 1000;
const CYCLE_MAX_MS_QUIET   = 8 * 60 * 1000;
const BOOT_DELAY_MS        = 15000 + Math.random() * 5000;
const PUBLISH_DELAY_MIN_MS = 30 * 1000;
const PUBLISH_DELAY_MAX_MS = 3 * 60 * 1000;
const MAX_POSTS_PER_HOUR   = 10;
const MAX_QUEUE_SIZE       = 40;
const MAX_STORED_METRICS   = 500;
const TRENDS_CACHE_TTL_MS  = 15 * 60 * 1000;

const now         = (): number => Date.now();
const currentHour = (): number => new Date().getHours();
const randInt     = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;
function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

async function acquireLock(): Promise<boolean> {
    const existing = load<{ ts: number } | null>(STORAGE_LOCK, null);
    if (existing && now() - existing.ts < LOCK_TTL_MS) return false;
    save(STORAGE_LOCK, { ts: now() });

    try {
      const lockExpiry = new Date(now() + LOCK_TTL_MS).toISOString();
      const deviceId = localStorage.getItem("seeds_device_id") || crypto.randomUUID();
      localStorage.setItem("seeds_device_id", deviceId);

      const { data, error } = await supabase
        .from("system_locks")
        .upsert({
          key: "growth_brain",
          locked_until: lockExpiry,
          locked_by: deviceId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" })
        .select("locked_by")
        .maybeSingle();

      if (error || !data || data.locked_by !== deviceId) {
        releaseLock();
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }
  function releaseLock(): void {
    try { localStorage.removeItem(STORAGE_LOCK); } catch {}
    supabase.from("system_locks").delete().eq("key", "growth_brain").then(() => {}).catch(() => {});
}

async function fetchTrendsFromApi(): Promise<TrendData[]> {
  const cached = load<{ ts: number; data: TrendData[] } | null>(STORAGE_TRENDS, null);
  if (cached && now() - cached.ts < TRENDS_CACHE_TTL_MS && cached.data.length > 0) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("/api/fetchTrends", { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return cached?.data ?? [];
    const json = await res.json();
    const trends = json.trends ?? [];
    save(STORAGE_TRENDS, { ts: now(), data: trends });
    return trends;
  } catch {
    return cached?.data ?? [];
  }
}

async function fetchFeedActivity(): Promise<number> {
  try {
    const oneHourAgo = new Date(now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", oneHourAgo);
    return count ?? 0;
  } catch { return 5; }
}

function scoreWithDecay(post: PostMetrics): number {
  const raw = post.impressions * 0.2 + post.clicks * 3 + post.wld_earned * 5;
  const ageMs = now() - post.created_at;
  const ONE_DAY = 86400000;
  const weight = ageMs <= ONE_DAY ? 1.0 : ageMs <= 3 * ONE_DAY ? 0.6 : 0.3;
  return raw * weight;
}

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
    bestHours: hourAvgs.slice(0, 4).map((x) => x.hour),
    worstHours: hourAvgs.slice(-3).map((x) => x.hour),
  };
}

function updateMemory(posts: PostMetrics[]): LearningMemory {
  const current = load<LearningMemory>(STORAGE_MEMORY, {
    topCategories: [], weakCategories: [], topAccounts: [],
    recentTopics: [], bestHours: [], worstHours: [],
    bestFormats: [], avgPostLength: 200, lastUpdated: 0,
  });

  if (posts.length === 0) return current;

  const catScores: Partial<Record<Category, number>> = {};
  for (const cat of CATEGORIES) catScores[cat] = 0;
  for (const post of posts) {
    catScores[post.category] = (catScores[post.category] ?? 0) + scoreWithDecay(post);
  }
  const sortedCats = (Object.entries(catScores) as [Category, number][]).sort((a, b) => b[1] - a[1]);
  const topCategories = sortedCats.slice(0, 4).map(([c]) => c);
  const weakCategories = sortedCats.slice(-3).map(([c]) => c).reverse();

  const accScores: Partial<Record<OfficialAccount, number>> = {};
  for (const acc of ACCOUNTS) accScores[acc] = 0;
  for (const post of posts) {
    accScores[post.account] = (accScores[post.account] ?? 0) + scoreWithDecay(post);
  }
  const sortedAccs = (Object.entries(accScores) as [OfficialAccount, number][]).sort((a, b) => b[1] - a[1]);
  const topAccounts = sortedAccs.slice(0, 4).map(([a]) => a);

  const newTopics = posts.map((p) => p.topic).filter(Boolean);
  const recentTopics = [...newTopics, ...current.recentTopics]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 80);

  const { bestHours, worstHours } = analyzeHourPerformance(posts);

  const updated: LearningMemory = {
    topCategories, weakCategories, topAccounts,
    recentTopics, bestHours, worstHours,
    bestFormats: current.bestFormats,
    avgPostLength: current.avgPostLength,
    lastUpdated: now(),
  };
  save(STORAGE_MEMORY, updated);
  return updated;
}

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

function pickAccountAndCategory(
  memory: LearningMemory,
  state: BrainState,
  trends: TrendData[]
): { account: OfficialAccount; category: Category } {
  const softRandom = Math.random() < 0.15;
  const lastAcc = state.recentAccountSeq[state.recentAccountSeq.length - 1];
  const availableAccounts = ACCOUNTS.filter((a) => a !== lastAcc);

  let account: OfficialAccount;
  if (softRandom) {
    account = randFrom(ACCOUNTS);
  } else if (memory.topAccounts.length > 0 && Math.random() < 0.4) {
    const topAvail = memory.topAccounts.filter((a) => a !== lastAcc);
    account = topAvail.length > 0 ? randFrom(topAvail) : randFrom(availableAccounts);
  } else {
    account = randFrom(availableAccounts);
  }

  const accountCats = getAccountCategories(account);

  if (trends.length > 0 && Math.random() < 0.6) {
    const trendCats = [...new Set(trends.map((t) => t.category as Category))];
    const overlap = accountCats.filter((c) => trendCats.includes(c));
    if (overlap.length > 0) {
      const cat = randFrom(overlap);
      if (isFeedHealthy(state.recentCategorySeq, state.recentAccountSeq, cat, account)) {
        return { account, category: cat };
      }
    }
  }

  const shuffled = [...accountCats].sort(() => Math.random() - 0.5);
  for (const cat of shuffled) {
    if (isFeedHealthy(state.recentCategorySeq, state.recentAccountSeq, cat, account)) {
      return { account, category: cat };
    }
  }

  return { account, category: randFrom(accountCats) };
}

function decideMode(
  publishedThisHour: number,
  queueSize: number,
  avgScore: number,
  cycleCount: number,
  feedActivity: number
): EngineMode {
  if (publishedThisHour >= MAX_POSTS_PER_HOUR || queueSize >= MAX_QUEUE_SIZE) return "COOLDOWN";
  if (feedActivity < 3 && cycleCount > 1) return "GROWTH";
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
  lang: "es" | "en";
  trend: TrendData | null;
  mode: EngineMode;
}

function buildDecision(
  mode: EngineMode,
  memory: LearningMemory,
  state: BrainState,
  queueSize: number,
  trends: TrendData[],
  feedActivity: number
): CycleDecision {
  const { account, category } = pickAccountAndCategory(memory, state, trends);
  const lang = getRandomLang();

  const relevantTrends = trends.filter(
    (t) => t.category === category || t.category === "world_news"
  );
  const unusedTrends = relevantTrends.filter(
    (t) => !memory.recentTopics.includes(t.title)
  );
  const trend = unusedTrends.length > 0
    ? randFrom(unusedTrends)
    : relevantTrends.length > 0
      ? randFrom(relevantTrends)
      : trends.length > 0
        ? randFrom(trends)
        : null;

  let postsToGenerate: number;
  if (mode === "GROWTH")        postsToGenerate = randInt(3, 5);
  else if (mode === "OPTIMIZE") postsToGenerate = randInt(2, 4);
  else if (mode === "CALM")     postsToGenerate = randInt(2, 3);
  else postsToGenerate = 0;

  if (feedActivity < 2) postsToGenerate = Math.min(postsToGenerate + 2, 6);

  const headroom = MAX_QUEUE_SIZE - queueSize;
  postsToGenerate = Math.max(0, Math.min(postsToGenerate, headroom));

  const goodHour = memory.bestHours.length === 0 ||
    memory.bestHours.includes(currentHour()) ||
    !memory.worstHours.includes(currentHour());

  const shouldGenerate = mode !== "COOLDOWN" && postsToGenerate > 0;
  const shouldPublish = queueSize > 0 &&
    state.publishedThisHour < MAX_POSTS_PER_HOUR &&
    goodHour;

  return {
    shouldGenerate, shouldPublish, postsToGenerate,
    account, category, lang, trend, mode,
  };
}

export default function AutonomousGrowthBrain(): null {
  const { run: runPipeline, isLoading: isPipelineLoading } = useRunConnectedPipeline();
  const { publish, isLoading: isPublishLoading } = usePublishQueuedPosts();
  const { queue, metrics: liveMetrics } = useGetContentQueue();

  const isRunning = useRef(false);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const publishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pipelineRef = useRef({ runPipeline, isPipelineLoading });
  const publishRef = useRef({ publish, isPublishLoading });
  const queueRef = useRef({ queue, liveMetrics });

  useEffect(() => { pipelineRef.current = { runPipeline, isPipelineLoading }; });
  useEffect(() => { publishRef.current = { publish, isPublishLoading }; });
  useEffect(() => { queueRef.current = { queue, liveMetrics }; });

  const runCycle = useCallback(async () => {
    if (isRunning.current) return;
    if (!(await acquireLock())) return;
    isRunning.current = true;

    try {
      const { runPipeline, isPipelineLoading } = pipelineRef.current;
      const { publish, isPublishLoading } = publishRef.current;
      const { queue, liveMetrics } = queueRef.current;

      const storedMetrics = load<PostMetrics[]>(STORAGE_METRICS, []);
      const allMetrics = [
        ...storedMetrics,
        ...(liveMetrics ?? []),
      ].reduce<PostMetrics[]>((acc, m) => {
        if (!acc.find((x) => x.id === m.id)) acc.push(m);
        return acc;
      }, []);

      const rawState = load<BrainState>(STORAGE_BRAIN, {
        mode: "CALM", cycleCount: 0, lastCycleAt: 0,
        lastPublishAt: 0, publishedThisHour: 0,
        hourWindowStart: now(), recentCategorySeq: [],
        recentAccountSeq: [], consecutiveErrors: 0,
        feedActivityScore: 5,
      });

      const hourElapsed = now() - rawState.hourWindowStart > 3600000;
      const state: BrainState = hourElapsed
        ? { ...rawState, publishedThisHour: 0, hourWindowStart: now() }
        : rawState;

      const queueSize = queue?.length ?? 0;

      const memory = updateMemory(allMetrics);

      const cutoff = now() - 3600000;
      const recent = allMetrics.filter((m) => m.created_at > cutoff);
      const avgScore = recent.length > 0
        ? recent.reduce((s, m) => s + scoreWithDecay(m), 0) / recent.length
        : 0;

      const [trends, feedActivity] = await Promise.all([
        fetchTrendsFromApi(),
        fetchFeedActivity(),
      ]);

      const mode = decideMode(state.publishedThisHour, queueSize, avgScore, state.cycleCount, feedActivity);

      console.log(`🧠 [SEEDS] Cycle #${state.cycleCount + 1} | Mode: ${mode} | Queue: ${queueSize} | Trends: ${trends.length} | Activity: ${feedActivity} posts/hr`);

      const decision = buildDecision(mode, memory, state, queueSize, trends, feedActivity);

      if (decision.shouldGenerate && !isPipelineLoading && decision.trend) {
        try {
          const postsToQueue: { category: string; account: string; topic: string; content: string; image_url?: string }[] = [];

          const usedTrends = new Set<string>();
          for (let i = 0; i < decision.postsToGenerate; i++) {
            const lang = i % 2 === 0 ? "es" : "en";
            let trendForPost = decision.trend;

            if (i > 0 && trends.length > 1) {
              const unused = trends.filter((t) => !usedTrends.has(t.title));
              if (unused.length > 0) trendForPost = randFrom(unused);
            }
            usedTrends.add(trendForPost.title);

            const accountsForRotation = i === 0 ? decision.account : randFrom(
              ACCOUNTS.filter((a) => a !== decision.account || ACCOUNTS.length <= 1)
            );
            const { content, image } = generatePost(accountsForRotation, trendForPost, lang);

            postsToQueue.push({
              category: decision.category,
              account: accountsForRotation,
              topic: trendForPost.title,
              content,
              image_url: image || undefined,
            });
          }

          const res = await fetch("/api/queueContent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rows: postsToQueue.map((p) => ({
                category: p.category,
                account: p.account,
                topic: p.topic,
                content: p.content,
              })),
            }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log(`✅ [SEEDS] Queued ${data.queued} posts from real trends`);

            save<LearningMemory>(STORAGE_MEMORY, {
              ...memory,
              recentTopics: [
                ...postsToQueue.map((p) => p.topic),
                ...memory.recentTopics,
              ].slice(0, 80),
            });

            save<BrainState>(STORAGE_BRAIN, {
              ...state, mode, consecutiveErrors: 0,
              cycleCount: state.cycleCount + 1, lastCycleAt: now(),
            });
          } else {
            console.warn("⚠️ [SEEDS] Queue API error:", await res.text());
          }
        } catch (err) {
          console.error("❌ [SEEDS] Generate error:", err);
          save<BrainState>(STORAGE_BRAIN, {
            ...state, consecutiveErrors: state.consecutiveErrors + 1,
            cycleCount: state.cycleCount + 1, lastCycleAt: now(),
          });
        }
      } else if (decision.shouldGenerate && !decision.trend) {
        console.log("⏸️ [SEEDS] No trends available, skipping generation");
      }

      if (decision.shouldPublish && !isPublishLoading) {
        const delayMs = randInt(PUBLISH_DELAY_MIN_MS, PUBLISH_DELAY_MAX_MS);

        if (publishTimer.current) clearTimeout(publishTimer.current);
        publishTimer.current = setTimeout(async () => {
          try {
            const result = await publish({ account: decision.account });
            const published = result?.published ?? 0;

            if (published > 0) {
              console.log(`📤 [SEEDS] Published ${published} post(s) as ${decision.account}`);
            }

            const updatedState = load<BrainState>(STORAGE_BRAIN, state);
            save<BrainState>(STORAGE_BRAIN, {
              ...updatedState,
              lastPublishAt: now(),
              publishedThisHour: updatedState.publishedThisHour + published,
              feedActivityScore: feedActivity,
              recentCategorySeq: [
                ...updatedState.recentCategorySeq,
                decision.category,
              ].slice(-15),
              recentAccountSeq: [
                ...updatedState.recentAccountSeq,
                decision.account,
              ].slice(-15),
            });
          } catch (err) {
            console.error("❌ [SEEDS] Publish error:", err);
          }
        }, delayMs);
      }

      if (!decision.shouldGenerate) {
        save<BrainState>(STORAGE_BRAIN, {
          ...state, mode,
          cycleCount: state.cycleCount + 1,
          lastCycleAt: now(),
          feedActivityScore: feedActivity,
        });
      }

      save<PostMetrics[]>(STORAGE_METRICS, allMetrics.slice(-MAX_STORED_METRICS));
    } catch (err) {
      console.error("💥 [SEEDS] Unhandled cycle error:", err);
    } finally {
      isRunning.current = false;
      releaseLock();
    }
  }, []);

  const scheduleNext = useCallback(() => {
    const state = load<BrainState>(STORAGE_BRAIN, { feedActivityScore: 5 } as BrainState);
    const isQuiet = (state.feedActivityScore ?? 5) < 3;
    const min = isQuiet ? CYCLE_MIN_MS_QUIET : CYCLE_MIN_MS_ACTIVE;
    const max = isQuiet ? CYCLE_MAX_MS_QUIET : CYCLE_MAX_MS_ACTIVE;
    const delay = randInt(min, max);

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
      if (publishTimer.current) clearTimeout(publishTimer.current);
      releaseLock();
    };
  }, [runCycle, scheduleNext]);

  return null;
}
