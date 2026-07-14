import { useEffect, useRef, useState } from "react";
import { graphHttp } from "@/modules/graph/infra/http";

// Tokens de IA gastos desde que `active` ficou true (delta sobre o total da sessão).
// Dá feedback ao vivo do custo de uma operação (ex.: importar prova), reusando o
// mesmo total que o medidor do header (gravado no adapter LLM). Zera ao terminar.
const POLL_MS = 2000;

async function readSessionTotal(): Promise<number> {
  try {
    const { total } = await graphHttp.getTokenUsage();
    return total;
  } catch {
    return -1; // falha de polling: ignora esta amostra
  }
}

export function useLiveTokenDelta(active: boolean): number {
  const [delta, setDelta] = useState(0);
  const baseline = useRef<number | null>(null);
  useEffect(() => {
    if (!active) { baseline.current = null; return; }
    let running = true;
    const tick = async (): Promise<void> => {
      const total = await readSessionTotal();
      if (total < 0 || !running) return;
      if (baseline.current === null) { baseline.current = total; return void setDelta(0); }
      setDelta(Math.max(0, total - baseline.current));
    };
    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return (): void => { running = false; clearInterval(id); };
  }, [active]);
  return active ? delta : 0;
}
