"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  type CardStyleId,
  DEFAULT_CUSTOM_CSS,
  getActiveCardCss,
} from "./card-styles";
import { type CardFrameId, getFrameCss } from "./card-frames";

const STORAGE_KEY = "flashcard-style";
const CUSTOM_CSS_KEY = "flashcard-custom-css";
const FRAME_KEY = "flashcard-frame";
const FRAME_IMAGE_KEY = "flashcard-frame-image";
const STYLE_ELEMENT_ID = "fc-card-style";

// Preferências globais da face do flashcard: o estilo e a moldura são independentes
// (qualquer estilo aceita qualquer moldura).
interface CardStyleState {
  styleId: CardStyleId;
  customCss: string;
  frameId: CardFrameId;
  frameImageUrl: string;
}

const DEFAULT_STATE: CardStyleState = {
  styleId: "classic",
  customCss: DEFAULT_CUSTOM_CSS,
  frameId: "none",
  frameImageUrl: "",
};

interface CardStyleContextValue extends CardStyleState {
  setStyleId: (id: CardStyleId) => void;
  setCustomCss: (css: string) => void;
  setFrameId: (id: CardFrameId) => void;
  setFrameImageUrl: (url: string) => void;
}

const CardStyleContext = createContext<CardStyleContextValue>({
  ...DEFAULT_STATE,
  setStyleId: () => {},
  setCustomCss: () => {},
  setFrameId: () => {},
  setFrameImageUrl: () => {},
});

export function useCardStyle() {
  return useContext(CardStyleContext);
}

// localStorage pode falhar (modo privado): sem preferência, cai no padrão.
function loadState(): CardStyleState {
  try {
    return {
      styleId: (localStorage.getItem(STORAGE_KEY) as CardStyleId | null) ?? DEFAULT_STATE.styleId,
      customCss: localStorage.getItem(CUSTOM_CSS_KEY) ?? DEFAULT_STATE.customCss,
      frameId: (localStorage.getItem(FRAME_KEY) as CardFrameId | null) ?? DEFAULT_STATE.frameId,
      frameImageUrl: localStorage.getItem(FRAME_IMAGE_KEY) ?? DEFAULT_STATE.frameImageUrl,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function persist(state: CardStyleState): void {
  try {
    localStorage.setItem(STORAGE_KEY, state.styleId);
    localStorage.setItem(CUSTOM_CSS_KEY, state.customCss);
    localStorage.setItem(FRAME_KEY, state.frameId);
    localStorage.setItem(FRAME_IMAGE_KEY, state.frameImageUrl);
  } catch {
    // quota estourada / modo privado — a preferência vale só para esta sessão.
  }
}

// injeta/atualiza o <style> global com o CSS do estilo + o da moldura ativa
function applyCss(state: CardStyleState): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ELEMENT_ID;
    document.head.appendChild(el);
  }
  const style = getActiveCardCss(state.styleId, state.customCss);
  // A moldura vem depois para vencer o `.fc-card` de um preset/CSS personalizado.
  el.textContent = `${style}\n${getFrameCss(state.frameId, state.frameImageUrl)}`;
}

export function CardStyleProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CardStyleState>(loadState);

  useEffect(() => {
    applyCss(state);
    persist(state);
  }, [state]);

  const setStyleId = useCallback((styleId: CardStyleId) => {
    setState((prev) => ({ ...prev, styleId }));
  }, []);
  const setCustomCss = useCallback((customCss: string) => {
    setState((prev) => ({ ...prev, customCss }));
  }, []);
  const setFrameId = useCallback((frameId: CardFrameId) => {
    setState((prev) => ({ ...prev, frameId }));
  }, []);
  const setFrameImageUrl = useCallback((frameImageUrl: string) => {
    setState((prev) => ({ ...prev, frameImageUrl }));
  }, []);

  return (
    <CardStyleContext.Provider
      value={{ ...state, setStyleId, setCustomCss, setFrameId, setFrameImageUrl }}
    >
      {children}
    </CardStyleContext.Provider>
  );
}
