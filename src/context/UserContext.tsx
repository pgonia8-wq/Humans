import React, { createContext, useContext, useState } from "react";

type Tier = "free" | "basic" | "premium" | "premium+";

interface UserState {
  userId: string | null;
  wallet: string | null;
  tier: Tier;
}

interface UserContextType extends UserState {
  setUser: (data: Partial<UserState>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [userId, setUserId] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("free");

  const setUser = (data: Partial<UserState>) => {
    if (data.userId !== undefined) setUserId(data.userId);
    if (data.wallet !== undefined) setWallet(data.wallet);
    if (data.tier !== undefined) setTier(data.tier);
  };

  return (
    <UserContext.Provider
      value={{
        userId,
        wallet,
        tier,
        setUser
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }
  return ctx;
}
