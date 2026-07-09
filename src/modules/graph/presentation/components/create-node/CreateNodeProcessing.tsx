import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { AiStepRow } from "../ai/AiStepRow";

// Feedback de progresso enquanto o modal grava. Para PROVA mostra duas etapas
// (análise → gravação no grafo); para os demais tipos, um spinner simples.
interface CreateNodeProcessingProps {
  isProva: boolean;
  provaSaving: boolean; // true = fase de gravação; false = fase de análise
  isEdital?: boolean;
}

export function CreateNodeProcessing({ isProva, provaSaving, isEdital }: CreateNodeProcessingProps) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isProva) {
    const message = isEdital ? "Lendo o edital e completando o grafo..." : "Criando e salvando no grafo...";
    return (
      <div className="flex flex-col items-center gap-3 py-14">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
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
