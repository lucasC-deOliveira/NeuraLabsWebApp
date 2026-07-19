import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, TargetIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import type { ConceptErrorRank } from "@/modules/graph/application/ports/study.port";

interface ConceptErrorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Foca o conceito no grafo — o diagnóstico só vale se leva à ação. */
  onFocusConcept?: (conceitoId: string, nome: string) => void;
  /** Abre uma sessão só com os cards errados no conceito. */
  onStudyCards?: (flashcardIds: string[], conceitoNome: string) => void;
}

type Step = "loading" | "ready" | "error";

export function ConceptErrorsModal({ open, onOpenChange, onFocusConcept, onStudyCards }: ConceptErrorsModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [conceitos, setConceitos] = useState<ConceptErrorRank[]>([]);
  const [analisadas, setAnalisadas] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  // Reseta ao abrir (durante o render — não é setState-in-effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStep("loading");
      setErrorMsg("");
    }
  }

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    graphHttp
      .diagnoseConceptErrors()
      .then((res) => {
        if (ignore) return;
        setConceitos(res.conceitos);
        setAnalisadas(res.revisoesAnalisadas);
        setStep("ready");
      })
      .catch((e) => {
        if (ignore) return;
        setErrorMsg(e instanceof Error ? e.message : "Erro ao carregar o diagnóstico.");
        setStep("error");
      });
    return () => { ignore = true; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <TargetIcon className="size-4 text-primary" />
            Onde você mais erra
          </DialogTitle>
          <DialogDescription>
            Agrupado por conceito, não por card: errar vários cards do mesmo conceito aponta
            um buraco de entendimento, não um dia ruim.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <DiagnosisBody
            step={step}
            conceitos={conceitos}
            analisadas={analisadas}
            errorMsg={errorMsg}
            onFocusConcept={onFocusConcept}
            onStudyCards={onStudyCards}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DiagnosisBodyProps {
  step: Step;
  conceitos: ConceptErrorRank[];
  analisadas: number;
  errorMsg: string;
  onFocusConcept?: (conceitoId: string, nome: string) => void;
  onStudyCards?: (flashcardIds: string[], conceitoNome: string) => void;
}

function DiagnosisBody({ step, conceitos, analisadas, errorMsg, onFocusConcept, onStudyCards }: DiagnosisBodyProps) {
  if (step === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Loader2Icon className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Somando suas revisões...</p>
      </div>
    );
  }
  if (step === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertCircleIcon className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
      </div>
    );
  }
  if (conceitos.length === 0) return <EmptyView analisadas={analisadas} />;
  return (
    <div className="space-y-1">
      <p className="px-1 pb-2 text-[11px] text-muted-foreground">
        {analisadas} revisão(ões) analisada(s)
      </p>
      <Separator className="mb-2" />
      {conceitos.map((c) => (
        <ConceptRow key={c.conceitoId} concept={c} onFocus={onFocusConcept} onStudy={onStudyCards} />
      ))}
    </div>
  );
}

// Distingue "você acerta tudo" de "você ainda não estudou o bastante" — sem isso
// as duas situações produzem a mesma tela vazia e a pessoa não sabe o que fazer.
function EmptyView({ analisadas }: { analisadas: number }) {
  const semDados = analisadas === 0;
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <CheckCircle2Icon className="size-10 text-emerald-500" />
      <p className="text-sm font-medium">
        {semDados ? "Ainda não há revisões suficientes." : "Nenhum conceito problemático!"}
      </p>
      <p className="text-xs text-muted-foreground max-w-xs">
        {semDados
          ? "Estude alguns cards já classificados em conceitos e o diagnóstico aparece aqui."
          : `Nas ${analisadas} revisão(ões) analisadas, nenhum conceito acumulou erros o bastante para virar prioridade.`}
      </p>
    </div>
  );
}

interface ConceptRowProps {
  concept: ConceptErrorRank;
  onFocus?: (id: string, nome: string) => void;
  onStudy?: (flashcardIds: string[], conceitoNome: string) => void;
}

function ConceptRow({ concept, onFocus, onStudy }: ConceptRowProps) {
  const pct = Math.round(concept.taxaErro * 100);
  // Um conceito pode ter erros sem card estudável (o card foi apagado depois).
  const podeEstudar = Boolean(onStudy) && concept.cardsComErro.length > 0;
  return (
    <div className="w-full rounded-md border border-border p-2.5 text-xs">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-medium flex-1">{concept.nome}</span>
        <span className="tabular-nums text-muted-foreground shrink-0">
          {concept.erros}/{concept.revisoes} erros
        </span>
        <span className={`tabular-nums font-medium shrink-0 ${pct >= 60 ? "text-red-500" : "text-amber-500"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={pct >= 60 ? "h-full bg-red-500" : "h-full bg-amber-500"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-1.5 mt-2">
        {podeEstudar && (
          <button
            onClick={() => onStudy?.(concept.cardsComErro, concept.nome)}
            className="rounded border border-primary/60 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            Estudar {concept.cardsComErro.length} card(s) que errei
          </button>
        )}
        {onFocus && (
          <button
            onClick={() => onFocus(concept.conceitoId, concept.nome)}
            className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
          >
            Ver no grafo
          </button>
        )}
      </div>
    </div>
  );
}
