import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";
import type { Token, ActivityItem, HolderInfo } from "@/services/types";

export type RiskLevel = "SAFE" | "WATCH" | "WARNING" | "DANGER";
export type TokenHeat = "HOT" | "RISING" | "NEUTRAL" | "COOLING" | "COLD";

export interface WhaleAlert {
  userId: string;
  username: string;
  percentage: number;
  action: "accumulating" | "dumping" | "holding";
  amount: number;
}

export interface SocialAnalysis {
  creatorId: string;
  profile: {
    username: string;
    avatarUrl: string | null;
    isVerified: boolean;
    orbVerified: boolean;
    followersCount: number;
    followingCount: number;
    accountAge: number;
  } | null;
  stats: {
    totalPosts: number;
    postsThisWeek: number;
    postsThisMonth: number;
    totalLikes: number;
    totalComments: number;
    totalReposts: number;
    totalTips: number;
    totalViews: number;
    totalBoostScore: number;
    activeBoostedPosts: number;
    campaignPosts: number;
    engagementRate: number;
    activityTrend: "increasing" | "stable" | "decreasing" | "inactive";
    tier: string;
  };
  socialScore: number;
  fomoSignals: string[];
  warnings: string[];
}

export interface TokenAnalysis {
  token: Token;
  heat: TokenHeat;
  riskLevel: RiskLevel;
  trustScore: number;
  momentumScore: number;
  socialScore: number;
  overallScore: number;
  whales: WhaleAlert[];
  creatorDumping: boolean;
  buyerDumps: number;
  holderConcentration: number;
  liquidityRatio: number;
  volumeTrend: "surging" | "rising" | "stable" | "declining" | "dead";
  washTradingRisk: boolean;
  ageHours: number;
  socialAnalysis: SocialAnalysis | null;
  insights: string[];
  redFlags: string[];
  greenFlags: string[];
  fomoSignals: string[];
  lastAnalyzed: string;
}

export interface MarketSummary {
  totalTokens: number;
  hotTokens: number;
  risingTokens: number;
  totalVolume24h: number;
  avgChange24h: number;
  topMomentum: TokenAnalysis | null;
  mostDangerous: TokenAnalysis | null;
  newTokensToday: number;
  marketSentiment: "bullish" | "neutral" | "bearish";
}

interface ScannerState {
  analyses: TokenAnalysis[];
  marketSummary: MarketSummary | null;
  scanning: boolean;
  scanningToken: string | null;
  lastScan: string | null;
  scanCount: number;
  learningData: LearningEntry[];
  searchResult: TokenAnalysis | null;
}

interface LearningEntry {
  tokenId: string;
  analysisDate: string;
  predictedHeat: TokenHeat;
  actualChange24hLater: number | null;
  scoreAtAnalysis: number;
}

const SCAN_INTERVAL = 20 * 60 * 1000;
const TOP_N = 10;
const LEARNING_KEY = "h_scanner_learning";
const ANALYSES_KEY = "h_scanner_analyses";
const SCAN_COUNT_KEY = "h_scanner_count";

const TOKEN_API_BASE = (import.meta.env.VITE_TOKEN_API_URL || "").replace(/\/$/, "");

function loadLearning(): LearningEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LEARNING_KEY) || "[]");
  } catch { return []; }
}

function saveLearning(data: LearningEntry[]) {
  localStorage.setItem(LEARNING_KEY, JSON.stringify(data.slice(-500)));
}

function loadCachedAnalyses(): TokenAnalysis[] {
  try {
    const cached = JSON.parse(localStorage.getItem(ANALYSES_KEY) || "[]");
    const cutoff = Date.now() - 60 * 60 * 1000;
    return cached.filter((a: TokenAnalysis) => new Date(a.lastAnalyzed).getTime() > cutoff);
  } catch { return []; }
}

function saveCachedAnalyses(analyses: TokenAnalysis[]) {
  localStorage.setItem(ANALYSES_KEY, JSON.stringify(analyses.slice(0, 50)));
}

function calculateHolderConcentration(holders: HolderInfo[]): number {
  if (!holders.length) return 100;
  const top3 = holders.slice(0, 3).reduce((s, h) => s + h.percentage, 0);
  return Math.min(100, top3);
}

