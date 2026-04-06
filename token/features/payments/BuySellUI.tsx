import { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/services/api";
import type { Token } from "@/services/types";

type Tab = "buy" | "sell";

const RECEIVER = (import.meta as any).env?.VITE_PAYMENT_RECEIVER || "";

function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface Props {
  token: Token;
  onSuccess: () => void;
  defaultTab?: Tab;
}

export default function BuySellUI({ token, onSuccess, defaultTab }: Props) {
  const { balanceWld, updateBalance, emitToBridge, user, formatPrice, displayCurrency, wldUsdRate } = useApp();
  const [tab, setTab] = useState<Tab>(defaultTab ?? "buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orbChecked, setOrbChecked] = useState(false);
  const [orbVerified, setOrbVerified] = useState(false);
  const [userHolding, setUserHolding] = useState(0);
  const paymentCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (user?.id && user.id !== "usr_guest") {
      api.checkOrbStatus(user.id).then((res) => {
        setOrbVerified(res.orbVerified);
        setOrbChecked(true);
      }).catch(() => setOrbChecked(true));
    } else {
      setOrbChecked(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && token?.id) {
      api.getUserHoldings(user.id).then((res) => {
        const h = res.holdings.find((hh) => hh.tokenId === token.id);
        if (h) setUserHolding(h.amount);
      }).catch(() => {});
    }
  }, [user?.id, token?.id]);

  const numAmount = parseFloat(amount) || 0;

  const handlePercentBuy = (percent: number) => {
    const val = (balanceWld * percent / 100).toFixed(4);
    setAmount(val);
  };

  const handlePercentSell = (percent: number) => {
    const val = Math.floor(userHolding * percent / 100);
    setAmount(String(val));
  };

  const requestPayment = (amountWld: number, description: string): Promise<string> => {
    if (!RECEIVER) {
      return Promise.reject(new Error("Payment receiver address not configured"));
    }

    const origin = (import.meta as any).env?.VITE_PARENT_ORIGIN || "*";
    const reference = generatePayReference();

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        paymentCancelRef.current = null;
        reject(new Error("Payment timeout — no response from World App"));
      }, 30000);

      paymentCancelRef.current = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        paymentCancelRef.current = null;
        reject(new Error("Payment cancelled by user"));
      };

      const handler = (e: MessageEvent) => {
        if (e.data?.type === "PAYMENT_RESULT") {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
          paymentCancelRef.current = null;
          if (e.data.payload?.success && e.data.payload?.transactionId) {
            resolve(e.data.payload.transactionId);
          } else {
            reject(new Error(e.data.payload?.error || "Payment cancelled or failed"));
          }
        }
      };

      window.addEventListener("message", handler);

      window.parent?.postMessage({
        type: "REQUEST_PAYMENT",
        payload: {
          reference,
          to: RECEIVER,
          amount: amountWld,
          token: "WLD",
          description,
        },
      }, origin);
    });
  };

  const handleSubmit = async () => {
    if (!numAmount || numAmount <= 0 || !user?.id) return;
    if (!orbVerified) {
      setError("ORB verification required. Verify in the main H app first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (tab === "buy") {
        const amountWld = displayCurrency === "WLD" ? numAmount : numAmount / wldUsdRate;
        if (amountWld > balanceWld) {
          setError("Insufficient WLD balance");
          setLoading(false);
          return;
        }

        const transactionId = await requestPayment(
          amountWld,
          `Buy ${token.symbol} tokens`
        );

        const verifyRes = await api.verifyTokenPayment(transactionId, user.id, "buy_token");
        if (!verifyRes.success) {
          throw new Error("Payment verification failed");
        }

        const result = await api.buyToken({
          tokenId: token.id,
          amountWld,
          userId: user.id,
          transactionId,
        });

        if (!result.success) {
          setError(result.message || "Buy failed");
          return;
        }

        updateBalance(balanceWld - amountWld, 0);
        emitToBridge("onTokenPurchased", {
          tokenId: token.id,
          tokenSymbol: token.symbol,
          tokensReceived: result.tokensReceived,
          amountWld,
          newPrice: result.newPrice,
          userId: user.id,
          transactionId,
        });
      } else {
        if (numAmount > userHolding) {
          setError(`Insufficient balance: have ${userHolding.toLocaleString()} ${token.symbol}`);
          setLoading(false);
          return;
        }

        const result = await api.sellToken({
          tokenId: token.id,
          tokensToSell: numAmount,
          userId: user.id,
        });

        if (!result.success) {
          setError(result.message || "Sell failed");
          return;
        }

        updateBalance(balanceWld + result.wldReceived, 0);
        emitToBridge("onTokenSold", {
          tokenId: token.id,
          tokenSymbol: token.symbol,
          tokensSold: numAmount,
          wldReceived: result.wldReceived,
          userId: user.id,
        });
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("[BuySellUI]", msg);
    } finally {
      setLoading(false);
    }
  };

  const estimatedTokens = tab === "buy" && token.priceWld > 0
    ? Math.floor((displayCurrency === "WLD" ? numAmount : numAmount / wldUsdRate) * (1 - 0.02) / token.priceWld)
    : 0;

  const estimatedWld = tab === "sell" && token.priceWld > 0
    ? numAmount * token.priceWld * (1 - 0.10) * (1 - 0.03)
    : 0;

  if (!orbChecked) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#888" }}>
        Checking verification status...
      </div>
    );
  }

  if (!orbVerified) {
    return (
      <div style={{ textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f7a606", marginBottom: 8 }}>
          ORB Verification Required
        </h3>
        <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 20 }}>
          You need to be ORB-verified to trade tokens. Complete your verification in the main H app.
        </p>
        <div style={{
          padding: "10px 16px", background: "rgba(247,166,6,0.1)",
          border: "1px solid rgba(247,166,6,0.3)", borderRadius: 10,
          fontSize: 12, color: "#f7a606", fontWeight: 600,
        }}>
          Only verified humans can trade
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {(["buy", "sell"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); setAmount(""); }}
            style={{
              flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13,
              background: tab === t
                ? t === "buy" ? "linear-gradient(135deg,#8b5cf6,#6d3fcf)" : "rgba(240,80,80,0.2)"
                : "rgba(255,255,255,0.06)",
              color: tab === t ? (t === "buy" ? "#fff" : "#f05050") : "#888",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {t === "buy" ? "BUY" : "SELL"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#888" }}>
          {tab === "buy"
            ? `Balance: ${balanceWld.toFixed(4)} WLD`
            : `Holdings: ${userHolding.toLocaleString()} ${token.symbol}`
          }
        </span>
        <span style={{ fontSize: 11, color: "#555" }}>
          Price: {formatPrice(token.priceWld)}
        </span>
      </div>

      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%", padding: "14px 70px 14px 14px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, color: "#e8e9f0", fontSize: 20,
            fontFamily: "monospace", fontWeight: 700, outline: "none",
          }}
        />
        <span style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 13, fontWeight: 700, color: "#888",
        }}>
          {tab === "buy" ? (displayCurrency === "WLD" ? "WLD" : "USD") : token.symbol}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
        {[5, 10, 25, 50, 75, 100].map((p) => (
          <button
            key={p}
            onClick={() => tab === "buy" ? handlePercentBuy(p) : handlePercentSell(p)}
            style={{
              padding: "8px 0", background: "rgba(255,255,255,0.06)",
              border: `1px solid ${tab === "buy" ? "#10f09030" : "#f0505030"}`,
              borderRadius: 8, color: tab === "buy" ? "#10f090" : "#f05050",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {p}%
          </button>
        ))}
      </div>

      {numAmount > 0 && (
        <div style={{
          padding: "10px 14px", background: "rgba(139,92,246,0.08)",
          border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, marginBottom: 12,
        }}>
          {tab === "buy" ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#888" }}>You receive (est.)</span>
                <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
                  ~{estimatedTokens.toLocaleString()} {token.symbol}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Fee (2%)</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#666" }}>
                  {(numAmount * 0.02).toFixed(4)} {displayCurrency === "WLD" ? "WLD" : "USD"}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#888" }}>You receive (est.)</span>
                <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: "#e8e9f0" }}>
                  ~{estimatedWld.toFixed(6)} WLD
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#888" }}>Slippage + Fee</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#666" }}>10% + 3%</span>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div style={{
          textAlign: "center", padding: 8, marginBottom: 8, fontSize: 12, color: "#f05050",
          fontWeight: 600, background: "rgba(240,80,80,0.08)", borderRadius: 8,
        }}>
          {error}
        </div>
      )}

      <div style={{
        padding: "6px 10px", marginBottom: 12, fontSize: 10,
        color: "#10f090", fontWeight: 600, textAlign: "center",
        background: "rgba(16,240,144,0.06)", borderRadius: 8,
        border: "1px solid rgba(16,240,144,0.15)",
      }}>
        On-chain payment via World App · ORB verified
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || numAmount <= 0}
        style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 15, fontWeight: 800,
          background: tab === "buy"
            ? "linear-gradient(135deg,#8b5cf6,#06d6f7)"
            : "linear-gradient(135deg,#f05050,#f7a606)",
          color: "#fff", opacity: loading ? 0.7 : 1,
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {loading
          ? "Confirming in World App..."
          : tab === "buy"
          ? `Buy ${token.symbol} with WLD`
          : `Sell ${numAmount > 0 ? numAmount.toLocaleString() : ""} ${token.symbol}`}
      </button>

      {loading && (
        <button
          onClick={() => { paymentCancelRef.current?.(); paymentCancelRef.current = null; }}
          style={{
            width: "100%", marginTop: 8, padding: "10px", borderRadius: 10,
            background: "rgba(240,80,80,0.1)", border: "1px solid rgba(240,80,80,0.3)",
            color: "#f05050", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Cancel Payment
        </button>
      )}
    </div>
  );
}
