"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, CircleIcon, KeyIcon } from "lucide-react";
import { ConceptTags, type ConceptTagSelection } from "@/components/concept-tags";
import type { ProvaQuestaoItem } from "../../domain/prova.types";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V / F",
  MULTIPLA_ESCOLHA: "Múltipla escolha",
};

export function ProvaQuestaoCard({ pq, numero, showGabarito, onSelectTag }: {
  pq: ProvaQuestaoItem;
  // O número da prova (ordem + 1), não a posição na tela: com filtro ou paginação
  // a questão 47 continua sendo a 47.
  numero: number;
  showGabarito: boolean;
  onSelectTag: (selection: ConceptTagSelection) => void;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
          {numero}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge variant="outline" className="text-[11px] h-5 px-1.5">
              {TIPO_LABEL[pq.tipo]}
            </Badge>
            {/* As tags do grafo dizem o mesmo que a FK conceitoNome, e com os pais
                — e são clicáveis, viram filtro. */}
            <ConceptTags tags={pq.conceitosConectados} onSelect={onSelectTag} />
          </div>
          <p className="text-sm font-medium leading-snug">{pq.enunciado}</p>
        </div>
      </div>

      {/* Alternativas */}
      {pq.tipo === "MULTIPLA_ESCOLHA" && pq.alternativas && (
        <div className="ml-10 space-y-1.5">
          {pq.alternativas.map((alt) => {
            const isCorrect = alt.letra === pq.gabarito;
            return (
              <div
                key={alt.letra}
                className={`flex items-center gap-2 text-sm rounded px-2.5 py-1.5 ${
                  showGabarito && isCorrect
                    ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {showGabarito && isCorrect
                  ? <CheckCircle2Icon className="size-3.5 shrink-0" />
                  : <CircleIcon className="size-3.5 shrink-0 opacity-50" />
                }
                <span className="font-mono text-[11px] opacity-60">{alt.letra}.</span>
                {alt.texto}
              </div>
            );
          })}
        </div>
      )}

      {/* Gabarito V/F */}
      {showGabarito && pq.tipo === "VERDADEIRO_FALSO" && (
        <div className="ml-10">
          <div
            className={`inline-flex items-center gap-1.5 text-sm font-medium rounded px-2.5 py-1 ${
              pq.gabarito === "V"
                ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
            }`}
          >
            {pq.gabarito === "V" ? <CheckCircle2Icon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
            {pq.gabarito === "V" ? "Verdadeiro" : "Falso"}
          </div>
        </div>
      )}

      {/* Explicação */}
      {showGabarito && pq.explicacao && (
        <p className="ml-10 text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-2">
          {pq.explicacao}
        </p>
      )}
    </div>
  );
}

export function GabaritoCompacto({ questoes }: { questoes: ProvaQuestaoItem[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <KeyIcon className="size-4" />
        Gabarito
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {questoes.map((q) => (
          <div key={q.id} className="flex items-center gap-2.5 text-sm">
            {/* ordem + 1, não a posição na grade: com filtro, a resposta da questão
                47 tem de continuar rotulada 47. */}
            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{q.ordem + 1}.</span>
            {q.tipo === "VERDADEIRO_FALSO" ? (
              <span
                className={`font-bold ${
                  q.gabarito === "V" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {q.gabarito === "V" ? "Verdadeiro" : "Falso"}
              </span>
            ) : (
              <span className="font-bold text-primary font-mono">{q.gabarito}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
