import { useEffect, useState } from "react";
import { AiStepRow } from "./ai/AiStepRow";

// Feedback ao entrar num grafo, no mesmo estilo das features de IA (etapas com
// AiStepRow). Cobre as duas fases: buscar os dados (fetch) e montar o layout
// (pre-settle da física, que bloqueia a thread) — o spinner é CSS, então continua
// girando mesmo durante o bloqueio, evitando a sensação de tela travada/preta.
export type GraphLoadPhase = "loading" | "preparing";

export function GraphLoadingScreen({ phase }: { phase: GraphLoadPhase }) {
  const [elapsed, setElapsed] = useState(0);
  const [prevPhase, setPrevPhase] = useState<GraphLoadPhase>(phase);
  // reinicia o cronômetro ao trocar de fase (durante o render, sem set-state-in-effect)
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setElapsed(0);
  }
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  return (
    <div className="flex h-screen items-center justify-center px-6">
      <div className="w-full max-w-xs space-y-5">
        <AiStepRow
          index={1}
          label="Carregando o grafo"
          sublabel="Buscando nós, conexões e estado visual…"
          status={phase === "loading" ? "active" : "done"}
          elapsed={phase === "loading" ? elapsed : undefined}
        />
        <AiStepRow
          index={2}
          label="Montando o layout"
          sublabel="Posicionando os nós e as conexões…"
          status={phase === "preparing" ? "active" : "pending"}
          elapsed={phase === "preparing" ? elapsed : undefined}
        />
      </div>
    </div>
  );
}
