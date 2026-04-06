"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark";

  console.log("[ThemeToggle] mounted, theme =", theme, "isDark =", isDark);

  return (
    <div className="border-t border-border mt-auto pt-4">
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      >
        {isDark ? (
          <SunIcon className="size-4 shrink-0" />
        ) : (
          <MoonIcon className="size-4 shrink-0" />
        )}
        <span>{isDark ? "Claro" : "Escuro"}</span>
      </button>
    </div>
  );
}
