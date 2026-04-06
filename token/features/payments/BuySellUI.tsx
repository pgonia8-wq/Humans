import { useState, useEffect } from "react";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useApp } from "@/context/AppContext";
import { api } from "@/services/api";
import type { Token } from "@/services/types";
import { motion } from "framer-motion";
import { X, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";

type Tab = "buy" | "sell";

const RECEIVER = import.meta.env?.VITE_PAYMENT_RECEIVER || "";

function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface Props {
  token: Token;
  onSuccess: () => void;
  defaultTab?: Tab;
  onClose?: () => void;
}

export default function BuySellUI({ token, onSuccess, defaultTab, onClose }: Props) {
  const { balanceWld, updateBalance, emitToBridge, user, displayCurrency, wldUsdRate } = useApp();
  const [tab, setTab] = useState<Tab>(defaultTab ?? "buy");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orbChecked, setOrbChecked] = useState(false);
  const [orbVerified, setOrbVerified] = useState(false);
  const [userHolding, setUserHolding] = useState(0);
  const [success, setSuccess] = useState(false);

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
    setError(null);
  };

  const handlePercentSell = (percent: number) => {
    const val = Math.floor(userHolding * percent / 100);
    setAmount(String(val));
    setError(null);
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

        if (!MiniKit.isInstalled()) throw new Error("World App not detected. Open from World App.");
        if (!RECEIVER) throw new Error("Payment receiver not configured");

        const payRes = await MiniKit.commandsAsync.pay({
          reference: generatePayReference(),
          to: RECEIVER,
          tokens: [{
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(amountWld, Tokens.WLD).toString(),
          }],
          description: `Buy ${token.symbol} tokens`,
        });

        if (payRes?.finalPayload?.status !== "success") {
          throw new Error("Payment cancelled or failed");
        }

        const result = await api.buyToken({ tokenId: token.id, amountWld, userId: user.id });
        if (!result.success) { setError(result.message || "Buy failed"); setLoading(false); return; }

        updateBalance(balanceWld - amountWld, 0);
        emitToBridge("onTokenPurchased", {
          tokenId: token.id, tokenSymbol: token.symbol, tokensReceived: result.tokensReceived,
          amountWld, newPrice: result.newPrice, userId: user.id,
        });
      } else {
        if (numAmount > userHolding) {
          setError(`Insufficient balance: have ${userHolding.toLocaleString()} ${token.symbol}`);
          setLoading(false);
          return;
        }

        const result = await api.sellToken({ tokenId: token.id, tokensToSell: numAmount, userId: user.id });
        if (!result.success) { setError(result.message || "Sell failed"); setLoading(false); return; }

        updateBalance(balanceWld + result.wldReceived, 0);
        emitToBridge("onTokenSold", {
          tokenId: token.id, tokenSymbol: token.symbol, tokensSold: numAmount,
          wldReceived: result.wldReceived, userId: user.id,
        });
      }

      setSuccess(true);
      setTimeout(() => { setSuccess(false); onSuccess(); }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("cancelled")) setError(msg);
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

  const percents = [5, 10, 25, 50, 75, 100];

  if (!orbChecked) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (!orbVerified) {
    return (
      <div className="text-center py-6 space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <div className="text-sm font-bold text-foreground">ORB Verification Required</div>
        <p className="text-xs text-muted-foreground px-4">Complete your ORB verification in the main H app to start trading.</p>
        {onClose && (
          <button onClick={onClose} data-testid="button-close-orb" className="text-xs text-primary font-medium">Close</button>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6 space-y-2">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
          <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
        </motion.div>
        <div className="text-sm font-bold text-emerald-400">Trade Successful</div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3" data-testid="buy-sell-ui">
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl bg-card/60 border border-border/30 overflow-hidden">
          <button
            onClick={() => { setTab("buy"); setAmount(""); setError(null); }}
            data-testid="tab-buy"
            className={`px-5 py-2 text-xs font-bold transition-all ${tab === "buy" ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"}`}
          >
            Buy
          </button>
          <button
            onClick={() => { setTab("sell"); setAmount(""); setError(null); }}
            data-testid="tab-sell"
            className={`px-5 py-2 text-xs font-bold transition-all ${tab === "sell" ? "bg-red-500/20 text-red-400" : "text-muted-foreground"}`}
          >
            Sell
          </button>
        </div>
        {onClose && (
          <button onClick={onClose} data-testid="button-close-trade" className="p-1.5 rounded-lg hover:bg-card/60">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground">
        {tab === "buy" ? `Balance: ${balanceWld.toFixed(2)} WLD` : `Holdings: ${userHolding.toLocaleString()} ${token.symbol}`}
      </div>

      <input
        type="number"
        value={amount}
        onChange={(e) => { setAmount(e.target.value); setError(null); }}
        placeholder={tab === "buy" ? `Amount in ${displayCurrency}` : `Amount in ${token.symbol}`}
        data-testid="input-amount"
        className="w-full p-3 rounded-xl bg-card/60 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />

      <div className="grid grid-cols-6 gap-1.5">
        {percents.map((p) => (
          <button
            key={p}
            onClick={() => tab === "buy" ? handlePercentBuy(p) : handlePercentSell(p)}
            data-testid={`percent-${p}`}
            className={`py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
              tab === "buy"
                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                : "border-red-500/30 text-red-400 hover:bg-red-500/10"
            }`}
          >
            {p}%
          </button>
        ))}
      </div>

      {numAmount > 0 && (
        <div className="text-xs space-y-1 p-2.5 rounded-xl bg-card/30 border border-border/20">
          {tab === "buy" ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. tokens</span>
                <span className="text-foreground font-medium">~{estimatedTokens.toLocaleString()} {token.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (2%)</span>
                <span className="text-foreground font-medium">{((displayCurrency === "WLD" ? numAmount : numAmount / wldUsdRate) * 0.02).toFixed(4)} WLD</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. receive</span>
                <span className="text-foreground font-medium">~{estimatedWld.toFixed(4)} WLD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slippage (10%) + Fee (3%)</span>
                <span className="text-foreground font-medium">~{(numAmount * token.priceWld * 0.127).toFixed(4)} WLD</span>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
          {error}
        </motion.div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || !numAmount || numAmount <= 0}
        data-testid="button-submit-trade"
        className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${
          tab === "buy"
            ? "bg-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.3)]"
            : "bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
        ) : (
          tab === "buy" ? "Buy" : "Sell"
        )}
      </button>
    </div>
  );
}
