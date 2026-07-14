import { MarkdownContent } from "@/components/markdown-content";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";

// Exibição (não interativa) de uma questão com markdown no enunciado, nas
// alternativas e na explicação. Usada na prévia do "Melhorar com IA" e ao ver
// uma questão. A alternativa do gabarito é destacada.

export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}

export function QuestaoFace({
  tipo,
  enunciado,
  alternativas,
  gabarito,
  explicacao,
}: {
  tipo: string;
  enunciado: string;
  alternativas: QuestaoAlternativa[] | null;
  gabarito: string;
  explicacao?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-4">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enunciado</span>
        <div className="mt-1 text-sm font-medium">
          <MarkdownContent>{enunciado}</MarkdownContent>
        </div>
      </div>

      {tipo === "MULTIPLA_ESCOLHA" && alternativas && (
        <div className="space-y-1.5">
          {alternativas.map((alt) => (
            <AltRow key={alt.letra} alt={alt} correct={alt.letra === gabarito} />
          ))}
        </div>
      )}
      {tipo === "VERDADEIRO_FALSO" && <VerdadeiroFalso gabarito={gabarito} />}

      {explicacao && (
        <div className="rounded-xl border border-primary/30 bg-muted/40 p-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Explicação</span>
          <div className="mt-1 text-sm">
            <MarkdownContent>{explicacao}</MarkdownContent>
          </div>
        </div>
      )}
    </div>
  );
}

function AltRow({ alt, correct }: { alt: QuestaoAlternativa; correct: boolean }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm ${correct ? "bg-green-50 font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400" : "text-muted-foreground"}`}
    >
      {correct ? (
        <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0" />
      ) : (
        <CircleIcon className="mt-0.5 size-3.5 shrink-0" />
      )}
      <span className="mt-0.5 font-mono text-[11px] opacity-60">{alt.letra}.</span>
      <div className="min-w-0 flex-1 [&_p]:my-0">
        <MarkdownContent>{alt.texto}</MarkdownContent>
      </div>
    </div>
  );
}

function VerdadeiroFalso({ gabarito }: { gabarito: string }) {
  const verdadeiro = gabarito === "V";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium ${verdadeiro ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}
    >
      {verdadeiro ? <CheckCircle2Icon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
      Gabarito: {verdadeiro ? "Verdadeiro" : "Falso"}
    </div>
  );
}
