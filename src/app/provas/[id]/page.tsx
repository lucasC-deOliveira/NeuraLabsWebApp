"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftIcon, ClipboardCheckIcon, EyeIcon, EyeOffIcon,
  CheckCircle2Icon, CircleIcon, ListIcon, KeyIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getProva, type ProvaDetail, type ProvaQuestaoItem } from "@/lib/provas-api";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V / F",
  MULTIPLA_ESCOLHA: "Múltipla escolha",
};

type Tab = "questoes" | "gabarito";

function QuestaoCard({
  pq,
  numero,
  showGabarito,
}: {
  pq: ProvaQuestaoItem;
  numero: number;
  showGabarito: boolean;
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
            {pq.conceitoNome && (
              <Badge variant="outline" className="text-[11px] h-5 px-1.5 text-zinc-500">
                {pq.conceitoNome}
              </Badge>
            )}
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

function GabaritoCompacto({ questoes }: { questoes: ProvaQuestaoItem[] }) {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <KeyIcon className="size-4" />
        Gabarito
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {questoes.map((q, i) => (
          <div key={q.id} className="flex items-center gap-2.5 text-sm">
            <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
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

export default function ProvaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prova, setProva] = useState<ProvaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("questoes");
  const [showGabarito, setShowGabarito] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProva(id)
      .then(setProva)
      .catch(() => { toast.error("Prova não encontrada"); router.push("/provas"); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!prova) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => router.push("/provas")}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-snug">{prova.titulo}</h1>
          {prova.descricao && (
            <p className="text-sm text-muted-foreground mt-1">{prova.descricao}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              {prova.questoes.length} {prova.questoes.length === 1 ? "questão" : "questões"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
        <button
          onClick={() => setTab("questoes")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "questoes"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListIcon className="size-4" /> Questões
        </button>
        <button
          onClick={() => setTab("gabarito")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "gabarito"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyIcon className="size-4" /> Gabarito
        </button>
      </div>

      {tab === "questoes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => setShowGabarito((v) => !v)}
            >
              {showGabarito ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              {showGabarito ? "Ocultar gabarito" : "Ver gabarito"}
            </Button>
          </div>
          {prova.questoes.map((pq, i) => (
            <QuestaoCard key={pq.id} pq={pq} numero={i + 1} showGabarito={showGabarito} />
          ))}
        </div>
      )}

      {tab === "gabarito" && (
        <div className="space-y-4">
          <GabaritoCompacto questoes={prova.questoes} />

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Gabarito detalhado</p>
            {prova.questoes.map((pq, i) => (
              <QuestaoCard key={pq.id} pq={pq} numero={i + 1} showGabarito={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