function detectWhales(holders: HolderInfo[], activities: ActivityItem[]): WhaleAlert[] {
  const whales: WhaleAlert[] = [];
  for (const h of holders) {
    if (h.percentage >= 10) {
      const userSells = activities.filter(a => a.userId === h.userId && a.type === "sell");
      const userBuys = activities.filter(a => a.userId === h.userId && a.type === "buy");
      const recentSells = userSells.filter(a => Date.now() - new Date(a.timestamp).getTime() < 24 * 3600000);
      const recentBuys = userBuys.filter(a => Date.now() - new Date(a.timestamp).getTime() < 24 * 3600000);

      let action: "accumulating" | "dumping" | "holding" = "holding";
      if (recentSells.length > recentBuys.length) action = "dumping";
      else if (recentBuys.length > recentSells.length) action = "accumulating";

      whales.push({
        userId: h.userId,
        username: h.username,
        percentage: h.percentage,
        action,
        amount: h.amount,
      });
    }
  }
  return whales;
}

function detectCreatorDump(creatorId: string, activities: ActivityItem[]): boolean {
  const creatorSells = activities.filter(
    a => a.userId === creatorId && a.type === "sell" &&
    Date.now() - new Date(a.timestamp).getTime() < 48 * 3600000
  );
  return creatorSells.length >= 2;
}

function countBuyerDumps(activities: ActivityItem[]): number {
  const buyerMap = new Map<string, { buys: number; sells: number }>();
  const recent = activities.filter(a => Date.now() - new Date(a.timestamp).getTime() < 24 * 3600000);

  for (const a of recent) {
    if (!buyerMap.has(a.userId)) buyerMap.set(a.userId, { buys: 0, sells: 0 });
    const entry = buyerMap.get(a.userId)!;
    if (a.type === "buy") entry.buys++;
    if (a.type === "sell") entry.sells++;
  }

  let dumps = 0;
  for (const [, v] of buyerMap) {
    if (v.sells > 0 && v.sells >= v.buys) dumps++;
  }
  return dumps;
}

function detectWashTrading(activities: ActivityItem[]): boolean {
  const recent = activities.filter(a => Date.now() - new Date(a.timestamp).getTime() < 6 * 3600000);
  const userPairs = new Map<string, number>();

  for (const a of recent) {
    if (a.type === "buy" || a.type === "sell") {
      const key = a.userId;
      userPairs.set(key, (userPairs.get(key) || 0) + 1);
    }
  }

  let suspiciousUsers = 0;
  for (const [, count] of userPairs) {
    if (count >= 6) suspiciousUsers++;
  }
  return suspiciousUsers >= 2;
}

function getVolumeTrend(token: Token): "surging" | "rising" | "stable" | "declining" | "dead" {
  if (token.volume24h <= 0) return "dead";
  const ratio = token.volume24h / Math.max(token.marketCap, 0.01);
  if (ratio > 0.5) return "surging";
  if (ratio > 0.2) return "rising";
  if (ratio > 0.05) return "stable";
  return "declining";
}

function calculateScores(
  token: Token,
  holders: HolderInfo[],
  activities: ActivityItem[],
  whales: WhaleAlert[],
  creatorDumping: boolean,
  buyerDumps: number,
  washTrading: boolean,
  holderConc: number,
  socialScore: number,
  learning: LearningEntry[]
): { trust: number; momentum: number; overall: number } {
  let trust = 50;
  if (token.holders >= 10) trust += 10;
  if (token.holders >= 50) trust += 10;
  if (token.holders >= 100) trust += 5;
  if (holderConc < 50) trust += 10;
  else if (holderConc > 80) trust -= 15;
  if (!creatorDumping) trust += 10;
  else trust -= 25;
  if (buyerDumps <= 1) trust += 5;
  else trust -= buyerDumps * 5;
  if (washTrading) trust -= 20;
  if (whales.filter(w => w.action === "dumping").length > 0) trust -= 15;
  if (token.lockedSupply > 0) trust += 10;
  if (token.burnedSupply > 0) trust += 5;

  let momentum = 50;
  if (token.change24h > 20) momentum += 25;
  else if (token.change24h > 5) momentum += 15;
  else if (token.change24h > 0) momentum += 5;
  else if (token.change24h < -20) momentum -= 20;
  else if (token.change24h < -5) momentum -= 10;

  if (token.buyPressure > 70) momentum += 15;
  else if (token.buyPressure < 30) momentum -= 10;
  if (token.curvePercent > 50) momentum += 10;

  const learningBonus = calculateLearningAdjustment(token.id, learning);
  momentum += learningBonus;

  const overall = Math.round(trust * 0.35 + momentum * 0.35 + socialScore * 0.30);

  return {
    trust: Math.max(0, Math.min(100, Math.round(trust))),
    momentum: Math.max(0, Math.min(100, Math.round(momentum))),
    overall: Math.max(0, Math.min(100, overall)),
  };
}

