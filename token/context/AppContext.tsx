import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Screen = "discovery" | "token" | "profile" | "creator" | "settings";
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
  balanceWld: number;
  balanceUsdc: number;
  screen: Screen;
  selectedTokenId: string | null;
  selectedAirdropId: string | null;
  isCreatorModalOpen: boolean;
  isSettingsOpen: boolean;
  worldAppReady: boolean;
  displayCurrency: DisplayCurrency;
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
  updateBalance: (wld: number, usdc: number) => void;
  updateUser: (updates: Partial<WorldAppUser>) => void;
  formatPrice: (wldPrice: number) => string;
  formatPriceValue: (wldPrice: number) => number;
  currencySymbol: string;
  wldUsdRate: number;
}

const WLD_USD_RATE = 3.0;
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    balanceWld: 0,
    balanceUsdc: 0,
    screen: "discovery",
    selectedTokenId: null,
    selectedAirdropId: null,
    isCreatorModalOpen: false,
    isSettingsOpen: false,
    worldAppReady: false,
    displayCurrency: "USD",
  });

  useEffect(() => {
    let contextReceived = false;

    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      const { type, payload } = e.data;

      if (type === "WORLD_APP_CONTEXT") {
        contextReceived = true;
        setState((s) => ({
          ...s,
          user: {
            id: payload?.userId ?? s.user?.id ?? "usr_guest",
            username: payload?.username ?? s.user?.username ?? "guest",
            profilePicture: payload?.profilePicture ?? "",
            avatarUrl: payload?.avatarUrl ?? "",
            verificationLevel: payload?.verificationLevel ?? "device",
          },
          balanceWld: payload?.balanceWld ?? s.balanceWld,
          balanceUsdc: payload?.balanceUsdc ?? s.balanceUsdc,
          worldAppReady: true,
        }));
      }
    };

    window.addEventListener("message", handler);
    const origin = import.meta.env?.VITE_PARENT_ORIGIN || "*";

    const retryInterval = setInterval(() => {
      if (contextReceived) { clearInterval(retryInterval); return; }
      window.parent?.postMessage({ type: "MINI_APP_READY" }, origin);
    }, 1000);

    window.parent?.postMessage({ type: "MINI_APP_READY" }, origin);

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
    const origin = import.meta.env?.VITE_PARENT_ORIGIN || "*";
    window.parent?.postMessage({ type: event, payload }, origin);
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
    if (state.displayCurrency === "WLD") {
      return `${wldPrice.toFixed(7)} WLD`;
    }
    return `$${(wldPrice * WLD_USD_RATE).toFixed(7)}`;
  }, [state.displayCurrency]);

  const formatPriceValue = useCallback((wldPrice: number): number => {
    if (state.displayCurrency === "WLD") return wldPrice;
    return wldPrice * WLD_USD_RATE;
  }, [state.displayCurrency]);

  const currencySymbol = state.displayCurrency === "WLD" ? "WLD" : "$";

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
        updateBalance,
        updateUser,
        formatPrice,
        formatPriceValue,
        currencySymbol,
        wldUsdRate: WLD_USD_RATE,
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
