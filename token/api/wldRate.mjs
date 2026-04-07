let cached = { rate: 1.0, ts: 0 };

async function tryBinance() {
  const resp = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=WLDUSDT", { signal: AbortSignal.timeout(5000) });
  const data = await resp.json();
  const rate = parseFloat(data.price);
  if (rate > 0) return rate;
  return null;
}

async function tryCoinGecko() {
  const resp = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=worldcoin-wld&vs_currencies=usd", { signal: AbortSignal.timeout(5000) });
  const data = await resp.json();
  const rate = data?.["worldcoin-wld"]?.usd;
  if (rate > 0) return rate;
  return null;
}

async function tryBybit() {
  const resp = await fetch("https://api.bybit.com/v5/market/tickers?category=spot&symbol=WLDUSDT", { signal: AbortSignal.timeout(5000) });
  const data = await resp.json();
  const price = data?.result?.list?.[0]?.lastPrice;
  const rate = parseFloat(price);
  if (rate > 0) return rate;
  return null;
}

export async function fetchWldUsdRate() {
  const now = Date.now();
  if (now - cached.ts < 60000 && cached.rate > 0) return cached.rate;

  const sources = [tryBinance, tryCoinGecko, tryBybit];
  for (const source of sources) {
    try {
      const rate = await source();
      if (rate && rate > 0) {
        cached = { rate, ts: now };
        return rate;
      }
    } catch (e) {
      continue;
    }
  }

  console.error("[wldRate] all sources failed, using cached:", cached.rate);
  return cached.rate;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const rate = await fetchWldUsdRate();
  return res.status(200).json({ rate, ts: cached.ts });
}
