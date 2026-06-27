"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type ColorTheme =
  | "classic-gx"
  | "cyber-ultraviolet"
  | "chroma-teal"
  | "acid-toxic"
  | "purple-haze"
  | "subzero"
  | "rose-quartz"
  | "white-wolf"
  | "cyberpunk-neon"
  | "cyberpunk-2077"
  | "jinx"
  | "hackerman"
  | "light-gx-core"
  | "neon-frost"
  | "cyber-quartz"
  | "digital-mint"
  | "none";

const DARK_THEMES = new Set<ColorTheme>([
  "classic-gx", "cyber-ultraviolet", "chroma-teal", "acid-toxic",
  "purple-haze", "subzero", "rose-quartz", "white-wolf",
  "cyberpunk-neon", "cyberpunk-2077", "jinx", "hackerman",
]);

const STORAGE_KEY = "color-theme";
const NEON_KEY = "neon-effect";

interface ColorThemeContextValue {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
  neonEnabled: boolean;
  setNeonEnabled: (enabled: boolean) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: "none",
  setColorTheme: () => {},
  neonEnabled: false,
  setNeonEnabled: () => {},
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

  const [neonEnabled, setNeonState] = useState(false);

  const setNeonEnabled = useCallback((enabled: boolean) => {
    setNeonState(enabled);
    const html = document.documentElement;
    if (enabled) html.setAttribute("data-neon", "true");
    else html.removeAttribute("data-neon");
    localStorage.setItem(NEON_KEY, enabled ? "1" : "0");
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (stored && stored !== "none") applyTheme(stored);
    if (localStorage.getItem(NEON_KEY) === "1") setNeonEnabled(true);
  }, [applyTheme, setNeonEnabled]);

  return (
    <ColorThemeContext.Provider
      value={{ colorTheme, setColorTheme: applyTheme, neonEnabled, setNeonEnabled }}
    >
      {children}
    </ColorThemeContext.Provider>
  );
}
