"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { themes, getTheme, type Theme } from "@/lib/themes";

interface ThemeContextValue {
  theme: Theme;
  setThemeId: (id: string) => void;
  allThemes: Theme[];
}

const defaultValue: ThemeContextValue = {
  theme: themes[0],
  setThemeId: () => {},
  allThemes: themes,
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState("neon");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("4gk-theme");
    if (saved && themes.some((t) => t.id === saved)) {
      setThemeIdState(saved);
    }
    setMounted(true);
  }, []);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    localStorage.setItem("4gk-theme", id);
  }, []);

  const theme = getTheme(themeId);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(theme.vars)) {
      root.style.setProperty(key, value);
    }
  }, [theme, mounted]);

  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, allThemes: themes }}>
      {children}
    </ThemeContext.Provider>
  );
}
