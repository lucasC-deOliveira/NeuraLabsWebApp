import { useState } from "react";

// Controle do usuário sobre o uso de IA (e o gasto de API) ao importar uma prova.
// Cada passo pode ser ligado/desligado; a escolha é persistida em localStorage.
export interface ProvaAiConfig {
  aiExtraction: boolean; // fallback LLM na extração (desligado = só determinístico, 0 token)
  sugerirConceitos: boolean; // sugerir conceitos por questão com IA
  melhorarFormatacao: boolean; // formatar/melhorar as questões com IA na extração
  completarEdital: boolean; // completar o grafo pelo edital anexado com IA
}

const DEFAULT_CONFIG: ProvaAiConfig = {
  aiExtraction: true,
  sugerirConceitos: true,
  melhorarFormatacao: true,
  completarEdital: true,
};
const STORAGE_KEY = "neuralabs.prova-ai-config.v1";

function loadConfig(): ProvaAiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<ProvaAiConfig>) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: ProvaAiConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage indisponível — a config simplesmente não persiste.
  }
}

export function useProvaAiConfig(): { config: ProvaAiConfig; toggle: (key: keyof ProvaAiConfig) => void } {
  const [config, setConfig] = useState<ProvaAiConfig>(loadConfig);
  const toggle = (key: keyof ProvaAiConfig): void =>
    setConfig((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveConfig(next);
      return next;
    });
  return { config, toggle };
}
