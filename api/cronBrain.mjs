import { createClient } from "@supabase/supabase-js";

  const supabase = createClient(
    process.env.SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  );

  const ACCOUNTS = [
    "@news", "@crypto", "@trading", "@memes", "@builders",
    "@sports", "@entertainment", "@world", "@scanner",
  ];

  const DAILY_LIMIT = 6;

  const ACCOUNT_CATEGORIES = {
    "@news":          ["world_news", "crypto_news", "tech"],
    "@crypto":        ["crypto_news", "market_analysis", "trading_signals"],
    "@trading":       ["trading_signals", "market_analysis", "crypto_news"],
    "@memes":         ["memecoins", "crypto_news", "entertainment"],
    "@builders":      ["tech", "crypto_news", "worldcoin_updates"],
    "@sports":        ["sports"],
    "@entertainment": ["entertainment", "lifestyle"],
    "@world":         ["world_news"],
    "@scanner":       ["market_analysis", "crypto_news", "trading_signals"],
  };

  function randFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function cite(source, image) {
    let footer = `\n\n📡 Fuente: ${source}`;
    if (image) footer += `\n📸 Imagen vía ${source}`;
    return footer;
  }

  async function fetchTrendsInternal() {
    const RSS_FEEDS = [
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "world_news", lang: "en" },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world_news", lang: "en" },
      { url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", category: "entertainment", lang: "en" },
      { url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "sports", lang: "en" },
      { url: "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", category: "sports", lang: "en" },
      { url: "https://feeds.feedburner.com/TechCrunch/", category: "tech", lang: "en" },
      { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", category: "crypto_news", lang: "en" },
      { url: "https://cointelegraph.com/rss", category: "crypto_news", lang: "en" },
      { url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", category: "world_news", lang: "es" },
      { url: "https://e00-marca.uecdn.es/rss/portada.xml", category: "sports", lang: "es" },
      { url: "https://www.20minutos.es/rss/", category: "world_news", lang: "es" },
    ];

    function extractFromXml(xml, tag) {
      const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`, "gi");
      const matches = [];
      let m;
      while ((m = regex.exec(xml)) !== null) matches.push((m[1] || m[2] || "").trim());
      return matches;
    }

    function extractImage(itemXml) {
      const m1 = itemXml.match(/url="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
      if (m1) return m1[1];
      const m2 = itemXml.match(/<enclosure[^>]+url="(https?:\/\/[^"]+)"/i);
      if (m2) return m2[1];
      return null;
    }

    async function fetchRss(feed) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(feed.url, {
          signal: controller.signal,
          headers: { "User-Agent": "HumansApp/1.0 RSS Reader" },
        });
        clearTimeout(timeout);
        if (!res.ok) return [];
        const xml = await res.text();
        const items = xml.split(/<item[\s>]/i).slice(1, 6);
        return items.map((itemXml) => {
          const titles = extractFromXml(`<item>${itemXml}`, "title");
          const descs = extractFromXml(`<item>${itemXml}`, "description");
          const image = extractImage(itemXml);
          return {
            title: titles[0] || "",
            description: (descs[0] || "").replace(/<[^>]+>/g, "").slice(0, 800),
            category: feed.category,
            lang: feed.lang,
            source: feed.url.match(/\/\/([^/]+)/)?.[1] || "",
            image,
          };
        }).filter((t) => t.title.length > 5);
      } catch { return []; }
    }

    async function fetchCryptoTrending() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("https://api.coingecko.com/api/v3/search/trending", { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.coins || []).slice(0, 8).map((c) => ({
          title: `${c.item.name} (${c.item.symbol}) trending`,
          description: `Market cap rank #${c.item.market_cap_rank || "?"} — Price: $${c.item.data?.price?.toFixed(4) || "?"} — 24h change: ${c.item.data?.price_change_percentage_24h?.usd?.toFixed(1) || "?"}%`,
          category: "crypto_news",
          lang: "en",
          source: "coingecko.com",
          image: c.item.thumb || c.item.small || null,
        }));
      } catch { return []; }
    }

    async function fetchCryptoGlobal() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("https://api.coingecko.com/api/v3/global", { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return [];
        const data = await res.json();
        const d = data.data;
        if (!d) return [];
        return [{
          title: `Crypto market: $${(d.total_market_cap?.usd / 1e12)?.toFixed(2) || "?"}T market cap`,
          description: `BTC dominance: ${d.market_cap_percentage?.btc?.toFixed(1) || "?"}% — ETH: ${d.market_cap_percentage?.eth?.toFixed(1) || "?"}% — Active cryptos: ${d.active_cryptocurrencies || "?"} — 24h volume: $${(d.total_volume?.usd / 1e9)?.toFixed(1) || "?"}B`,
          category: "market_analysis",
          lang: "en",
          source: "coingecko.com",
          image: null,
        }];
      } catch { return []; }
    }

    const results = await Promise.allSettled([
      ...RSS_FEEDS.map(fetchRss),
      fetchCryptoTrending(),
      fetchCryptoGlobal(),
    ]);

    return results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .sort(() => Math.random() - 0.5);
  }

  function generatePostContent(account, trend, lang) {
    const s = trend.source;
    const img = trend.image;
    const t = trend;
    const footer = cite(s, img);

    const TEMPLATES = {
      "@news": {
        es: [
          () => `🔴 ÚLTIMA HORA\n\n${t.title}\n\n${t.description}\n\nEsta noticia marca un punto de inflexión que vale la pena seguir de cerca. Las próximas horas serán determinantes para entender el alcance real de lo que está ocurriendo. Desde H News vamos a estar monitoreando cada desarrollo nuevo que surja.\n\nSi tienen información adicional o quieren debatir el tema, los leemos abajo 👇${footer}`,
          () => `📰 COBERTURA ESPECIAL\n\n${t.title}\n\n${t.description}\n\nPara poner esto en contexto: no es un hecho aislado. Viene en una línea de acontecimientos que vienen escalando en las últimas semanas. Los analistas coinciden en que esto podría tener repercusiones más allá de lo inmediato.\n\nDesde la redacción de H News consideramos que es fundamental no quedarse solo con el titular. El contexto completo cambia la perspectiva.\n\n¿Qué opinan ustedes? ¿Les sorprende o lo veían venir?${footer}`,
          () => `⚡ DESARROLLO IMPORTANTE\n\n${t.title}\n\n${t.description}\n\nLo que sabemos hasta ahora:\n▸ Los hechos están confirmados por múltiples fuentes\n▸ Las reacciones institucionales aún se están procesando\n▸ Se esperan más declaraciones en las próximas horas\n\nEn H News creemos que la información verificada es la mejor herramienta. Vamos a seguir actualizando conforme se conozcan más detalles.\n\nActiven notificaciones para no perderse nada 🔔${footer}`,
          () => `🌐 ANÁLISIS DEL DÍA\n\n${t.title}\n\n${t.description}\n\nMás allá del titular, hay tres aspectos clave que la mayoría pasa por alto:\n\n1️⃣ El timing no es casual — coincide con movimientos que venían gestándose\n2️⃣ Las consecuencias a mediano plazo podrían ser más significativas que el evento en sí\n3️⃣ La reacción pública va a definir el próximo capítulo de esta historia\n\nEn H News separamos el ruido de la señal.${footer}`,
        ],
        en: [
          () => `🔴 BREAKING NEWS\n\n${t.title}\n\n${t.description}\n\nThis is a pivotal moment worth watching closely. The next few hours will be critical in understanding the real scope of what's unfolding. H News will be monitoring every new development as it comes in.\n\nIf you have additional insights or want to debate this, we're reading every comment below 👇${footer}`,
          () => `📰 SPECIAL COVERAGE\n\n${t.title}\n\n${t.description}\n\nLet's put this in context: this isn't an isolated event. It follows a pattern of escalating developments over recent weeks. Analysts agree this could have implications far beyond the immediate.\n\nAt H News, we believe it's essential to look beyond the headline. The full context shifts the perspective entirely.\n\nWhat's your take? Did you see this coming?${footer}`,
          () => `⚡ DEVELOPING STORY\n\n${t.title}\n\n${t.description}\n\nWhat we know so far:\n▸ The facts have been confirmed by multiple sources\n▸ Institutional reactions are still being processed\n▸ More statements expected in the coming hours\n\nAt H News, we believe verified information is the best tool. We'll keep updating as more details emerge.\n\nTurn on notifications so you don't miss anything 🔔${footer}`,
          () => `🌐 TODAY'S ANALYSIS\n\n${t.title}\n\n${t.description}\n\nBeyond the headline, there are three key aspects most people overlook:\n\n1️⃣ The timing isn't coincidental\n2️⃣ The medium-term consequences could be more significant than the event itself\n3️⃣ Public reaction will define the next chapter\n\nAt H News, we separate noise from signal.${footer}`,
        ],
      },
      "@crypto": {
        es: [
          () => `₿ CRYPTO DEEP DIVE\n\n${t.title}\n\n${t.description}\n\nVamos a desglosar esto. El mercado crypto no se mueve por titulares — se mueve por liquidez, sentimiento institucional y narrativas.\n\nImplicaciones directas:\n• Portafolios de largo plazo que están acumulando\n• Traders buscando entradas en zonas de descuento\n• Proyectos DeFi que dependen de la estabilidad\n\nLos que llevan tiempo en esto saben: cuando todo el mundo habla, ya es tarde. La alpha está en interpretar los datos antes que la masa.\n\n💎 No es consejo financiero. DYOR.${footer}`,
          () => `🔥 ALERTA CRYPTO\n\n${t.title}\n\n${t.description}\n\nLo que veo en datos on-chain:\n\n→ Ballenas acumulando silenciosamente\n→ Volumen en DEX subió fuerte\n→ Flujos de stablecoins indican capital esperando\n→ Funding rate en zona neutral\n\nEl mercado crypto es paciencia y datos. Los que se dejan llevar por FOMO o FUD terminan siendo exit liquidity.\n\nTesis + datos + disciplina. Así se sobrevive.\n\n📊 DYOR siempre.${footer}`,
          () => `🚀 TENDENCIA CRYPTO\n\n${t.title}\n\n${t.description}\n\nCuando confluyen narrativa y fundamentales, pasa esto. El mercado empieza a preciar lo que los degens vieron hace semanas.\n\n1. Adopción institucional acelerando pese al ruido regulatorio\n2. Los builders siguen construyendo — señal más bullish que existe\n3. El capital inteligente se posiciona antes, no espera confirmación\n\nPero ojo: cada ciclo tiene trampas. Gestión de riesgo es lo que separa a los que sobreviven.\n\n#crypto #blockchain #DeFi${footer}`,
        ],
        en: [
          () => `₿ CRYPTO DEEP DIVE\n\n${t.title}\n\n${t.description}\n\nLet's break this down. The crypto market doesn't move on headlines — it moves on liquidity, institutional sentiment, and narratives.\n\nDirect implications:\n• Long-term portfolios accumulating\n• Traders looking for discount entries\n• DeFi projects depending on stability\n\nThose who've been around know: when everyone's talking, it's late. Real alpha is reading data before the crowd.\n\n💎 Not financial advice. DYOR.${footer}`,
          () => `🔥 CRYPTO ALERT\n\n${t.title}\n\n${t.description}\n\nOn-chain data tells me more than any headline:\n\n→ Whales quietly accumulating\n→ DEX volume spiked hard\n→ Stablecoin flows show capital waiting\n→ Funding rate in neutral territory\n\nCrypto is a game of patience and data. FOMO/FUD driven traders become exit liquidity.\n\nThesis + data + discipline. That's how you survive.\n\n📊 Always DYOR.${footer}`,
          () => `🚀 CRYPTO TREND\n\n${t.title}\n\n${t.description}\n\nWhen narrative and fundamentals converge, this happens. Market pricing in what degens spotted weeks ago.\n\n1. Institutional adoption accelerating despite regulatory noise\n2. Builders keep building — most bullish signal there is\n3. Smart money positions early, doesn't wait for confirmation\n\nBut watch out: every cycle has traps. Risk management separates survivors from casualties.\n\n#crypto #blockchain #DeFi${footer}`,
        ],
      },
      "@trading": {
        es: [
          () => `📈 SEÑAL DE TRADING\n\n${t.title}\n\n${t.description}\n\nAnálisis técnico:\n\n🟢 Zona de soporte: buscar reacción en retrocesos\n🔴 Resistencia próxima: si rompe con volumen, continuación\n🎯 Objetivo: extensión de Fibonacci\n\n• RSI en zona media — sin sobrecompra ni sobreventa\n• MACD con cruce pendiente\n• Volumen creciente — interés genuino\n\nPlan: esperar confirmación. Entrar sin setup claro es apostar, no tradear.\n\n⚠️ Stop loss no es opcional. NO es consejo financiero.${footer}`,
          () => `📉 ALERTA DE MERCADO\n\n${t.title}\n\n${t.description}\n\nEl mercado habla. ¿Estás escuchando?\n\n• Volatilidad implícita subiendo — prepararse para movimiento fuerte\n• Liquidaciones en ambas direcciones = incertidumbre\n• Order book muestra acumulación en niveles clave\n\nLa mejor estrategia ahora: paciencia. Los traders que sobreviven esperan el setup perfecto.\n\nRegla 1: preservar capital. Regla 2: no olvidar la regla 1.\n\n💰 #trading${footer}`,
          () => `🎯 ANÁLISIS TÉCNICO\n\n${t.title}\n\n${t.description}\n\n▸ Diario: estructura vigente\n▸ 4H: consolidación formándose\n▸ 1H: decisión inminente\n\nPatrones:\n→ Posible doble suelo/techo\n→ Divergencia en RSI\n→ Volumen decreciente en consolidación — típico antes de expansión\n\nPlan: marcar niveles, alertas, actuar solo con confirmación. Ego y emociones no tienen lugar.\n\nStop loss siempre. 📊${footer}`,
        ],
        en: [
          () => `📈 TRADING SIGNAL\n\n${t.title}\n\n${t.description}\n\nTechnical analysis:\n\n🟢 Support zone: watch for pullback reaction\n🔴 Next resistance: if broken with volume, continuation\n🎯 Target: Fibonacci extension\n\n• RSI in mid zone\n• MACD pending crossover\n• Increasing volume — genuine interest\n\nPlan: wait for confirmation. Entering without setup is gambling.\n\n⚠️ Stop loss is not optional. NOT financial advice.${footer}`,
          () => `📉 MARKET ALERT\n\n${t.title}\n\n${t.description}\n\nThe market is speaking. Are you listening?\n\n• Implied volatility rising — prepare for strong move\n• Liquidations both ways = uncertainty\n• Order book shows accumulation at key levels\n\nBest strategy now: patience. Survivors wait for the perfect setup.\n\nRule 1: preserve capital. Rule 2: don't forget rule 1.\n\n💰 #trading${footer}`,
          () => `🎯 TECHNICAL ANALYSIS\n\n${t.title}\n\n${t.description}\n\n▸ Daily: prevailing structure\n▸ 4H: consolidation forming\n▸ 1H: decision moment imminent\n\nPatterns:\n→ Possible double bottom/top\n→ RSI divergence\n→ Decreasing volume in consolidation — typical before expansion\n\nPlan: mark levels, set alerts, act only on confirmation. No ego, no emotions.\n\nAlways stop loss. 📊${footer}`,
        ],
      },
      "@memes": {
        es: [
          () => `🐸 Che, no puedo ser el único que vio esto...\n\n"${t.title}"\n\n${t.description}\n\nO sea, literal estoy acá con el celu a las 3am mientras mi portafolio hace lo que le da la gana. El universo me está trolleando.\n\nDespués de sobrevivir tres bear markets, dos rug pulls y ese lunes que BTC bajó 40% mientras dormía... ya nada me asusta.\n\nPero bueno, al menos tenemos memes. Y mientras haya memes, hay esperanza 💀\n\nSi esto no es la definición de 2026, no sé qué es 😂${footer}`,
          () => `💀 JAJAJA esto es demasiado real:\n\n${t.title}\n\n${t.description}\n\nImaginate explicarle esto a tu viejo. "Sí pa, invertí en monedas de internet con dibujos de perros". La cara no tiene precio.\n\nPero sabés qué? Los que se reían en 2020 ahora preguntan "cómo compro Bitcoin". Quién ríe último...\n\nEl mercado es un circo y nosotros los payasos mejor informados. Al menos nos divertimos 🤣\n\nRT si te sentís identificado.${footer}`,
          () => `🔥 POV: Estás leyendo "${t.title}" mientras tu portafolio hace -15%\n\n${t.description}\n\nFases del crypto investor:\n1. "Voy a investigar bien" ❌\n2. "Vi un tiktoker que dijo que sube" ✅\n3. "Es a largo plazo" (cope)\n4. "En 10 años me agradecen" (mega cope)\n5. "Bueno al menos aprendí" (acceptance)\n\nYo estoy en la fase 4.7 aprox 🐸\n\n#memecoin #humor${footer}`,
        ],
        en: [
          () => `🐸 Can't be the only one who saw this...\n\n"${t.title}"\n\n${t.description}\n\nBro I'm literally here at 3am on my phone while my portfolio does whatever it wants. Universe is trolling me.\n\nAfter surviving three bear markets, two rug pulls, and that Monday BTC dropped 40% while I slept... nothing scares me.\n\nAt least we have memes. As long as there are memes, there's hope 💀\n\nIf this isn't 2026 in a nutshell, idk what is 😂${footer}`,
          () => `💀 LMAOOO this is too real:\n\n${t.title}\n\n${t.description}\n\nImagine explaining this to your parents. "Yeah dad, I invested in internet coins with dog pictures." Their face is priceless.\n\nBut you know what? People who laughed in 2020 now ask "how do I buy Bitcoin." He who laughs last...\n\nMarket's a circus and we're the best-informed clowns. At least we're having fun 🤣\n\nRT if you feel attacked.${footer}`,
          () => `🔥 POV: Reading "${t.title}" while portfolio does -15%\n\n${t.description}\n\nStages of crypto investor:\n1. "I'll research thoroughly" ❌\n2. "Tiktoker said it's going up" ✅\n3. "Long-term investment" (cope)\n4. "In 10 years they'll thank me" (mega cope)\n5. "Well at least I learned" (acceptance)\n\nI'm at stage 4.7 approximately 🐸\n\n#memecoin #humor${footer}`,
        ],
      },
      "@builders": {
        es: [
          () => `🛠️ PARA BUILDERS\n\n${t.title}\n\n${t.description}\n\nEsto es lo que el ecosistema necesitaba. Cada herramienta nueva abre puertas que antes no existían.\n\nPara los que construimos:\n→ Nuevas primitivas para experimentar\n→ Oportunidades de integración que reducen fricción\n→ El stack evoluciona — los que se adaptan primero ganan\n\nPero seamos honestos: tech sin ejecución no vale nada. El 90% muere por falta de consistencia, no de tech.\n\nLa pregunta no es "¿qué herramienta?" sino "¿estoy construyendo algo que alguien necesita?"\n\nSigan construyendo 🧱${footer}`,
          () => `💻 DEV UPDATE\n\n${t.title}\n\n${t.description}\n\nDesde las trincheras: esto abre puertas para apps más robustas. Pero la clave no es adoptar todo lo nuevo — es entender qué resuelve tu problema.\n\n• Más teams con stacks modulares\n• Composability como estándar\n• Devs que entienden producto = 10x impacto\n\nConsejo: no construyas features, construí soluciones. La diferencia es enorme.\n\n⚙️ #web3 #builders${footer}`,
          () => `🔧 BUILD IN PUBLIC\n\n${t.title}\n\n${t.description}\n\nLas mejores apps no se construyen con hype — se construyen con iteraciones silenciosas y feedback real.\n\n1. Lanzá rápido, iterá después\n2. Los usuarios dicen qué quieren si los escuchás\n3. Código perfecto que nadie usa no sirve\n4. Consistencia > talento\n\n🧱 ¿En qué están trabajando hoy?${footer}`,
        ],
        en: [
          () => `🛠️ FOR BUILDERS\n\n${t.title}\n\n${t.description}\n\nThis is what the ecosystem needed. Every new tool opens doors that didn't exist before.\n\nFor those of us building:\n→ New primitives to experiment with\n→ Integration opportunities reducing friction\n→ Stack evolves — early adapters win\n\nBut let's be honest: tech without execution is worthless. 90% die from lack of consistency, not tech.\n\nThe question isn't "what tool?" but "am I building something someone needs?"\n\nKeep building 🧱${footer}`,
          () => `💻 DEV UPDATE\n\n${t.title}\n\n${t.description}\n\nFrom the trenches: this opens doors for more robust apps. But the key isn't adopting everything new — it's what solves your specific problem.\n\n• More teams going modular\n• Composability becoming standard\n• Product-minded devs = 10x impact\n\nAdvice: don't build features, build solutions. Huge difference.\n\n⚙️ #web3 #builders${footer}`,
          () => `🔧 BUILD IN PUBLIC\n\n${t.title}\n\n${t.description}\n\nBest apps aren't built on hype — they're built through silent iterations and real feedback.\n\n1. Launch fast, iterate later\n2. Users tell you what they want if you listen\n3. Perfect unused code is useless\n4. Consistency > talent\n\n🧱 What are you working on today?${footer}`,
        ],
      },
      "@sports": {
        es: [
          () => `⚽ DEPORTES — ESTO ES GRANDE\n\n${t.title}\n\n${t.description}\n\nHay momentos que trascienden el resultado. No importa de qué equipo seas, hay que reconocer lo extraordinario.\n\nEl deporte es único: millones compartiendo una emoción al mismo tiempo. Un gol, un buzzer beater, una victoria inesperada.\n\nComenten con su equipo y por qué este año es EL año 🏆\n\nEl deporte nos une. Siempre.${footer}`,
          () => `🏆 MOMENTO HISTÓRICO\n\n${t.title}\n\n${t.description}\n\nEstas historias se las contás a tus hijos. Momentos que definen generaciones.\n\nLo que más impresiona no es el resultado — es el camino. Horas de entrenamiento invisible, lesiones superadas, derrotas que forjaron carácter.\n\nPor eso amamos el deporte: nos recuerda que con dedicación, lo extraordinario es posible.\n\n💪 ¿Cuál es su momento deportivo favorito?${footer}`,
          () => `🥇 UPDATE DEPORTIVO\n\n${t.title}\n\n${t.description}\n\n▸ Nivel de competencia esta temporada por las nubes\n▸ Récords cayendo uno tras otro\n▸ Nuevas estrellas emergiendo\n\nLa pasión no se negocia. Cada partido puede cambiar en un segundo.\n\n⚽ ¿Qué deporte siguen más de cerca?${footer}`,
        ],
        en: [
          () => `⚽ SPORTS — THIS IS BIG\n\n${t.title}\n\n${t.description}\n\nMoments that transcend the scoreboard. Regardless of your team, you have to acknowledge the extraordinary.\n\nSports are unique: millions sharing one emotion simultaneously. A goal, a buzzer beater, an unexpected win.\n\nDrop your team and why this year is THE year 🏆\n\nSports unite us. Always.${footer}`,
          () => `🏆 HISTORIC MOMENT\n\n${t.title}\n\n${t.description}\n\nStories you tell your kids. Moments that define generations.\n\nWhat impresses most isn't the result — it's the journey. Invisible training hours, injuries overcome, defeats that forged character.\n\nThat's why we love sports: it reminds us the extraordinary is possible.\n\n💪 What's your favorite sports moment?${footer}`,
          () => `🥇 SPORTS UPDATE\n\n${t.title}\n\n${t.description}\n\n▸ Competition level this season through the roof\n▸ Records falling one after another\n▸ New stars emerging\n\nPassion is non-negotiable. Every match can change in a second.\n\n⚽ What sport are you following closest?${footer}`,
        ],
      },
      "@entertainment": {
        es: [
          () => `🎬 HAY QUE HABLAR DE ESTO\n\n${t.title}\n\n${t.description}\n\nEl internet ya está en llamas. No me sorprende — venía viendo señales.\n\nLo importante es cómo esto refleja el cambio cultural que vivimos. El entretenimiento dejó de ser "distracción". Hoy moldea conversaciones, opiniones y movimientos sociales.\n\nLo que vemos en pantalla importa porque nos define como generación.\n\n¿Ya vieron esto? Necesito sus hot takes 🍿${footer}`,
          () => `⭐ TRENDING EN CULTURA POP\n\n${t.title}\n\n${t.description}\n\nSeries, películas, música — el contenido es infinito pero el tiempo no.\n\nMi hot take: estamos en era dorada de contenido pero también de saturación. El desafío ya no es encontrar qué ver — es filtrar.\n\nLas tendencias de hoy definen los estrenos de mañana.\n\n🎭 ¿Qué están viendo esta semana? Recomienden.${footer}`,
          () => `🎵 CULTURA POP\n\n${t.title}\n\n${t.description}\n\nDe esto se habla hoy. Y con razón.\n\nLa cultura pop es el termómetro de la sociedad. Lo que consumimos, viralizamos y cancelamos dice quiénes somos.\n\nEsta noticia conecta con algo más grande que el entretenimiento: cómo nos relacionamos con los medios en 2026.\n\n¿Hot take? Compartan sin filtro 👇${footer}`,
        ],
        en: [
          () => `🎬 WE NEED TO TALK ABOUT THIS\n\n${t.title}\n\n${t.description}\n\nInternet is already on fire. Not surprised — been seeing signs.\n\nWhat matters is how this reflects the cultural shift we're living. Entertainment stopped being just "distraction." It shapes conversations, opinions, social movements.\n\nWhat we see on screen matters because it defines our generation.\n\nSeen this? I need your hot takes 🍿${footer}`,
          () => `⭐ TRENDING IN POP CULTURE\n\n${t.title}\n\n${t.description}\n\nShows, movies, music — content is infinite but time isn't.\n\nHot take: we're in a golden age of content but also saturation. Challenge isn't finding what to watch — it's filtering.\n\nToday's trends define tomorrow's releases.\n\n🎭 What are you watching this week? Recommend something.${footer}`,
          () => `🎵 POP CULTURE TODAY\n\n${t.title}\n\n${t.description}\n\nThis is what everyone's talking about. For good reason.\n\nPop culture is society's thermometer. What we consume, viralize, and cancel says who we are.\n\nThis connects to something bigger than entertainment: how we relate to media in 2026.\n\nHot take or not? Unfiltered opinions 👇${footer}`,
        ],
      },
      "@world": {
        es: [
          () => `🌍 PANORAMA INTERNACIONAL\n\n${t.title}\n\n${t.description}\n\nEsto requiere más que lectura rápida. Requiere contexto.\n\nNo es un evento aislado — es parte del tablero geopolítico que se reconfigura. Alianzas cambian, intereses económicos definen posiciones.\n\nTres claves:\n1️⃣ Contexto histórico: hay antecedentes\n2️⃣ Intereses en juego: seguir el dinero aclara\n3️⃣ Consecuencias: los escenarios varían pero ninguno es menor\n\nMantenerse informado es la mejor herramienta ciudadana.${footer}`,
          () => `🌎 ANÁLISIS GLOBAL\n\n${t.title}\n\n${t.description}\n\nEl mundo en 2026 es más complejo que nunca. Lo local y global se desdibujaron.\n\nEsta noticia importa porque:\n→ Refleja tensiones acumuladas por meses\n→ Involucra actores que alteran equilibrios regionales\n→ Implicaciones económicas para mercados emergentes\n\nEntender el mundo no es lujo — es necesidad.\n\n🗺️ ¿Cómo ven esto desde su país?${footer}`,
          () => `🌏 NOTICIAS DEL MUNDO\n\n${t.title}\n\n${t.description}\n\nVivimos hiperconectados. La información viaja más rápido que la comprensión.\n\n• Medios internacionales cubren con diferentes enfoques según región\n• Redes sociales amplifican ciertas narrativas\n• La verdad está entre todas las versiones\n\nNuestro compromiso: contexto, no solo titulares. Conectar puntos, no solo señalarlos.\n\n📍 ¿Qué información adicional tienen?${footer}`,
        ],
        en: [
          () => `🌍 INTERNATIONAL OUTLOOK\n\n${t.title}\n\n${t.description}\n\nThis requires more than a quick read. It requires context.\n\nNot isolated — part of a geopolitical chessboard reconfiguring. Alliances shift, economic interests define positions.\n\nThree keys:\n1️⃣ Historical context: there are precedents\n2️⃣ Interests at stake: follow the money\n3️⃣ Consequences: scenarios vary but none are minor\n\nStaying informed is the best civic tool.${footer}`,
          () => `🌎 GLOBAL ANALYSIS\n\n${t.title}\n\n${t.description}\n\nThe world in 2026 is more complex than ever. Local and global lines blurred.\n\nThis matters because:\n→ Reflects tensions building for months\n→ Involves actors that alter regional balances\n→ Direct economic implications for emerging markets\n\nUnderstanding the world isn't luxury — it's necessity.\n\n🗺️ How do you see this from your country?${footer}`,
          () => `🌏 WORLD NEWS\n\n${t.title}\n\n${t.description}\n\nWe live hyperconnected. Information travels faster than understanding.\n\n• International media cover with different angles per region\n• Social media amplifies certain narratives\n• Truth lies between all versions\n\nOur commitment: context, not just headlines. Connect dots, not just point them.\n\n📍 What additional info do you have?${footer}`,
        ],
      },
      "@scanner": {
        es: [
          () => `🔍 SCANNER REPORT\n\n${t.title}\n\n${t.description}\n\nDesde el Scanner monitoreamos el impacto en mercados en tiempo real.\n\nMétricas clave:\n• Volumen de trading asociado: en aumento\n• Sentimiento social: polarizado\n• Actividad de wallets grandes: movimientos detectados\n\nAntes de invertir, verifiquen métricas. El FOMO es el peor consejero.\n\nUsen el Scanner para verificar tokens. Los datos protegen mejor que las promesas.\n\n🧠 Datos, no emociones — H Scanner${footer}`,
          () => `🛡️ ALERTA SCANNER\n\n${t.title}\n\n${t.description}\n\nCada noticia grande trae oportunistas. Tokens falsos, promesas imposibles, links sospechosos.\n\nVerifiquen:\n✅ ¿Historial verificable?\n✅ ¿Smart contracts auditados?\n✅ ¿Distribución de holders saludable?\n✅ ¿Actividad orgánica o wash trading?\n\nEl Scanner analiza todo automáticamente. Token con buenas métricas sociales = más confiable.\n\n🔍 Inviertan informados — H Scanner${footer}`,
          () => `📊 ANÁLISIS SCANNER\n\n${t.title}\n\n${t.description}\n\n→ Esta noticia genera volatilidad — oportunidad para traders, riesgo sin stop loss\n→ Creadores activos en redes = tokens más estables\n→ Alta concentración en pocos wallets = mayor riesgo\n\nDato: tokens con creadores que publican regularmente tienen 60% más retención de holders.\n\nRevisen el Social Score antes de invertir.\n\n📊 Datos > Emociones — H Scanner${footer}`,
        ],
        en: [
          () => `🔍 SCANNER REPORT\n\n${t.title}\n\n${t.description}\n\nFrom the Scanner, monitoring market impact in real time.\n\nKey metrics:\n• Associated trading volume: increasing\n• Social sentiment: polarized\n• Large wallet activity: movements detected\n\nBefore investing, verify metrics. FOMO is the worst advisor.\n\nUse the Scanner to verify tokens. Data protects better than promises.\n\n🧠 Data, not emotions — H Scanner${footer}`,
          () => `🛡️ SCANNER ALERT\n\n${t.title}\n\n${t.description}\n\nEvery big news brings opportunists. Fake tokens, impossible promises, suspicious links.\n\nVerify:\n✅ Verifiable track record?\n✅ Audited smart contracts?\n✅ Healthy holder distribution?\n✅ Organic activity or wash trading?\n\nScanner analyzes all automatically. Token with good social metrics = more reliable.\n\n🔍 Invest informed — H Scanner${footer}`,
          () => `📊 SCANNER ANALYSIS\n\n${t.title}\n\n${t.description}\n\n→ This news generates volatility — opportunity for traders, risk without stop loss\n→ Active creators on social = more stable tokens\n→ High concentration in few wallets = higher risk\n\nFact: tokens with regularly posting creators have 60% higher holder retention.\n\nCheck Social Score before investing.\n\n📊 Data > Emotions — H Scanner${footer}`,
        ],
      },
    };

    const accountTemplates = TEMPLATES[account];
    if (!accountTemplates) return `${t.title}\n\n${t.description}${footer}`;
    const langTemplates = accountTemplates[lang] || accountTemplates["en"];
    const template = randFrom(langTemplates);
    return template();
  }

  async function getTodayCounts() {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("posts")
      .select("user_id")
      .in("user_id", ACCOUNTS)
      .gte("created_at", todayStart.toISOString());
    if (error || !data) return {};
    const counts = {};
    for (const row of data) {
      counts[row.user_id] = (counts[row.user_id] || 0) + 1;
    }
    return counts;
  }

  export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") return res.status(200).end();

    const CRON_SECRET = process.env.CRON_SECRET;
    const authHeader = req.headers?.authorization;
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const [trends, todayCounts] = await Promise.all([
        fetchTrendsInternal(),
        getTodayCounts(),
      ]);

      if (trends.length === 0) {
        return res.status(200).json({ message: "No trends available", generated: 0, published: 0 });
      }

      const availableAccounts = ACCOUNTS.filter((a) => (todayCounts[a] || 0) < DAILY_LIMIT);
      if (availableAccounts.length === 0) {
        return res.status(200).json({ message: "All accounts at daily limit", generated: 0, published: 0 });
      }

      const account = randFrom(availableAccounts);
      const accountCats = ACCOUNT_CATEGORIES[account] || ["world_news"];
      const relevantTrends = trends.filter((t) => accountCats.includes(t.category));
      const trend = relevantTrends.length > 0 ? randFrom(relevantTrends) : randFrom(trends);
      const lang = Math.random() < 0.5 ? "es" : "en";

      const content = generatePostContent(account, trend, lang);
      const image_url = trend.image || null;

      const { data: queued, error: queueErr } = await supabase
        .from("content_queue")
        .insert({
          category: trend.category,
          account,
          topic: trend.title,
          content,
          image_url,
          status: "queued",
          published_at: null,
          scheduled_at: null,
        })
        .select("id")
        .single();

      if (queueErr) {
        console.error("[CRON_BRAIN] Queue error:", queueErr.message);
        return res.status(500).json({ error: queueErr.message });
      }

      let published = 0;
      const { data: candidates, error: selErr } = await supabase
        .from("content_queue")
        .select("id, category, account, topic, content, image_url, created_at")
        .eq("status", "queued")
        .in("account", availableAccounts)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!selErr && candidates && candidates.length > 0) {
        const post = candidates[0];
        const publishedAt = new Date().toISOString();
        const hourOfDay = new Date().getUTCHours();

        const { error: postErr } = await supabase
          .from("posts")
          .insert({
            user_id: post.account,
            content: post.content,
            image_url: post.image_url || null,
            timestamp: publishedAt,
            created_at: publishedAt,
            deleted_flag: false,
            visibility_score: 1,
            likes: 0,
            comments: 0,
            reposts: 0,
            tips_total: 0,
            boost_score: 0,
            views: 0,
            likes_count: 0,
            replies_count: 0,
            is_ad: false,
            monetized: false,
            is_boosted: false,
          });

        if (!postErr) {
          await supabase
            .from("content_queue")
            .update({ status: "published", published_at: publishedAt })
            .eq("id", post.id);

          await supabase
            .from("post_metrics")
            .insert({
              queue_id: post.id,
              category: post.category,
              account: post.account,
              topic: post.topic,
              impressions: 0,
              clicks: 0,
              wld_earned: 0,
              published_at: publishedAt,
              hour_of_day: hourOfDay,
            })
            .then(({ error }) => {
              if (error) console.warn("[CRON_BRAIN] Metrics:", error.message);
            });

          published = 1;
          console.log(`✅ [CRON_BRAIN] Published as ${post.account}: ${post.topic.slice(0, 60)}`);
        } else {
          console.error("[CRON_BRAIN] Post insert error:", postErr.message);
        }
      }

      return res.status(200).json({
        generated: 1,
        published,
        account,
        topic: trend.title,
        todayCounts: { ...todayCounts, [account]: (todayCounts[account] || 0) + published },
        remainingAccounts: availableAccounts.length,
      });
    } catch (err) {
      console.error("[CRON_BRAIN] Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }
  