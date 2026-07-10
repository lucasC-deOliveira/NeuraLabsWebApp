import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { AiStepRow } from "../ai/AiStepRow";

// Feedback de progresso enquanto o modal grava. Para PROVA mostra duas etapas
// (análise → gravação no grafo); para os demais tipos, um spinner simples.
interface CreateNodeProcessingProps {
  isProva: boolean;
  provaSaving: boolean; // true = fase de gravação; false = fase de análise
  isEdital?: boolean;
  editalSaving?: boolean; // true = gravando no grafo; false = IA lendo o edital
}

export function CreateNodeProcessing({
  isProva,
  provaSaving,
  isEdital,
  editalSaving = false,
}: CreateNodeProcessingProps) {
  const [elapsed, setElapsed] = useState(0);
  const [prevPhase, setPrevPhase] = useState("");
  // Zera o cronômetro ao trocar de fase (durante o render, evita set-state-in-effect).
  const phase = `${provaSaving}|${editalSaving}`;
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setElapsed(0);
  }
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (isEdital) return <EditalProgress saving={editalSaving} elapsed={elapsed} />;

  if (!isProva) {
    return (
      <div className="flex flex-col items-center gap-3 py-14">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Criando e salvando no grafo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-8 px-2">
      <AiStepRow
        index={1}
        label="Analisando a prova"
        sublabel="Extraindo questões e figuras, cruzando com o gabarito e sugerindo conceitos..."
        status={provaSaving ? "done" : "active"}
        elapsed={provaSaving ? undefined : elapsed}
      />
      <AiStepRow
        index={2}
        label="Criando e ligando ao grafo"
        sublabel="Salvando questões, figuras e as ligações de conceito..."
        status={provaSaving ? "active" : "pending"}
        elapsed={provaSaving ? elapsed : undefined}
      />
      <p className="pt-1 text-center text-[11px] text-muted-foreground/60">
        Não feche esta janela — provas grandes podem levar alguns minutos.
      </p>
    </div>
  );
}

function EditalProgress({ saving, elapsed }: { saving: boolean; elapsed: number }) {
  return (
    <div className="space-y-5 py-8 px-2">
      <AiStepRow
        index={1}
        label="Lendo o edital com a IA"
        sublabel="Isolando o programa e planejando assuntos, tópicos e conceitos..."
        status={saving ? "done" : "active"}
        elapsed={saving ? undefined : elapsed}
      />
      <AiStepRow
        index={2}
        label="Completando o grafo"
        sublabel="Criando os nós que faltam e ligando o edital aos conceitos..."
        status={saving ? "active" : "pending"}
        elapsed={saving ? elapsed : undefined}
      />
      <p className="pt-1 text-center text-[11px] text-muted-foreground/60">
        Não feche esta janela — editais grandes podem levar até ~1 min.
      </p>
    </div>
  );
}