function calculateLearningAdjustment(tokenId: string, learning: LearningEntry[]): number {
  const history = learning.filter(l => l.tokenId === tokenId && l.actualChange24hLater !== null);
  if (history.length < 2) return 0;

  const recent = history.slice(-5);
  let accuracy = 0;
  for (const entry of recent) {
    const predicted = entry.predictedHeat === "HOT" || entry.predictedHeat === "RISING";
    const actual = (entry.actualChange24hLater ?? 0) > 0;
    if (predicted === actual) accuracy++;
  }

  const ratio = accuracy / recent.length;
  if (ratio > 0.7) return 5;
  if (ratio < 0.3) return -5;
  return 0;
}

function determineHeat(score: number, change24h: number, _volumeTrend: string): TokenHeat {
  if (score >= 75 && change24h > 10) return "HOT";
  if (score >= 60 && change24h > 0) return "RISING";
  if (score >= 40) return "NEUTRAL";
  if (score >= 25) return "COOLING";
  return "COLD";
}

function determineRisk(trust: number, creatorDumping: boolean, washTrading: boolean, _holderConc: number): RiskLevel {
  if (trust >= 70 && !creatorDumping && !washTrading) return "SAFE";
  if (trust >= 50 && !creatorDumping) return "WATCH";
  if (trust >= 30 || creatorDumping) return "WARNING";
  return "DANGER";
}

function formatPct(n: number): string {
  return n.toFixed(1) + "%";
}

function generateInsights(a: TokenAnalysis): { insights: string[]; redFlags: string[]; greenFlags: string[]; fomoSignals: string[] } {
  const insights: string[] = [];
  const redFlags: string[] = [];
  const greenFlags: string[] = [];
  const fomoSignals: string[] = [];

  if (a.token.holders >= 50) greenFlags.push("Comunidad sólida con " + a.token.holders + " holders");
  if (a.token.lockedSupply > 0) greenFlags.push("Supply bloqueado: " + formatPct(a.token.lockedSupply / a.token.totalSupply * 100));
  if (a.token.burnedSupply > 0) greenFlags.push("Tokens quemados: deflationary");
  if (a.trustScore >= 70) greenFlags.push("Alta confianza según métricas on-chain");
  if (a.momentumScore >= 70) greenFlags.push("Momentum fuerte — tendencia alcista");
  if (a.volumeTrend === "surging") greenFlags.push("Volumen explosivo en las últimas 24h");

  if (a.creatorDumping) redFlags.push("Creador vendiendo tokens — posible exit");
  if (a.washTradingRisk) redFlags.push("Actividad sospechosa: posible wash trading");
  if (a.holderConcentration > 70) redFlags.push("Alta concentración: top 3 wallets tienen " + formatPct(a.holderConcentration));
  if (a.buyerDumps >= 3) redFlags.push("Múltiples dump de compradores recientes");
  if (a.whales.filter(w => w.action === "dumping").length > 0) redFlags.push("Ballena vendiendo en las últimas 24h");
  if (a.ageHours < 24) redFlags.push("Token muy nuevo (<24h) — alto riesgo");
  if (a.token.holders < 5) redFlags.push("Muy pocos holders — baja liquidez orgánica");
  if (a.liquidityRatio < 0.1) redFlags.push("Ratio liquidez/cap muy bajo — cuidado al vender");

  if (a.socialAnalysis) {
    const sa = a.socialAnalysis;
    fomoSignals.push(...sa.fomoSignals);
    if (sa.warnings.length > 0) {
      redFlags.push(...sa.warnings);
    }
    if (sa.stats.tier === "Influencer" || sa.stats.tier === "Activo Pro") {
      greenFlags.push("Creador " + sa.stats.tier + " en la red social");
    }
    if (sa.profile?.orbVerified) {
      greenFlags.push("Identidad verificada con World ID (Orb)");
    }
    if (sa.stats.activeBoostedPosts > 0) {
      greenFlags.push("Creador invirtiendo en boost (" + sa.stats.activeBoostedPosts + " activos)");
    }
  }

  if (a.overallScore >= 70) insights.push("Token con fundamentos sólidos y buen momentum");
  else if (a.overallScore >= 50) insights.push("Token estable — monitorear evolución");
  else if (a.overallScore >= 30) insights.push("Precaución — métricas mixtas, DYOR");
  else insights.push("Alto riesgo — múltiples señales negativas");

  return { insights, redFlags, greenFlags, fomoSignals };
}

