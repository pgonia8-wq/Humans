import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, setApiUserId } from "@/services/api";

export type Screen = "discovery" | "token" | "profile" | "creator" | "settings" | "scanner";
export type DisplayCurrency = "USD" | "WLD";

export interface WorldAppUser {
  id: string;
  username: string;
  profilePicture?: string;
  avatarUrl?: string;
  verificationLevel?: "orb" | "device";
}

export interface AppState {
  user: WorldAppUser | null;
  walletAddress: string | null;
  balanceWld: number;
  balanceUsdc: number;
  screen: Screen;
  selectedTokenId: string | null;
  selectedAirdropId: string | null;
  isCreatorModalOpen: boolean;
  isSettingsOpen: boolean;
  worldAppReady: boolean;
  displayCurrency: DisplayCurrency;
  wldUsdRate: number;
  rateLoaded: boolean;
}

interface AppContextValue extends AppState {
  navigate: (screen: Screen, params?: { tokenId?: string; airdropId?: string }) => void;
  openCreatorDashboard: () => void;
  closeCreatorDashboard: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleCurrency: () => void;
  setCurrency: (c: DisplayCurrency) => void;
  emitToBridge: (event: string, payload?: unknown) => void;
  requestOrbVerification: () => Promise<boolean>;
  updateBalance: (wld: number, usdc: number) => void;
  updateUser: (updates: Partial<WorldAppUser>) => void;
  formatPrice: (wldPrice: number) => string;
  formatPriceValue: (wldPrice: number) => number;
  fmtWld: (wld: number, opts?: { compact?: boolean; decimals?: number }) => string;
  fmtUsd: (usd: number, opts?: { compact?: boolean; decimals?: number }) => string;
  toDisplayWld: (wld: number) => number;
  toDisplayUsd: (usd: number) => number;
  currencySymbol: string;
  currencyPrefix: string;
  currencySuffix: string;
}

function smartFormat(val: number, decimals?: number): string {
  if (val === 0) return "0";
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (decimals !== undefined) {
    if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + "M";
    if (abs >= 1_000) return sign + (abs / 1_000).toFixed(2) + "K";
    return sign + abs.toFixed(decimals);
  }
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return sign + abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 1) return sign + abs.toFixed(4);
  if (abs >= 0.001) return sign + abs.toFixed(6);
  if (abs >= 0.0000001) {
    const s = abs.toFixed(10);
    const trimmed = s.replace(/0+$/, "");
    return sign + (trimmed.endsWith(".") ? trimmed + "0" : trimmed);
  }
  return sign + abs.toFixed(10).replace(/0+$/, "0");
}

function smartCompact(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(2) + "B";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(2) + "K";
  if (abs >= 1) return sign + abs.toFixed(2);
  if (abs >= 0.01) return sign + abs.toFixed(4);
  return sign + abs.toFixed(6);
}

