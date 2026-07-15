import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { settingsHttp } from "../../infra/http";
import { resolveAiConfig, validateAiConfig, type AiConfig } from "../../domain/ai-config";

export interface AiConfigState {
  config: AiConfig;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  patch: (patch: Partial<AiConfig>) => void;
  save: () => Promise<void>;
  replace: (config: AiConfig) => void;
}

const EMPTY: AiConfig = { apiKey: "", baseUrl: "", modelo: "" };
const SAVED_BADGE_MS = 2000;

// `loading` começa true, então o carregamento não pode fazer setState no corpo do
// efeito — o fetch é disparado aqui e o estado assenta nos callbacks da promise.
function loadConfig(
  apply: (config: AiConfig) => void,
  stopLoading: () => void,
): () => void {
  let cancelled = false;
  settingsHttp
    .getAiConfig()
    .then((c): void => { if (!cancelled) apply(resolveAiConfig(c)); })
    .catch((err): void => { console.error(err); toast.error("Erro ao carregar configuracoes."); })
    .finally((): void => { if (!cancelled) stopLoading(); });
  return (): void => { cancelled = true; };
}

const trimmed = (config: AiConfig): AiConfig => ({
  apiKey: config.apiKey.trim(),
  baseUrl: config.baseUrl.trim(),
  modelo: config.modelo.trim(),
});

// Salva e sinaliza o resultado. Devolve se deu certo, para o hook decidir o "Salvo!".
async function persist(config: AiConfig): Promise<boolean> {
  const validationError = validateAiConfig(config.apiKey);
  if (validationError) {
    toast.error(validationError);
    return false;
  }
  try {
    await settingsHttp.saveAiConfig(trimmed(config));
    toast.success("Configuracoes de IA salvas com sucesso!");
    return true;
  } catch (err) {
    console.error(err);
    toast.error("Erro ao salvar configuracoes.");
    return false;
  }
}

/**
 * Config de IA do usuário: carrega, edita e salva. Vive num hook porque duas telas
 * precisam dela — a de IA (para editar) e a de Desktop (o toggle do Claude Code
 * troca a config ativa pela do proxy local e devolve a antiga ao desligar).
 * @example const { config, patch, save } = useAiConfig();
 */
export function useAiConfig(): AiConfigState {
  const [config, setConfig] = useState<AiConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const stopLoading = useCallback((): void => setLoading(false), []);
  useEffect(() => loadConfig(setConfig, stopLoading), [stopLoading]);

  const patch = useCallback((p: Partial<AiConfig>): void => {
    setConfig((prev) => ({ ...prev, ...p }));
  }, []);

  const save = useCallback(async (): Promise<void> => {
    setSaving(true);
    const ok = await persist(config);
    setSaving(false);
    if (!ok) return;
    setSaved(true);
    setTimeout(() => setSaved(false), SAVED_BADGE_MS);
  }, [config]);

  return { config, loading, saving, saved, patch, save, replace: setConfig };
}
