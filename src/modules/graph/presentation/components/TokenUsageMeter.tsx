import { useEffect, useState } from "react";
import { CoinsIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import type { TokenUsageView } from "@/modules/graph/application/ports/graph-ai.port";
import { formatTokens } from "./format-tokens";

// Live meter of AI tokens spent this session (all features — recorded at the LLM
// adapter). Polls the running total; awaited HTTP AI calls make polling
// effectively real-time, so no websocket is needed.
const POLL_MS = 4000;

export function TokenUsageMeter() {
  const [usage, setUsage] = useState<TokenUsageView | null>(null);

  useEffect(() => {
    let active = true;
    const poll = (): void => {
      graphHttp
        .getTokenUsage()
        .then((u) => { if (active) setUsage(u); })
        .catch(() => {});
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return (): void => { active = false; clearInterval(id); };
  }, []);

  if (!usage) return null;
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
      title={`IA nesta sessão: ${usage.total} tokens (${usage.prompt} entrada + ${usage.completion} saída) em ${usage.calls} chamada(s)`}
    >
      <CoinsIcon className="size-3.5 text-amber-500" />
      <span className="tabular-nums font-medium text-foreground">{formatTokens(usage.total)}</span>
      <span className="hidden sm:inline">tokens IA</span>
    </div>
  );
}
