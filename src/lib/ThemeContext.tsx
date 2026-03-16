import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";

type ThemeType = "light" | "dark";

interface ThemeContextType {
  theme: ThemeType;
  accentColor: string;
  toggleTheme: () => void;
  setTheme: (t: ThemeType) => void;
  setAccentColor: (c: string) => void;
  username: string | null;           // NUEVO: username global
  setUsername: (u: string | null) => void; // NUEVO: setter global
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // Tema
  const [theme, setTheme] = useState<ThemeType>(
    (typeof window !== "undefined" && (localStorage.getItem("theme") as ThemeType)) || "dark"
  );

  const [accentColor, setAccentColor] = useState<string>(
    (typeof window !== "undefined" && localStorage.getItem("accentColor")) || "#7c3aed"
  );

  // NUEVO: Username global
  const [username, setUsername] = useState<string | null>(null);

  // --- NUEVO: Cargar username desde localStorage al montar ---
  useEffect(() => {
    if (typeof window === "undefined") return; // seguridad SSR
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      console.log("[ThemeContext] username cargado desde localStorage:", storedUsername);
    }
  }, []);

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("accentColor", accentColor);
  }, [accentColor]);

  // NUEVO: Persistir username
  useEffect(() => {
    if (username) localStorage.setItem("username", username);
    else localStorage.removeItem("username");
  }, [username]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, accentColor, toggleTheme, setTheme, setAccentColor, username, setUsername }}>
      <div
        className={theme === "dark" ? "dark" : ""}
        style={{ "--accent-color": accentColor } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// Hook para usar el contexto fácilmente
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

export { ThemeContext };