const PARENT_ORIGIN = import.meta.env?.VITE_PARENT_ORIGIN || "*";
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    walletAddress: null,
    balanceWld: 0,
    balanceUsdc: 0,
    screen: "discovery",
    selectedTokenId: null,
    selectedAirdropId: null,
    isCreatorModalOpen: false,
    isSettingsOpen: false,
    worldAppReady: false,
    displayCurrency: "USD",
    wldUsdRate: 1.0,
    rateLoaded: false,
  });

  useEffect(() => {
    const fetchRate = () => {
      api.getWldRate()
        .then((res) => {
          if (res.rate > 0) {
            setState((s) => ({ ...s, wldUsdRate: res.rate, rateLoaded: true }));
          }
        })
        .catch(() => {});
    };
    fetchRate();
    const iv = setInterval(fetchRate, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let contextReceived = false;

    const checkOrbFromDb = async (uid: string, parentLevel: string) => {
      if (parentLevel === "orb") return;
      try {
        const base = import.meta.env.VITE_API_BASE || "/api";
        const res = await fetch(`${base}/checkOrbStatus?userId=${encodeURIComponent(uid)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.orbVerified || data.verificationLevel === "orb") {
          setState((s) => ({
            ...s,
            user: s.user ? { ...s.user, verificationLevel: "orb" } : null,
          }));
        }
      } catch (err) { console.warn("[TOKEN] checkOrbFromDb failed:", err); }
    };

    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      const { type, payload } = e.data;

      if (type === "WORLD_APP_CONTEXT") {
          console.log("[TOKEN] WORLD_APP_CONTEXT received:", JSON.stringify(payload));
        contextReceived = true;
        const uid = payload?.userId ?? null;
        if (uid) setApiUserId(uid);
        const parentLevel = payload?.verificationLevel ?? "device";
        setState((s) => {
          const currentLevel = s.user?.verificationLevel;
          const finalLevel = currentLevel === "orb" ? "orb" : parentLevel;
          return {
          ...s,
          user: {
            id: payload?.userId ?? s.user?.id ?? "usr_guest",
            username: payload?.username ?? s.user?.username ?? "guest",
            profilePicture: payload?.profilePicture ?? "",
            avatarUrl: payload?.avatarUrl ?? "",
            verificationLevel: finalLevel,
          },
          walletAddress: payload?.walletAddress ?? s.walletAddress,
          balanceWld: payload?.balanceWld ?? s.balanceWld,
          balanceUsdc: payload?.balanceUsdc ?? s.balanceUsdc,
          worldAppReady: true,
        };});
        if (uid) checkOrbFromDb(uid, parentLevel);
        }

        if (type === "ORB_VERIFIED_FROM_H") {
          console.log("[TOKEN] ORB_VERIFIED_FROM_H received:", JSON.stringify(payload));
          if (payload?.success && payload?.verificationLevel === "orb") {
            setState((s) => ({
              ...s,
              user: s.user ? { ...s.user, verificationLevel: "orb" } : null,
            }));
          }
        }
      };

      window.addEventListener("message", handler);

    const retryInterval = setInterval(() => {
      if (contextReceived) { clearInterval(retryInterval); return; }
      window.parent?.postMessage({ type: "MINI_APP_READY" }, PARENT_ORIGIN);
    }, 1000);

    window.parent?.postMessage({ type: "MINI_APP_READY" }, PARENT_ORIGIN);

    const fallbackTimer = setTimeout(() => {
      if (!contextReceived) {
        setState((s) => ({ ...s, worldAppReady: true }));
      }
    }, 5000);

    return () => {
      window.removeEventListener("message", handler);
      clearInterval(retryInterval);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const emitToBridge = useCallback((event: string, payload?: unknown) => {
    window.parent?.postMessage({ type: event, payload }, PARENT_ORIGIN);
  }, []);

  const requestOrbVerification = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      const handler = (e: MessageEvent) => {
        if (!e.data || e.data.type !== "ORB_VERIFY_RESULT") return;
        window.removeEventListener("message", handler);
        clearTimeout(timeout);
        const p = e.data.payload;
        if (p?.success && p?.orbVerified) {
            setState((s) => ({
              ...s,
              user: s.user ? { ...s.user, verificationLevel: "orb" } : null,
            }));
            if (p.proof && p.userId) {
              const base = window.location.origin;
              fetch(base + "/api/verifyOrb", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: p.proof, userId: p.userId }),
              }).catch((err) => console.warn("[TOKEN] verifyOrb save error:", err));
            }
            resolve(true);
        } else {
          resolve(false);
        }
      };
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler);
        resolve(false);
      }, 60000);
      window.addEventListener("message", handler);
      console.log("[TOKEN] Sending REQUEST_ORB_VERIFY to parent, origin:", PARENT_ORIGIN);
        window.parent?.postMessage({ type: "REQUEST_ORB_VERIFY" }, PARENT_ORIGIN);
    });
  }, []);

  const navigate = useCallback((screen: Screen, params?: { tokenId?: string; airdropId?: string }) => {
    setState((s) => ({
      ...s,
      screen,
      selectedTokenId: params?.tokenId ?? (screen === "discovery" ? null : s.selectedTokenId),
      selectedAirdropId: params?.airdropId ?? s.selectedAirdropId,
    }));
  }, []);

  const openCreatorDashboard = useCallback(() =>
    setState((s) => ({ ...s, isCreatorModalOpen: true })), []);
  const closeCreatorDashboard = useCallback(() =>
    setState((s) => ({ ...s, isCreatorModalOpen: false })), []);
  const openSettings = useCallback(() =>
    setState((s) => ({ ...s, isSettingsOpen: true })), []);
  const closeSettings = useCallback(() =>
    setState((s) => ({ ...s, isSettingsOpen: false })), []);
  const toggleCurrency = useCallback(() =>
    setState((s) => ({ ...s, displayCurrency: s.displayCurrency === "USD" ? "WLD" : "USD" })), []);
  const setCurrency = useCallback((c: DisplayCurrency) =>
    setState((s) => ({ ...s, displayCurrency: c })), []);
  const updateBalance = useCallback((wld: number, usdc: number) =>
    setState((s) => ({ ...s, balanceWld: wld, balanceUsdc: usdc })), []);
  const updateUser = useCallback((updates: Partial<WorldAppUser>) =>
    setState((s) => ({
      ...s,
      user: s.user ? { ...s.user, ...updates } : null,
    })), []);

  const formatPrice = useCallback((wldPrice: number): string => {
    const prefix = state.displayCurrency === "USD" ? "$" : "";
    const suffix = state.displayCurrency === "WLD" ? " WLD" : "";
    const val = state.displayCurrency === "WLD" ? wldPrice : wldPrice * state.wldUsdRate;
    return prefix + smartFormat(val) + suffix;
  }, [state.displayCurrency, state.wldUsdRate]);

  const formatPriceValue = useCallback((wldPrice: number): number => {
    if (state.displayCurrency === "WLD") return wldPrice;
    return wldPrice * state.wldUsdRate;
  }, [state.displayCurrency, state.wldUsdRate]);

  const toDisplayWld = useCallback((wld: number): number => {
    return state.displayCurrency === "WLD" ? wld : wld * state.wldUsdRate;
  }, [state.displayCurrency, state.wldUsdRate]);

  const toDisplayUsd = useCallback((usd: number): number => {
    return state.displayCurrency === "USD" ? usd : usd / state.wldUsdRate;
  }, [state.displayCurrency, state.wldUsdRate]);

  const fmtWld = useCallback((wld: number, opts?: { compact?: boolean; decimals?: number }): string => {
    const val = state.displayCurrency === "WLD" ? wld : wld * state.wldUsdRate;
    const prefix = state.displayCurrency === "USD" ? "$" : "";
    const suffix = state.displayCurrency === "WLD" ? " WLD" : "";
    if (opts?.compact) return prefix + smartCompact(val) + suffix;
    return prefix + smartFormat(val, opts?.decimals) + suffix;
  }, [state.displayCurrency, state.wldUsdRate]);

  const fmtUsd = useCallback((usd: number, opts?: { compact?: boolean; decimals?: number }): string => {
    const val = state.displayCurrency === "USD" ? usd : usd / state.wldUsdRate;
    const prefix = state.displayCurrency === "USD" ? "$" : "";
    const suffix = state.displayCurrency === "WLD" ? " WLD" : "";
    if (opts?.compact) return prefix + smartCompact(val) + suffix;
    return prefix + smartFormat(val, opts?.decimals) + suffix;
  }, [state.displayCurrency, state.wldUsdRate]);

  const currencySymbol = state.displayCurrency === "WLD" ? "WLD" : "$";
  const currencyPrefix = state.displayCurrency === "USD" ? "$" : "";
  const currencySuffix = state.displayCurrency === "WLD" ? " WLD" : "";

  return (
    <AppContext.Provider
      value={{
        ...state,
        navigate,
        openCreatorDashboard,
        closeCreatorDashboard,
        openSettings,
        closeSettings,
        toggleCurrency,
        setCurrency,
        emitToBridge,
        requestOrbVerification,
        updateBalance,
        updateUser,
        formatPrice,
        formatPriceValue,
        fmtWld,
        fmtUsd,
        toDisplayWld,
        toDisplayUsd,
        currencySymbol,
        currencyPrefix,
        currencySuffix,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
