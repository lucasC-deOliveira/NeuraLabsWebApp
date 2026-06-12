"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type CardStyleId,
  DEFAULT_CUSTOM_CSS,
  getActiveCardCss,
} from "./card-styles";

const STORAGE_KEY = "flashcard-style";
const CUSTOM_CSS_KEY = "flashcard-custom-css";
const STYLE_ELEMENT_ID = "fc-card-style";

interface CardStyleContextValue {
  styleId: CardStyleId;
  setStyleId: (id: CardStyleId) => void;
  customCss: string;
  setCustomCss: (css: string) => void;
}

const CardStyleContext = createContext<CardStyleContextValue>({
  styleId: "classic",
  setStyleId: () => {},
  customCss: DEFAULT_CUSTOM_CSS,
  setCustomCss: () => {},
});

export function useCardStyle() {
  return useContext(CardStyleContext);
}

// injeta/atualiza o <style> global com o CSS do estilo ativo
function applyCss(styleId: CardStyleId, customCss: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  el.textContent = getActiveCardCss(styleId, customCss);
}

export function CardStyleProvider({ children }: { children: React.ReactNode }) {
  const [styleId, setStyleIdState] = useState<CardStyleId>("classic");
  const [customCss, setCustomCssState] = useState<string>(DEFAULT_CUSTOM_CSS);

  // carrega a preferência salva e aplica
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY) as CardStyleId | null;
    const storedCss = localStorage.getItem(CUSTOM_CSS_KEY);
    const id = storedId ?? "classic";
    const css = storedCss ?? DEFAULT_CUSTOM_CSS;
    setStyleIdState(id);
    setCustomCssState(css);
    applyCss(id, css);
  }, []);

  const setStyleId = useCallback((id: CardStyleId) => {
    setStyleIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    setCustomCssState((css) => {
      applyCss(id, css);
      return css;
    });
  }, []);

  const setCustomCss = useCallback((css: string) => {
    setCustomCssState(css);
    localStorage.setItem(CUSTOM_CSS_KEY, css);
    setStyleIdState((id) => {
      applyCss(id, css);
      return id;
    });
  }, []);

  return (
    <CardStyleContext.Provider value={{ styleId, setStyleId, customCss, setCustomCss }}>
      {children}
    </CardStyleContext.Provider>
  );
}
