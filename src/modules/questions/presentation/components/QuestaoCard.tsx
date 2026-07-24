import { Badge } from "@/components/ui/badge";
import { Trash2Icon, CheckCircle2Icon, CircleIcon, BarChart3Icon, GraduationCapIcon, NetworkIcon } from "lucide-react";
import { ConceptTags, type ConceptTagSelection } from "@/components/concept-tags";
import type { AlternativaMultipla, QuestaoListItem } from "../../domain/questao.types";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V / F",
  MULTIPLA_ESCOLHA: "Múltipla escolha",
};

const TIPO_COLOR: Record<string, string> = {
  VERDADEIRO_FALSO: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
  MULTIPLA_ESCOLHA: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
};

function AlternativaRow({ alt, isGabarito }: { alt: AlternativaMultipla; isGabarito: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm rounded px-2.5 py-1.5 ${isGabarito ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
      {isGabarito ? <CheckCircle2Icon className="size-3.5 shrink-0" /> : <CircleIcon className="size-3.5 shrink-0" />}
      <span className="font-mono text-[11px] opacity-60">{alt.letra}.</span>
      {alt.texto}
    </div>
  );
}

function QuestaoDetails({ questao }: { questao: QuestaoListItem }) {
  const isVerdadeiro = questao.gabarito === "V";
  return (
    <div className="mt-3 pt-3 border-t space-y-2.5">
      {questao.tipo === "MULTIPLA_ESCOLHA" && questao.alternativas && (
        <div className="space-y-1.5">
          {questao.alternativas.map((alt) => <AlternativaRow key={alt.letra} alt={alt} isGabarito={alt.letra === questao.gabarito} />)}
        </div>
      )}
      {questao.tipo === "VERDADEIRO_FALSO" && (
        <div className={`inline-flex items-center gap-1.5 text-sm font-medium rounded px-2.5 py-1 ${isVerdadeiro ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"}`}>
          {isVerdadeiro ? <CheckCircle2Icon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
          {isVerdadeiro ? "Verdadeiro" : "Falso"}
        </div>
      )}
      {questao.explicacao && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-2">{questao.explicacao}</p>
      )}
    </div>
  );
}

export function QuestaoCard({
  questao,
  expanded,
  deleting,
  onToggle,
  onDelete,
  onAnalytics,
  onStudy,
  onGraph,
  onSelectTag,
}: {
  questao: QuestaoListItem;
  expanded: boolean;
  deleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAnalytics?: () => void;
  onStudy?: () => void;
  onGraph?: () => void;
  onSelectTag: (selection: ConceptTagSelection) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors" onClick={onToggle}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge variant="outline" className={`text-[11px] h-5 px-1.5 font-medium ${TIPO_COLOR[questao.tipo]}`}>
              {TIPO_LABEL[questao.tipo]}
            </Badge>
            {/* Conceitos que a questão testa no grafo; o conceitoNome do relacional
                está sempre nulo, então as tags vêm de lá. */}
            <ConceptTags tags={questao.conceitosConectados} onSelect={onSelectTag} />
          </div>
          <p className="text-sm font-medium leading-snug">{questao.enunciado}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 mt-0.5">
          {onStudy && (
            <button
              className="text-zinc-400 hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); onStudy(); }}
              title="Estudar esta questão"
            >
              <GraduationCapIcon className="size-4" />
            </button>
          )}
          {onGraph && (
            <button
              className="text-zinc-400 hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); onGraph(); }}
              title="Ver mini-grafo"
            >
              <NetworkIcon className="size-4" />
            </button>
          )}
          {onAnalytics && (
            <button
              className="text-zinc-400 hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); onAnalytics(); }}
              title="Ver analytics"
            >
              <BarChart3Icon className="size-4" />
            </button>
          )}
          <button
            className="text-zinc-400 hover:text-red-500 transition-colors"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={deleting}
            title="Excluir questão"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>
      {expanded && <QuestaoDetails questao={questao} />}
    </div>
  );
}