async function fetchSocialAnalysis(creatorId: string): Promise<SocialAnalysis | null> {
  try {
    const res = await fetch(`${TOKEN_API_BASE}/api/socialAnalysis?creatorId=${encodeURIComponent(creatorId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function analyzeToken(
  token: Token,
  learningData: LearningEntry[],
  includeSocial: boolean
): Promise<TokenAnalysis> {
  const [holdersData, activityData] = await Promise.all([
    api.getTokenHolders(token.id).catch(() => [] as HolderInfo[]),
    api.getTokenActivity(token.id, 100).catch(() => ({ activities: [] as ActivityItem[], total: 0 })),
  ]);

  const holders = Array.isArray(holdersData) ? holdersData : [];
  const activities = activityData.activities || [];

  const holderConc = calculateHolderConcentration(holders);
  const whales = detectWhales(holders, activities);
  const creatorDumping = detectCreatorDump(token.creatorId, activities);
  const buyerDumps = countBuyerDumps(activities);
  const washTrading = detectWashTrading(activities);
  const volumeTrend = getVolumeTrend(token);
  const ageHours = (Date.now() - new Date(token.createdAt).getTime()) / 3600000;
  const liquidityRatio = (token.totalWldInCurve || 0) / Math.max(token.marketCap, 0.01);

  let socialAnalysis: SocialAnalysis | null = null;
  let socialScoreVal = 0;

  if (includeSocial) {
    socialAnalysis = await fetchSocialAnalysis(token.creatorId);
    if (socialAnalysis) {
      socialScoreVal = socialAnalysis.socialScore;
    }
  }

  const scores = calculateScores(
    token, holders, activities, whales, creatorDumping,
    buyerDumps, washTrading, holderConc, socialScoreVal, learningData
  );

  const heat = determineHeat(scores.overall, token.change24h, volumeTrend);
  const riskLevel = determineRisk(scores.trust, creatorDumping, washTrading, holderConc);

  const analysis: TokenAnalysis = {
    token,
    heat,
    riskLevel,
    trustScore: scores.trust,
    momentumScore: scores.momentum,
    socialScore: socialScoreVal,
    overallScore: scores.overall,
    whales,
    creatorDumping,
    buyerDumps,
    holderConcentration: holderConc,
    liquidityRatio,
    volumeTrend,
    washTradingRisk: washTrading,
    ageHours,
    socialAnalysis,
    insights: [],
    redFlags: [],
    greenFlags: [],
    fomoSignals: [],
    lastAnalyzed: new Date().toISOString(),
  };

  const generated = generateInsights(analysis);
  analysis.insights = generated.insights;
  analysis.redFlags = generated.redFlags;
  analysis.greenFlags = generated.greenFlags;
  analysis.fomoSignals = generated.fomoSignals;

  return analysis;
}

function computeMarketSummary(analyses: TokenAnalysis[]): MarketSummary {
  const hot = analyses.filter(a => a.heat === "HOT").length;
  const rising = analyses.filter(a => a.heat === "RISING").length;
  const totalVol = analyses.reduce((s, a) => s + a.token.volume24h, 0);
  const avgChange = analyses.length > 0 ? analyses.reduce((s, a) => s + a.token.change24h, 0) / analyses.length : 0;
  const newToday = analyses.filter(a => a.ageHours < 24).length;

  const sorted = [...analyses].sort((a, b) => b.overallScore - a.overallScore);
  const dangerous = [...analyses].sort((a, b) => a.trustScore - b.trustScore);

  let sentiment: "bullish" | "neutral" | "bearish" = "neutral";
  if (avgChange > 5 && hot + rising > analyses.length * 0.3) sentiment = "bullish";
  else if (avgChange < -5) sentiment = "bearish";

  return {
    totalTokens: analyses.length,
    hotTokens: hot,
    risingTokens: rising,
    totalVolume24h: totalVol,
    avgChange24h: avgChange,
    topMomentum: sorted[0] || null,
    mostDangerous: dangerous[0] || null,
    newTokensToday: newToday,
    marketSentiment: sentiment,
  };
}

export function useTokenScanner() {
  const [state, setState] = useState<ScannerState>({
    analyses: loadCachedAnalyses(),
    marketSummary: null,
    scanning: false,
    scanningToken: null,
    lastScan: null,
    scanCount: parseInt(localStorage.getItem(SCAN_COUNT_KEY) || "0"),
    learningData: loadLearning(),
    searchResult: null,
  });

  const scanningRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setState(s => ({ ...s, scanning: true }));

    try {
      const { tokens } = await api.getTokens({ limit: TOP_N, sort: "volume" });

      const analyses: TokenAnalysis[] = [];

      for (const token of tokens.slice(0, TOP_N)) {
        try {
          const analysis = await analyzeToken(token, state.learningData, true);
          analyses.push(analysis);
        } catch {
          continue;
        }
      }

      analyses.sort((a, b) => b.overallScore - a.overallScore);

      const newLearning = [...state.learningData];
      for (const a of analyses) {
        const prev = state.learningData.find(
          l => l.tokenId === a.token.id && l.actualChange24hLater === null
        );
        if (prev) {
          prev.actualChange24hLater = a.token.change24h;
        }
        newLearning.push({
          tokenId: a.token.id,
          analysisDate: new Date().toISOString(),
          predictedHeat: a.heat,
          actualChange24hLater: null,
          scoreAtAnalysis: a.overallScore,
        });
      }

      saveLearning(newLearning);
      saveCachedAnalyses(analyses);

      const summary = computeMarketSummary(analyses);
      const newCount = state.scanCount + 1;
      localStorage.setItem(SCAN_COUNT_KEY, String(newCount));

      setState(s => ({
        ...s,
        analyses,
        marketSummary: summary,
        scanning: false,
        lastScan: new Date().toISOString(),
        scanCount: newCount,
        learningData: newLearning,
      }));
    } catch (err) {
      console.error("[SCANNER] Scan failed:", err);
      setState(s => ({ ...s, scanning: false }));
    } finally {
      scanningRef.current = false;
    }
  }, [state.learningData, state.scanCount]);

  const scanSingleToken = useCallback(async (tokenId: string) => {
    setState(s => ({ ...s, scanningToken: tokenId, searchResult: null }));

    try {
      const tokenData = await api.getToken(tokenId);
      if (!tokenData) {
        setState(s => ({ ...s, scanningToken: null }));
        return null;
      }

      const analysis = await analyzeToken(tokenData, state.learningData, true);

      setState(s => ({
        ...s,
        scanningToken: null,
        searchResult: analysis,
      }));

      return analysis;
    } catch (err) {
      console.error("[SCANNER] Single scan failed:", err);
      setState(s => ({ ...s, scanningToken: null }));
      return null;
    }
  }, [state.learningData]);

  const searchToken = useCallback(async (query: string) => {
    setState(s => ({ ...s, scanningToken: query, searchResult: null }));

    try {
      const { tokens } = await api.getTokens({ limit: 20, sort: "volume" });
      const q = query.toLowerCase().trim();
      const match = tokens.find(
        t => t.symbol.toLowerCase() === q ||
             t.name.toLowerCase().includes(q) ||
             t.symbol.toLowerCase().includes(q)
      );

      if (!match) {
        setState(s => ({ ...s, scanningToken: null }));
        return null;
      }

      const analysis = await analyzeToken(match, state.learningData, true);

      setState(s => ({
        ...s,
        scanningToken: null,
        searchResult: analysis,
      }));

      return analysis;
    } catch (err) {
      console.error("[SCANNER] Search failed:", err);
      setState(s => ({ ...s, scanningToken: null }));
      return null;
    }
  }, [state.learningData]);

  const clearSearch = useCallback(() => {
    setState(s => ({ ...s, searchResult: null }));
  }, []);

  useEffect(() => {
    runScan();
    intervalRef.current = setInterval(runScan, SCAN_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    analyses: state.analyses,
    marketSummary: state.marketSummary,
    scanning: state.scanning,
    scanningToken: state.scanningToken,
    lastScan: state.lastScan,
    scanCount: state.scanCount,
    searchResult: state.searchResult,
    rescan: runScan,
    scanSingleToken,
    searchToken,
    clearSearch,
  };
}
