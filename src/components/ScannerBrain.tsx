import { useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";

const API_BASE = "";
const POSTS_PER_DAY = 4;
const SCANNER_KEY = "h_scanner_brain";
const BOOST_PROMO_KEY = "h_scanner_boost_promos";

interface ScannerState {
  postsToday: number;
  lastPostAt: string | null;
  nextPostAt: string | null;
  dayStart: string;
  boostPromosToday: string[];
}

function loadState(): ScannerState {
  try {
    const saved = JSON.parse(localStorage.getItem(SCANNER_KEY) || "{}");
    const today = new Date().toISOString().slice(0, 10);
    if (saved.dayStart === today) return saved;
    return {
      postsToday: 0,
      lastPostAt: null,
      nextPostAt: null,
      dayStart: today,
      boostPromosToday: [],
    };
  } catch {
    return {
      postsToday: 0,
      lastPostAt: null,
      nextPostAt: null,
      dayStart: new Date().toISOString().slice(0, 10),
      boostPromosToday: [],
    };
  }
}

function saveState(state: ScannerState) {
  localStorage.setItem(SCANNER_KEY, JSON.stringify(state));
}

function getRandomPostTimes(): number[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 3600000;
  const remaining = endOfDay - now.getTime();

  if (remaining < 3600000) return [];

  const times: number[] = [];
  const slotSize = remaining / POSTS_PER_DAY;

  for (let i = 0; i < POSTS_PER_DAY; i++) {
    const slotStart = now.getTime() + i * slotSize;
    const slotEnd = slotStart + slotSize;
    const randomTime = slotStart + Math.random() * (slotEnd - slotStart);
    times.push(randomTime);
  }

  return times.sort((a, b) => a - b);
}

function getLoadedBoostPromos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BOOST_PROMO_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBoostPromo(userId: string) {
  const promos = getLoadedBoostPromos();
  promos.push(userId);
  localStorage.setItem(BOOST_PROMO_KEY, JSON.stringify(promos));
}

const SCANNER_GENERAL_POSTS = {
  es: [
    "🔍 ANÁLISIS DE MERCADO\n\nEl mercado muestra señales mixtas hoy. Volumen moderado con presión compradora en ciertos sectores.\n\n📊 Indicadores clave:\n• Liquidez general estable\n• Actividad de ballenas: moderada\n• Nuevos tokens: varios en observación\n\nRecuerden: siempre verifiquen métricas antes de invertir. El FOMO es el peor consejero.\n\n🧠 DYOR — H Scanner",
    "🛡️ TIPS DE SEGURIDAD\n\nAntes de comprar cualquier token, verifica:\n\n✅ ¿El creador tiene historial de posts?\n✅ ¿Cuántos holders tiene?\n✅ ¿La concentración de wallets es saludable?\n✅ ¿Hay actividad sospechosa de wash trading?\n\nUn token con buenas métricas sociales y distribución equilibrada de holders es más confiable.\n\n🔍 Usa el Scanner para verificar — H Scanner",
    "📊 RESUMEN DEL DÍA\n\nPatrones que estoy viendo:\n\n→ Creadores activos en la red social tienden a mantener tokens más estables\n→ Tokens con alta concentración en pocos wallets = más riesgo\n→ El volumen orgánico vs artificial marca la diferencia\n\nNo te dejes llevar solo por el precio. Mira la actividad real.\n\n🧠 Analiza con datos, no con emociones — H Scanner",
    "⚠️ EDUCACIÓN CRYPTO\n\n¿Qué es el \"rug pull\"?\n\nCuando un creador:\n• Crea un token con mucho hype\n• Acumula liquidez\n• Vende todo de golpe\n\nCómo protegerte:\n🔍 Revisa el historial social del creador\n🔍 Verifica si tiene tokens bloqueados\n🔍 Mira si tiene verificación Orb\n\nEl Scanner analiza esto por ti automáticamente.\n\n🛡️ Invierte seguro — H Scanner",
    "🧠 DATO DEL DÍA\n\nLos tokens cuyos creadores publican regularmente en la red social tienen un 60% más de retención de holders.\n\nLa actividad social del creador es uno de los mejores indicadores de compromiso con el proyecto.\n\nRevisa el Social Score en el Scanner antes de invertir.\n\n📊 Datos > Emociones — H Scanner",
    "🔍 SEÑALES A VIGILAR\n\n¿Cuándo un token puede ser riesgoso?\n\n🚩 Creador sin posts en +7 días\n🚩 Top 3 wallets tienen >70% del supply\n🚩 Volumen alto pero pocos holders\n🚩 Múltiples compras/ventas del mismo wallet\n\nEl mercado recompensa la paciencia y el análisis. No apresures decisiones.\n\n🛡️ Protege tu capital — H Scanner",
    "📊 MÉTRICAS QUE IMPORTAN\n\nNo te fíes solo del precio. Mira:\n\n📈 Ratio volumen/market cap\n👥 Crecimiento de holders\n🔄 Balance buy/sell\n🔒 Supply bloqueado o quemado\n🗣️ Actividad del creador en la red\n\nUn buen token tiene fundamentos sólidos, no solo hype.\n\n🧠 Invierte con datos — H Scanner",
    "⚡ CONSEJO RÁPIDO\n\nAntes de entrar en cualquier token nuevo:\n\n1️⃣ Revisa cuánto tiempo lleva activo\n2️⃣ Mira si el creador tiene verificación Orb\n3️⃣ Compara el volumen con el número de holders\n4️⃣ Busca si compró campañas o airdrops\n\nLos primeros 48 horas son los más volátiles. Paciencia.\n\n🔍 H Scanner te cuida — DYOR",
  ],
  en: [
    "🔍 MARKET ANALYSIS\n\nMixed signals in the market today. Moderate volume with buying pressure in certain sectors.\n\n📊 Key indicators:\n• Overall liquidity stable\n• Whale activity: moderate\n• New tokens: several under observation\n\nRemember: always check metrics before investing. FOMO is the worst advisor.\n\n🧠 DYOR — H Scanner",
    "🛡️ SECURITY TIPS\n\nBefore buying any token, verify:\n\n✅ Does the creator have posting history?\n✅ How many holders does it have?\n✅ Is wallet concentration healthy?\n✅ Any suspicious wash trading activity?\n\nA token with good social metrics and balanced holder distribution is more reliable.\n\n🔍 Use the Scanner to verify — H Scanner",
    "📊 DAILY ROUNDUP\n\nPatterns I'm observing:\n\n→ Creators active on social tend to maintain more stable tokens\n→ Tokens with high concentration in few wallets = higher risk\n→ Organic vs artificial volume makes the difference\n\nDon't just follow the price. Look at real activity.\n\n🧠 Analyze with data, not emotions — H Scanner",
    "⚠️ CRYPTO EDUCATION\n\nWhat is a \"rug pull\"?\n\nWhen a creator:\n• Creates a token with lots of hype\n• Accumulates liquidity\n• Sells everything at once\n\nHow to protect yourself:\n🔍 Check the creator's social history\n🔍 Verify locked tokens\n🔍 Look for Orb verification\n\nThe Scanner analyzes this for you automatically.\n\n🛡️ Invest safely — H Scanner",
    "🧠 DAILY INSIGHT\n\nTokens whose creators regularly post on the social network have 60% better holder retention.\n\nThe creator's social activity is one of the best indicators of project commitment.\n\nCheck the Social Score in the Scanner before investing.\n\n📊 Data > Emotions — H Scanner",
    "🔍 WARNING SIGNS\n\nWhen can a token be risky?\n\n🚩 Creator hasn't posted in 7+ days\n🚩 Top 3 wallets hold >70% of supply\n🚩 High volume but few holders\n🚩 Same wallet buying and selling repeatedly\n\nThe market rewards patience and analysis. Don't rush decisions.\n\n🛡️ Protect your capital — H Scanner",
    "📊 METRICS THAT MATTER\n\nDon't just look at the price. Check:\n\n📈 Volume/market cap ratio\n👥 Holder growth\n🔄 Buy/sell balance\n🔒 Locked or burned supply\n🗣️ Creator's activity on the network\n\nA good token has solid fundamentals, not just hype.\n\n🧠 Invest with data — H Scanner",
    "⚡ QUICK TIP\n\nBefore entering any new token:\n\n1️⃣ Check how long it's been active\n2️⃣ See if the creator has Orb verification\n3️⃣ Compare volume to number of holders\n4️⃣ Look for campaigns or airdrops\n\nThe first 48 hours are the most volatile. Patience.\n\n🔍 H Scanner has your back — DYOR",
  ],
};

interface ScannerBrainProps {
  userId: string | null;
}

export default function ScannerBrain({ userId }: ScannerBrainProps) {
  const stateRef = useRef<ScannerState>(loadState());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const scheduledTimesRef = useRef<number[]>([]);

  const publishScannerPost = useCallback(async (content: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/createPost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "@scanner",
          content,
          username: "H Scanner",
        }),
      });
      if (!res.ok) {
        console.error("[SCANNER_BRAIN] Post failed:", res.status);
        return false;
      }
      console.log("🔍 [SCANNER] Published post");
      return true;
    } catch (err) {
      console.error("[SCANNER_BRAIN] Post error:", err);
      return false;
    }
  }, []);

  const checkBoostPromo = useCallback(async (): Promise<string | null> => {
    try {
      const alreadyPromoted = stateRef.current.boostPromosToday;

      const { data: recentBoosts } = await supabase
        .from("boosts")
        .select("user_id, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (!recentBoosts?.length) return null;

      const uniqueUsers = [...new Set(recentBoosts.map(b => b.user_id))];
      const eligibleUsers = uniqueUsers.filter(u => !alreadyPromoted.includes(u));

      if (!eligibleUsers.length) return null;

      const tokenApiBase = import.meta.env.VITE_TOKEN_API_BASE || "/api";
      for (const uid of eligibleUsers) {
        try {
          const tokenRes = await fetch(`${tokenApiBase}/tokens?creator=${encodeURIComponent(uid)}`);
          if (!tokenRes.ok) continue;
          const tokenData = await tokenRes.json();
          if (tokenData.tokens?.length > 0) {
            const token = tokenData.tokens[0];
            const { data: profileData } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", uid)
              .maybeSingle();

            const creatorName = profileData?.username || uid.slice(0, 10);
            const lang = Math.random() < 0.5 ? "es" : "en";

            let promoContent: string;
            if (lang === "es") {
              promoContent = `🔍 ANÁLISIS DESTACADO\n\n${token.emoji || "🪙"} ${token.name} ($${token.symbol})\n\nCreador: @${creatorName}\n\n📊 Métricas rápidas:\n• Holders: ${token.holders || 0}\n• Volumen 24h activo\n• Creador verificado y activo en la red\n\nEste token tiene un creador comprometido que invierte en visibilidad. Siempre haz tu propia investigación.\n\n🧠 DYOR — H Scanner`;
            } else {
              promoContent = `🔍 FEATURED ANALYSIS\n\n${token.emoji || "🪙"} ${token.name} ($${token.symbol})\n\nCreator: @${creatorName}\n\n📊 Quick metrics:\n• Holders: ${token.holders || 0}\n• Active 24h volume\n• Verified creator active on the network\n\nThis token has a committed creator investing in visibility. Always do your own research.\n\n🧠 DYOR — H Scanner`;
            }

            stateRef.current.boostPromosToday.push(uid);
            saveBoostPromo(uid);

            return promoContent;
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (err) {
      console.error("[SCANNER_BRAIN] Boost promo check error:", err);
      return null;
    }
  }, []);

  const runCycle = useCallback(async () => {
    const state = stateRef.current;
    const today = new Date().toISOString().slice(0, 10);

    if (state.dayStart !== today) {
      state.postsToday = 0;
      state.lastPostAt = null;
      state.dayStart = today;
      state.boostPromosToday = [];
      scheduledTimesRef.current = getRandomPostTimes();
    }

    if (state.postsToday >= POSTS_PER_DAY) {
      scheduleNext();
      return;
    }

    if (scheduledTimesRef.current.length === 0) {
      scheduledTimesRef.current = getRandomPostTimes();
    }

    const now = Date.now();
    const nextScheduled = scheduledTimesRef.current.find(t => t <= now);
    if (!nextScheduled) {
      scheduleNext();
      return;
    }

    scheduledTimesRef.current = scheduledTimesRef.current.filter(t => t !== nextScheduled);

    let content: string | null = null;

    if (Math.random() < 0.3) {
      content = await checkBoostPromo();
    }

    if (!content) {
      const lang = Math.random() < 0.5 ? "es" : "en";
      const posts = SCANNER_GENERAL_POSTS[lang];
      content = posts[Math.floor(Math.random() * posts.length)];
    }

    const published = await publishScannerPost(content);
    if (published) {
      state.postsToday++;
      state.lastPostAt = new Date().toISOString();
      saveState(state);
      console.log(`🔍 [SCANNER] Post ${state.postsToday}/${POSTS_PER_DAY} today`);
    }

    scheduleNext();
  }, [publishScannerPost, checkBoostPromo]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const state = stateRef.current;
    if (state.postsToday >= POSTS_PER_DAY) {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const delay = tomorrow.getTime() - Date.now();
      timerRef.current = setTimeout(runCycle, Math.min(delay, 3600000));
      return;
    }

    const nextTime = scheduledTimesRef.current[0];
    if (nextTime) {
      const delay = Math.max(nextTime - Date.now(), 60000);
      timerRef.current = setTimeout(runCycle, delay);
    } else {
      timerRef.current = setTimeout(runCycle, 30 * 60000);
    }
  }, [runCycle]);

  useEffect(() => {
    if (!userId) return;

    scheduledTimesRef.current = getRandomPostTimes();

    const initialDelay = 30000 + Math.random() * 60000;
    timerRef.current = setTimeout(runCycle, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, runCycle]);

  return null;
}
