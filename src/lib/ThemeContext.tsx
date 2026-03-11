import React, { createContext, useState, useContext, ReactNode } from "react";

type ThemeType = "light" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  accentColor: string;
  setTheme: (t: ThemeType) => void;
  setAccentColor: (c: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [accentColor, setAccentColor] = useState<string>("#7c3aed");

  return (
    <ThemeContext.Provider value={{ theme, accentColor, setTheme, setAccentColor }}>
      <div
        className={theme === "dark" ? "dark" : ""}
        style={{ "--accent-color": accentColor } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export { ThemeContext };
