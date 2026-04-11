import { useState, useEffect, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { useWldBalance } from "@/hooks/useWldBalance";
import { api } from "@/services/api";
import { estimateBuy, estimateSell } from "@/services/curve";
import type { Token } from "@/services/types";
import { formatCompact } from "@/services/types";
import { motion } from "framer-motion";
import { X, Loader2, ShieldCheck, ShieldAlert, ArrowUpRight, ArrowDownRight, AlertTriangle, Zap } from "lucide-react";

type Tab = "buy" | "sell";
type BuyStep = "idle" | "checking_orb" | "paying" | "processing" | "success" | "orb_required";

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
  const { balanceWld, balanceUsdc, updateBalance, emitToBridge, requestOrbVerification, user, displayCurrency, wldUsdRate, fmtWld } = useApp();
  const { balance: realWldBalance, refetch: refetchBalance } = useWldBalance();
  const [tab, setTab] = useState<Tab>(defaultTab ?? "buy");
  const [amount, setAmount] = useState("");
  const [buyStep, setBuyStep] = useState<BuyStep>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userHolding, setUserHolding] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (defaultTab) setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (user?.id && token?.id) {
      api.getUserHoldings(user.id).then((res) => {
        const h = res.holdings.find((hh) => hh.tokenId === token.id);
        if (h) setUserHolding(h.amount);
      }).catch(() => {});
    }
  }, [user?.id, token?.id]);

  const numAmount = parseFloat(amount) || 0;
  const walletBal = realWldBalance ? parseFloat(realWldBalance) : 0;

  const handlePercentBuy = (percent: number) => {
    if (displayCurrency === "WLD") {
      setAmount((walletBal * percent / 100).toFixed(4));
    } else {
      setAmount((walletBal * wldUsdRate * percent / 100).toFixed(2));
    }
    setError(null);
  };

  const handlePercentSell = (percent: number) => {
    const val = Math.floor(userHolding * percent / 100);
    setAmount(String(val));
    setError(null);
  };

  const requestPayment = (amountWld: number, description: string): Promise<string> => {
    if (!RECEIVER) return Promise.reject(new Error("Payment receiver not configured"));
    const origin = import.meta.env?.VITE_PARENT_ORIGIN || "*";
    const reference = generatePayReference();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        cancelRef.current = null;
        reject(new Error("Payment timeout"));
      }, 120000);

      cancelRef.current = () => {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        cancelRef.current = null;
        reject(new Error("Payment cancelled"));
      };

      const handler = (e: MessageEvent) => {
        if (e.data?.type === "PAYMENT_RESULT") {
          clearTimeout(timeout);
          window.removeEventListener("message", handler);
          cancelRef.current = null;
          if (e.data.payload?.success && e.data.payload?.transactionId) {
            resolve(e.data.payload.transactionId);
          } else {
            reject(new Error(e.data.payload?.error || "Payment failed"));
          }
        }
      };

      window.addEventListener("message", handler);
      window.parent?.postMessage({
        type: "REQUEST_PAYMENT",
        payload: { reference, to: RECEIVER, amount: amountWld, token: "WLD", description },
      }, origin);
    });
  };

  const handleCancel = () => {
    if (cancelRef.current) cancelRef.current();
    setBuyStep("idle");
    setLoading(false);
    setError(null);
  };

  const getAmountWld = (): number => {
    return displayCurrency === "WLD" ? numAmount : numAmount / wldUsdRate;
  };

  const [confirmHighImpact, setConfirmHighImpact] = useState(false);

  const handleBuy = async () => {
    if (!numAmount || numAmount <= 0 || !user?.id) return;
    const amountWld = getAmountWld();
    if (amountWld < 0.0001) {
      setError("Amount too small (min ~0.0001 WLD)");
      return;
    }
    if (priceImpact > 50 && !confirmHighImpact) {
      setError(`This trade moves the price +${priceImpact.toFixed(1)}%. Tap Buy again to confirm.`);
      setConfirmHighImpact(true);
      return;
    }
    setConfirmHighImpact(false);
    setError(null);
    setBuyStep("checking_orb");

    try {
      const orbRes = await api.checkOrbStatus(user.id);
      if (!orbRes.orbVerified) { setBuyStep("orb_required"); return; }
      setBuyStep("paying");
      const transactionId = await requestPayment(amountWld, `Buy ${token.symbol} tokens`);
      setBuyStep("processing");
      const idempotencyKey = generatePayReference();

      const result = await api.buyToken({
        tokenId: token.id, amountWld, userId: user.id, transactionId, idempotencyKey,
      });

      if (!result.success) { setError(result.message || "Buy failed"); setBuyStep("idle"); return; }

      emitToBridge("onTokenPurchased", {
        tokenId: token.id, tokenSymbol: token.symbol,
        tokensReceived: result.tokensReceived,
        amountWld, newPrice: result.newPrice, userId: user.id,
      });

      refetchBalance();
      setBuyStep("success");
      setTimeout(() => { setBuyStep("idle"); onSuccess(); }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("cancelled")) setBuyStep("idle");
      else if (msg.includes("Concurrent trade") || msg.includes("concurrent")) {
        setError("Someone traded just before you — please retry.");
        setBuyStep("idle");
      } else { setError(msg); setBuyStep("idle"); }
    }
  };

  const handleSell = async () => {
    if (!numAmount || numAmount <= 0 || !user?.id) return;
    const tokensToSell = Math.floor(numAmount);
    if (tokensToSell <= 0) {
      setError("Enter at least 1 token to sell");
      return;
    }
    if (tokensToSell > userHolding) {
      setError("Insufficient balance: have " + userHolding.toLocaleString() + " " + token.symbol);
      return;
    }
    setLoading(true);
    setError(null);
    const idempotencyKey = generatePayReference();
    try {
      const result = await api.sellToken({ tokenId: token.id, tokensToSell, userId: user.id, idempotencyKey });
      if (!result.success) { setError(result.message || "Sell failed"); setLoading(false); return; }
      updateBalance(balanceWld + result.wldReceived, balanceUsdc);
      emitToBridge("onTokenSold", {
        tokenId: token.id, tokenSymbol: token.symbol,
        tokensSold: tokensToSell, wldReceived: result.wldReceived, userId: user.id,
      });
      if (result.wasPartial) {
        setError("Partial payout: you received " + result.wldReceived.toFixed(6) + " WLD (high sell demand reduced your payout)");
      }
      setBuyStep("success");
      setTimeout(() => { setBuyStep("idle"); setLoading(false); onSuccess(); }, result.wasPartial ? 4000 : 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Concurrent trade") || msg.includes("concurrent")) {
        setError("Someone traded just before you — please retry.");
      } else if (msg.includes("2.5%") || msg.includes("Max sell")) {
        setError("Maximum 2.5% of supply per transaction. Split your sell into smaller parts.");
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const handleSubmit = () => { tab === "buy" ? handleBuy() : handleSell(); };

  const amountWldForEstimate = tab === "buy" ? getAmountWld() : 0;
  const estTokens = tab === "buy" && amountWldForEstimate > 0
    ? estimateBuy(amountWldForEstimate, token.circulatingSupply) : 0;
  const estWld = tab === "sell" && numAmount > 0
    ? estimateSell(Math.floor(numAmount), token.circulatingSupply) : 0;
  const buyFeeWld = amountWldForEstimate * 0.02;

  const priceImpact = (() => {
    if (tab !== "buy" || estTokens <= 0 || !token.priceWld || token.priceWld <= 0) return 0;
    const K = 2.35e-20;
    const P0 = 0.00000055;
    const newSupply = token.circulatingSupply + estTokens;
    const newPrice = P0 + K * newSupply * newSupply;
    return ((newPrice - token.priceWld) / token.priceWld) * 100;
  })();

  const percents = [5, 10, 25, 50, 75, 100];

  if (buyStep === "orb_required") {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto border border-yellow-500/20">
          <ShieldAlert className="w-7 h-7 text-yellow-400" />
        </div>
        <div className="text-sm font-bold text-foreground">ORB Verification Required</div>
        <p className="text-[11px] text-muted-foreground px-4">Verify with your World ID ORB to start trading.</p>
        <button
          onClick={async () => {
            const ok = await requestOrbVerification();
            if (ok) setBuyStep("idle");
          }}
          className="px-6 py-2 rounded-xl bg-green-500 text-white text-xs font-bold active:scale-95 transition-transform"
        >
          Verify with ORB
        </button>
        <button onClick={() => setBuyStep("idle")} data-testid="button-back" className="text-xs text-muted-foreground font-bold block mx-auto">Go Back</button>
      </div>
    );
  }

  if (buyStep === "paying") {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
        <div className="text-sm font-bold text-foreground">Confirm in World App</div>
        <p className="text-[11px] text-muted-foreground px-4">Complete the payment in World App</p>
        <button onClick={handleCancel} data-testid="button-cancel-payment" className="text-xs text-red-400 font-bold">Cancel</button>
      </div>
    );
  }

  if (buyStep === "checking_orb") {
    return (
      <div className="text-center py-8 space-y-3">
        <Loader2 className="w-6 h-6 text-green-400 animate-spin mx-auto" />
        <div className="text-xs font-medium text-muted-foreground">Checking verification...</div>
      </div>
    );
  }

  if (buyStep === "processing") {
    return (
      <div className="text-center py-8 space-y-3">
        <Loader2 className="w-6 h-6 text-green-400 animate-spin mx-auto" />
        <div className="text-xs font-medium text-foreground">Executing trade...</div>
        <p className="text-[10px] text-muted-foreground">Processing on bonding curve</p>
      </div>
    );
  }

  if (buyStep === "success") {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6 space-y-2">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
          <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mx-auto border border-green-500/20">
            <ShieldCheck className="w-7 h-7 text-green-400" />
          </div>
        </motion.div>
        <div className="text-sm font-bold text-green-400">Trade Successful</div>
      </motion.div>
    );
  }

  const isBuy = tab === "buy";
  const inputLabel = isBuy
    ? (displayCurrency === "WLD" ? "WLD" : "USD")
    : token.symbol;

  return (
    <div className="space-y-2.5" data-testid="buy-sell-ui">
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg bg-secondary/40 p-0.5 gap-0.5">
          <button onClick={() => { setTab("buy"); setAmount(""); setError(null); }} data-testid="tab-buy"
            className={`px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              isBuy ? "bg-green-500/15 text-green-400 shadow-sm" : "text-muted-foreground"
            }`}>
            Buy
          </button>
          <button onClick={() => { setTab("sell"); setAmount(""); setError(null); }} data-testid="tab-sell"
            className={`px-5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
              !isBuy ? "bg-red-500/15 text-red-400 shadow-sm" : "text-muted-foreground"
            }`}>
            Sell
          </button>
        </div>
        {onClose && (
          <button onClick={onClose} data-testid="button-close-trade" className="p-1 rounded-md hover:bg-secondary/40">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">
          {isBuy ? "Balance" : "Holdings"}
        </span>
        <span className={`font-bold font-mono ${isBuy ? "text-green-400" : "text-foreground"}`}>
          {isBuy ? fmtWld(walletBal, { decimals: 4 }) : userHolding.toLocaleString() + " " + token.symbol}
        </span>
      </div>

      <div className="relative">
        <input type="number" value={amount}
          onChange={(e) => { setAmount(e.target.value); setError(null); }}
          placeholder={isBuy ? "Amount in " + (displayCurrency === "WLD" ? "WLD" : "USD") : "Tokens to sell"}
          data-testid="input-amount"
          className="w-full p-3 rounded-xl bg-secondary/40 border border-border/30 text-sm text-foreground font-mono placeholder:text-muted-foreground/50 focus:border-green-500/30 focus:ring-1 focus:ring-green-500/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold">
          {inputLabel}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1">
        {percents.map((p) => (
          <button key={p} onClick={() => isBuy ? handlePercentBuy(p) : handlePercentSell(p)}
            data-testid={"percent-" + p}
            className={`py-1.5 rounded-md text-[9px] font-bold transition-all active:scale-95 ${
              isBuy ? "bg-green-500/8 text-green-400 border border-green-500/15 hover:bg-green-500/15"
                    : "bg-red-500/8 text-red-400 border border-red-500/15 hover:bg-red-500/15"
            }`}>
            {p}%
          </button>
        ))}
      </div>

      {numAmount > 0 && (
        <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/15 space-y-1.5 text-[11px]">
          {isBuy ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You receive</span>
                <span className="text-foreground font-bold font-mono">
                  {estTokens > 0 ? `~${estTokens.toLocaleString()} ${token.symbol}` : "Amount too small"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (2%)</span>
                <span className="text-muted-foreground font-mono">{fmtWld(buyFeeWld, { decimals: 6 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="text-muted-foreground font-mono">{fmtWld(token.priceWld, { decimals: 8 })}</span>
              </div>
              {priceImpact > 1 && (
                <div className={`flex justify-between items-center ${priceImpact > 50 ? "text-red-400" : priceImpact > 20 ? "text-yellow-400" : "text-muted-foreground"}`}>
                  <span className="flex items-center gap-1 text-[10px]">
                    <AlertTriangle className="w-2.5 h-2.5" /> Price impact
                  </span>
                  <span className="font-mono font-bold text-[10px]">+{priceImpact.toFixed(1)}%</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You receive</span>
                <span className="text-foreground font-bold font-mono">~{fmtWld(estWld, { decimals: 6 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross value</span>
                <span className="text-muted-foreground font-mono">~{fmtWld(numAmount * token.priceWld, { decimals: 6 })}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-yellow-400 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" /> 3% fee + slippage</span>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="text-[11px] text-red-400 bg-red-500/8 border border-red-500/15 p-2.5 rounded-lg">
          {error}
        </motion.div>
      )}

      <button onClick={handleSubmit}
        disabled={loading || buyStep !== "idle" || !numAmount || numAmount <= 0}
        data-testid="button-submit-trade"
        className={`w-full py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.97] disabled:opacity-30 disabled:active:scale-100 ${
          isBuy ? "bg-green-500 shadow-lg shadow-green-500/20" : "bg-red-500 shadow-lg shadow-red-500/20"
        }`}>
        {loading ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span>
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            {isBuy ? <><Zap className="w-3.5 h-3.5" /> Buy {token.symbol}</> : <>Sell {token.symbol}</>}
          </span>
        )}
      </button>
    </div>
  );
}
