"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type ColorTheme =
  | "classic-gx"
  | "cyber-ultraviolet"
  | "chroma-teal"
  | "acid-toxic"
  | "light-gx-core"
  | "neon-frost"
  | "cyber-quartz"
  | "digital-mint"
  | "none";

const DARK_THEMES = new Set<ColorTheme>([
  "classic-gx", "cyber-ultraviolet", "chroma-teal", "acid-toxic",
]);

const STORAGE_KEY = "color-theme";

interface ColorThemeContextValue {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: "none",
  setColorTheme: () => {},
});

export function useColorTheme() {
  return useContext(ColorThemeContext);
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("none");
  const { setTheme } = useTheme();

  const applyTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);

    const html = document.documentElement;
    if (theme === "none") {
      html.removeAttribute("data-color-theme");
      setTheme("system");
    } else {
      html.setAttribute("data-color-theme", theme);
      setTheme(DARK_THEMES.has(theme) ? "dark" : "light");
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [setTheme]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (stored && stored !== "none") applyTheme(stored);
  }, [applyTheme]);

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme: applyTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}
