import React, { createContext, useContext, useState, ReactNode } from "react";

type Tier = "free" | "basic" | "premium" | "premium+";

interface UserState {
  userId?: string | null;
  tier?: Tier;
}

interface UserContextType {
  userId: string | null;
  tier: Tier;
  setUser: (data: Partial<UserState>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {

  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("free");

  const setUser = (data: Partial<UserState>) => {
    if (data.userId !== undefined) setUserId(data.userId ?? null);
    if (data.tier !== undefined) setTier(data.tier);
  };

  return (
    <UserContext.Provider value={{ userId, tier, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {

  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return context;
};
