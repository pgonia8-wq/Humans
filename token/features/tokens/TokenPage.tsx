import { useState, useEffect, useCallback, useRef } from "react";
import { formatNum, type Token, type TokenDetail, type HolderInfo, type ActivityListResponse } from "@/services/types";
import { api, type Candle } from "@/services/api";
import { useApp } from "@/context/AppContext";
import BuySellUI from "@/features/payments/BuySellUI";

type TabName = "overview" | "holders" | "activity";
type ChartPeriod = "1h" | "6h" | "24h" | "7d" | "30d" | "all";

function CandlestickChart({ tokenId }: { tokenId: string }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState<ChartPeriod>("24h");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getPriceHistory(tokenId, period).then((res) => {
      if (!cancelled) {
        setCandles(res.candles ?? []);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tokenId, period]);

  const periods: ChartPeriod[] = ["1h", "6h", "24h", "7d", "30d", "all"];

  if (loading) {
    return (
      <div style={{
        height: 200, background: "rgba(255,255,255,0.03)", borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#555", fontSize: 13, marginBottom: 14,
      }}>
        Loading chart...
      </div>
    );
  }

  if (candles.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          height: 180, background: "rgba(255,255,255,0.03)", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#555", fontSize: 13,
        }}>
          Chart available after first trades
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "center" }}>
          {periods.map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: period === p ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)",
              color: period === p ? "#8b5cf6" : "#666",
            }}>{p}</button>
          ))}
        </div>
      </div>
    );
  }

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || minP * 0.01 || 0.0000001;
  const padding = range * 0.1;
  const adjMin = minP - padding;
  const adjMax = maxP + padding;
  const adjRange = adjMax - adjMin;

  const svgW = 320;
  const svgH = 170;
  const candleW = Math.max(2, Math.min(12, (svgW - 20) / candles.length - 1));
  const gap = 1;
  const totalCandleW = candleW + gap;
  const startX = Math.max(0, (svgW - candles.length * totalCandleW) / 2);

  return (
    <div style={{ marginBottom: 14 }}>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", height: 200 }}>
        {candles.map((c, i) => {
          const x = startX + i * totalCandleW;
          const bullish = c.close >= c.open;
          const color = bullish ? "#10f090" : "#f05050";

          const wickTop = svgH - ((c.high - adjMin) / adjRange) * (svgH - 10) - 5;
          const wickBot = svgH - ((c.low - adjMin) / adjRange) * (svgH - 10) - 5;
          const bodyTop = svgH - ((Math.max(c.open, c.close) - adjMin) / adjRange) * (svgH - 10) - 5;
          const bodyBot = svgH - ((Math.min(c.open, c.close) - adjMin) / adjRange) * (svgH - 10) - 5;
          const bodyH = Math.max(1, bodyBot - bodyTop);

          return (
            <g key={i}>
              <line
                x1={x + candleW / 2} y1={wickTop}
                x2={x + candleW / 2} y2={wickBot}
                stroke={color} strokeWidth={1}
              />
              <rect
                x={x} y={bodyTop}
                width={candleW} height={bodyH}
                fill={bullish ? color : color}
                rx={1}
              />
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 4, marginTop: 4, justifyContent: "center" }}>
        {periods.map((p) => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
            border: "none", cursor: "pointer",
            background: period === p ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)",
            color: period === p ? "#8b5cf6" : "#666",
          }}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function QuickTradeButtons({
  mode,
  token,
  holding,
  onTrade,
}: {
  mode: "buy" | "sell";
  token: TokenDetail;
  holding: number;
  onTrade: (percent: number) => void;
}) {
  const percents = [5, 10, 25, 50, 75, 100];
  const color = mode === "buy" ? "#10f090" : "#f05050";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
      {percents.map((p) => (
        <button
          key={p}
          onClick={() => onTrade(p)}
          style={{
            padding: "10px 0",
            borderRadius: 10,
            border: `1px solid ${color}40`,
            background: "rgba(255,255,255,0.04)",
            color,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {p}%
        </button>
      ))}
    </div>
  );
}

function OverviewTab({ token, formatPrice }: { token: TokenDetail; formatPrice: (w: number) => string }) {
  const curvePercent = token.curvePercent ?? 0;
  const stats = token.stats;

  return (
    <div>
      <div style={{
        padding: 16, background: "rgba(255,255,255,0.04)",
        borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Token Information
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          {token.avatarUrl ? (
            <img src={token.avatarUrl} alt={token.name} style={{
              width: 48, height: 48, borderRadius: "50%", objectFit: "cover",
              border: "2px solid rgba(139,92,246,0.3)",
            }} />
          ) : (
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "linear-gradient(135deg,#8b5cf620,#06d6f720)",
              border: "2px solid rgba(139,92,246,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
            }}>
              {token.emoji}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#e8e9f0" }}>{token.name}</div>
            <div style={{ fontSize: 13, color: "#8b5cf6", fontWeight: 600 }}>${token.symbol}</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6 }}>{token.description}</p>
      </div>

      <div style={{
        padding: 16, background: "rgba(255,255,255,0.04)",
        borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#ccc", fontWeight: 600 }}>Bonding curve progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: curvePercent >= 100 ? "#10f090" : "#f7a606" }}>
            {curvePercent.toFixed(1)}%
          </span>
        </div>
        <div style={{
          height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${Math.min(100, curvePercent)}%`,
            background: curvePercent >= 100
              ? "linear-gradient(90deg,#10f090,#06d6f7)"
              : "linear-gradient(90deg,#f7a606,#f05050)",
            borderRadius: 4, transition: "width 0.5s",
          }} />
        </div>
      </div>

      {token.contractAddress && (
        <div style={{
          padding: 16, background: "rgba(255,255,255,0.04)",
          borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>Contract Address</div>
          <div style={{ fontSize: 13, fontFamily: "monospace", color: "#8b5cf6", wordBreak: "break-all" }}>
            {token.contractAddress.slice(0, 6)}...{token.contractAddress.slice(-4)}
          </div>
        </div>
      )}

      <div style={{
        padding: 16, background: "rgba(255,255,255,0.04)",
        borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Creator
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#06d6f7,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
          }}>
            {token.creatorName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#e8e9f0" }}>{token.creatorName}</span>
          </div>
        </div>
      </div>

      <div style={{
        padding: 16, background: "rgba(255,255,255,0.04)",
        borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Market Stats
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Price USD", value: `$${(token.priceUsdc).toFixed(7)}` },
            { label: "Price WLD", value: `${token.priceWld.toFixed(7)} WLD` },
            { label: "Market Cap", value: `$${formatNum(token.marketCap)}` },
            { label: "24h Volume", value: `$${formatNum(token.volume24h)}` },
            { label: "Liquidity", value: `${formatNum(token.totalWldInCurve ?? 0)} WLD` },
            { label: "FDV", value: `$${formatNum(token.priceUsdc * (token.totalSupply ?? 100000000))}` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10,
            }}>
              <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>{value}</div>
              <div style={{ fontSize: 10, color: "#666", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{
          flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.04)",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 12, color: "#888" }}>🔒 </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>
            {token.lockedSupply > 0 ? `${((token.lockedSupply / token.totalSupply) * 100).toFixed(1)}% Locked` : "0% Locked"}
          </span>
        </div>
        <div style={{
          flex: 1, padding: "12px 16px", background: "rgba(255,255,255,0.04)",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ fontSize: 12, color: "#888" }}>🔥 </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>
            {token.burnedSupply > 0 ? `${((token.burnedSupply / token.totalSupply) * 100).toFixed(1)}% Burned` : "0% Burned"}
          </span>
        </div>
      </div>

      {stats && (
        <div style={{
          padding: 16, background: "rgba(255,255,255,0.04)",
          borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Transactions
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "TXNS", value: String(stats.txns), color: "#ccc" },
              { label: "BUYS", value: String(stats.buys), color: "#10f090" },
              { label: "SELLS", value: String(stats.sells), color: "#f05050" },
              { label: "VOLUME", value: `$${formatNum(stats.volume)}`, color: "#ccc" },
              { label: "BUY VOL", value: `$${formatNum(stats.buyVolume)}`, color: "#10f090" },
              { label: "SELL VOL", value: `$${formatNum(stats.sellVolume)}`, color: "#f05050" },
              { label: "MAKERS", value: String(stats.makers), color: "#ccc" },
              { label: "BUY %", value: `${stats.buyPercent}%`, color: "#10f090" },
              { label: "SELL %", value: `${stats.sellPercent}%`, color: "#f05050" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 9, color: "#555", marginTop: 2, textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        padding: 16, background: "rgba(255,255,255,0.04)",
        borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Supply", value: formatNum(token.totalSupply, 0) },
            { label: "Created", value: token.createdAt ? new Date(token.createdAt).toLocaleDateString() : "N/A" },
            { label: "Launchpad", value: "H App" },
            { label: "Blockchain", value: "Worldchain" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#ccc" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {token.socials && Object.keys(token.socials).length > 0 && (
        <div style={{
          padding: 16, background: "rgba(255,255,255,0.04)",
          borderRadius: 14, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 10 }}>Socials</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(token.socials).map(([key, url]) => (
              <a key={key} href={url as string} target="_blank" rel="noopener noreferrer" style={{
                padding: "6px 14px", background: "rgba(255,255,255,0.06)", borderRadius: 8,
                color: "#8b5cf6", fontSize: 12, fontWeight: 600, textDecoration: "none",
                border: "1px solid rgba(139,92,246,0.2)",
              }}>
                {key === "twitter" ? "𝕏 Twitter" : key === "telegram" ? "📱 Telegram" : "🌐 Website"}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HoldersTab({ holders }: { holders: HolderInfo[] }) {
  if (holders.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No holders yet</div>;
  }
  return (
    <div>
      {holders.map((h, i) => (
        <div key={h.userId} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{ fontSize: 12, color: "#555", width: 20, textAlign: "right" }}>#{i + 1}</span>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#8b5cf620,#06d6f720)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: "#8b5cf6",
          }}>
            {(h.username || "?")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8e9f0" }}>{h.username}</div>
            <div style={{ fontSize: 11, color: "#666" }}>{h.percentage.toFixed(1)}%</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
              {formatNum(h.amount, 0)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityTab({ activities }: { activities: ActivityListResponse }) {
  if (activities.activities.length === 0) {
    return <div style={{ textAlign: "center", padding: 40, color: "#555" }}>No activity yet</div>;
  }
  return (
    <div>
      {activities.activities.map((a) => (
        <div key={a.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: a.type === "buy" ? "rgba(16,240,144,0.15)" : a.type === "sell" ? "rgba(240,80,80,0.15)" : "rgba(139,92,246,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>
            {a.type === "buy" ? "🟢" : a.type === "sell" ? "🔴" : "⚡"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e9f0" }}>
              <span style={{ color: "#8b5cf6" }}>{a.username}</span>{" "}
              <span style={{
                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: a.type === "buy" ? "rgba(16,240,144,0.2)" : a.type === "sell" ? "rgba(240,80,80,0.2)" : "rgba(139,92,246,0.2)",
                color: a.type === "buy" ? "#10f090" : a.type === "sell" ? "#f05050" : "#8b5cf6",
              }}>
                {a.type.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
              {formatNum(a.amount, 0)} tokens
              {a.total !== undefined ? ` · ${a.total.toFixed(4)} WLD` : ""}
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#555" }}>
            {a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TokenPage() {
  const { navigate, selectedTokenId, user, formatPrice } = useApp();
  const [token, setToken] = useState<TokenDetail | null>(null);
  const [holders, setHolders] = useState<HolderInfo[]>([]);
  const [activities, setActivities] = useState<ActivityListResponse>({ activities: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabName>("overview");
  const [quickMode, setQuickMode] = useState<"buy" | "sell">("buy");
  const [showBuySell, setShowBuySell] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userHolding, setUserHolding] = useState(0);
  const [userAvgPrice, setUserAvgPrice] = useState(0);

  const loadToken = useCallback(async () => {
    if (!selectedTokenId) { setLoading(false); return; }
    try {
      const [t, h, a] = await Promise.all([
        api.getToken(selectedTokenId),
        api.getTokenHolders(selectedTokenId).catch(() => []),
        api.getTokenActivity(selectedTokenId),
      ]);
      setToken(t);
      setHolders(h);
      setActivities(a);

      if (user?.id) {
        const res = await api.getUserHoldings(user.id).catch(() => null);
        if (res) {
          const myHolding = res.holdings.find((hh) => hh.tokenId === selectedTokenId);
          if (myHolding) {
            setUserHolding(myHolding.amount);
            setUserAvgPrice(myHolding.avgBuyPrice);
          }
        }
      }
    } catch (err) {
      console.error("[TokenPage]", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTokenId, user?.id]);

  useEffect(() => { loadToken(); }, [loadToken]);

  useEffect(() => {
    if (!selectedTokenId) return;
    const interval = setInterval(() => {
      api.getToken(selectedTokenId).then((t) => {
        setToken(t);
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTokenId]);

  if (loading) {
    return <div style={{ padding: 32, textAlign: "center", color: "#888" }}>Loading token...</div>;
  }

  if (!token) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
        Token not found.
        <br />
        <button onClick={() => navigate("discovery")} style={{ color: "#8b5cf6", marginTop: 12, background: "none", border: "none", cursor: "pointer" }}>
          Go back
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="slide-up" style={{
        position: "fixed", inset: 0, background: "rgba(13,14,20,0.97)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        zIndex: 200, padding: 32,
      }}>
        <div style={{ fontSize: 72, marginBottom: 24 }}>✅</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "#10f090", marginBottom: 10 }}>Transaction Complete!</h2>
        <p style={{ fontSize: 15, color: "#888", textAlign: "center", marginBottom: 32 }}>
          Your {token.symbol} transaction has been processed.
        </p>
        <button onClick={() => { setSuccess(false); loadToken(); }} style={{
          padding: "14px 48px", background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
          border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
        }}>
          Back to Token
        </button>
      </div>
    );
  }

  const isPositive = token.change24h >= 0;
  const positionValue = userHolding * token.priceWld;
  const positionPnl = userHolding * (token.priceWld - userAvgPrice);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
      }}>
        <button onClick={() => navigate("discovery")} style={{
          background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,
          color: "#e8e9f0", padding: "6px 10px", cursor: "pointer", fontSize: 18,
        }}>
          ←
        </button>
        {token.avatarUrl ? (
          <img src={token.avatarUrl} alt={token.name} style={{
            width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
            border: "1px solid rgba(139,92,246,0.3)",
          }} />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "linear-gradient(135deg,#8b5cf620,#06d6f720)",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {token.emoji}
          </div>
        )}
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: "#e8e9f0" }}>{token.name}</h1>
          <p style={{ fontSize: 11, color: "#666" }}>{token.symbol}</p>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 800, color: "#e8e9f0" }}>
            ${(token.priceUsdc).toFixed(7)}
          </div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: isPositive ? "#10f090" : "#f05050" }}>
            {isPositive ? "+" : ""}{token.change24h.toFixed(1)}%
            <span style={{ color: "#555", fontSize: 10, marginLeft: 4 }}>24h</span>
          </div>
        </div>
      </div>

      <div className="scrollable" style={{ flex: 1, padding: "16px", paddingBottom: 90 }}>
        <CandlestickChart tokenId={token.id} />

        {userHolding > 0 && (
          <div style={{
            padding: 14, background: "rgba(255,255,255,0.04)",
            borderRadius: 12, marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Your Position</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#e8e9f0", fontFamily: "monospace" }}>
                  ${positionValue.toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {formatNum(userHolding, 0)} {token.symbol}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, fontFamily: "monospace",
                  color: positionPnl >= 0 ? "#10f090" : "#f05050",
                }}>
                  {positionPnl >= 0 ? "+" : ""}{positionPnl.toFixed(2)} WLD
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600,
                  color: positionPnl >= 0 ? "#10f090" : "#f05050",
                }}>
                  {userAvgPrice > 0 ? `${(((token.priceWld - userAvgPrice) / userAvgPrice) * 100).toFixed(2)}%` : "0%"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: "#888" }}>Quick Sell</span>
          <button
            onClick={() => setQuickMode(quickMode === "sell" ? "buy" : "sell")}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: quickMode === "sell"
                ? "linear-gradient(135deg,#f05050,#f7a606)"
                : "rgba(255,255,255,0.15)",
              position: "relative", transition: "background 0.3s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: quickMode === "sell" ? 23 : 3,
              transition: "left 0.3s",
            }} />
          </button>
        </div>

        <QuickTradeButtons
          mode={quickMode}
          token={token}
          holding={userHolding}
          onTrade={(percent) => {
            setShowBuySell(true);
          }}
        />

        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
          borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0,
        }}>
          {(["overview", "holders", "activity"] as TabName[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "10px 16px", border: "none", cursor: "pointer",
                background: "transparent",
                borderBottom: tab === t ? "2px solid #e8e9f0" : "2px solid transparent",
                color: tab === t ? "#e8e9f0" : "#666",
                fontSize: 13, fontWeight: tab === t ? 700 : 500,
                textTransform: "capitalize",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t === "holders" ? `Holders (${holders.length})` : t === "activity" ? "Activity" : "Overview"}
            </button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab token={token} formatPrice={formatPrice} />}
        {tab === "holders" && <HoldersTab holders={holders} />}
        {tab === "activity" && <ActivityTab activities={activities} />}
      </div>

      <div style={{
        position: "fixed", bottom: 56, left: 0, right: 0,
        padding: "10px 16px", background: "rgba(13,14,20,0.95)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", gap: 8,
      }}>
        <button
          onClick={() => { setQuickMode("buy"); setShowBuySell(true); }}
          style={{
            flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,#8b5cf6,#06d6f7)",
            color: "#fff", fontSize: 14, fontWeight: 800,
          }}
        >
          Buy
        </button>
        <button
          onClick={() => { setQuickMode("sell"); setShowBuySell(true); }}
          style={{
            flex: 1, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "rgba(240,80,80,0.2)", color: "#f05050", fontSize: 14, fontWeight: 800,
          }}
        >
          Sell
        </button>
      </div>

      {showBuySell && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "flex-end", zIndex: 300, backdropFilter: "blur(4px)",
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBuySell(false); }}
        >
          <div className="slide-up" style={{
            width: "100%", maxHeight: "80vh", background: "#111218",
            borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.1)",
            borderBottom: "none", padding: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#e8e9f0" }}>
                {quickMode === "buy" ? "Buy" : "Sell"} {token.symbol}
              </h3>
              <button onClick={() => setShowBuySell(false)} style={{
                background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer",
              }}>×</button>
            </div>
            <BuySellUI token={token} defaultTab={quickMode} onSuccess={() => { setShowBuySell(false); setSuccess(true); }} />
          </div>
        </div>
      )}
    </div>
  );
}
