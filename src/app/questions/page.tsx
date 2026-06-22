"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, Trash2Icon, CheckCircle2Icon, CircleIcon, ListIcon } from "lucide-react";
import { toast } from "sonner";
import { listQuestoes, deleteQuestao, type QuestaoListItem } from "@/lib/questions-api";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V / F",
  MULTIPLA_ESCOLHA: "Múltipla escolha",
};

const TIPO_COLOR: Record<string, string> = {
  VERDADEIRO_FALSO: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",
  MULTIPLA_ESCOLHA: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
};

export default function QuestoesPage() {
  const [questoes, setQuestoes] = useState<QuestaoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    listQuestoes()
      .then(setQuestoes)
      .catch(() => toast.error("Erro ao carregar questões"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteQuestao(id);
      setQuestoes((prev) => prev.filter((q) => q.id !== id));
      toast.success("Questão removida");
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Questões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {questoes.length} questão{questoes.length !== 1 ? "ões" : ""}
          </p>
        </div>
        <Link href="/questions/new">
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Nova questão
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>
      ) : questoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <ListIcon className="size-12 text-zinc-300 dark:text-zinc-600" />
          <div>
            <p className="font-medium text-zinc-500">Nenhuma questão ainda</p>
            <p className="text-sm text-zinc-400 mt-1">Crie questões de verdadeiro/falso ou múltipla escolha</p>
          </div>
          <Link href="/questions/new">
            <Button variant="outline" className="gap-2">
              <PlusIcon className="size-4" /> Criar primeira questão
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {questoes.map((q) => (
            <div
              key={q.id}
              className="rounded-lg border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[11px] h-5 px-1.5 font-medium ${TIPO_COLOR[q.tipo]}`}
                    >
                      {TIPO_LABEL[q.tipo]}
                    </Badge>
                    {q.conceitoNome && (
                      <Badge variant="outline" className="text-[11px] h-5 px-1.5 text-zinc-500 dark:text-zinc-400">
                        {q.conceitoNome}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium leading-snug">{q.enunciado}</p>
                </div>
                <button
                  className="text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                  onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }}
                  disabled={deletingId === q.id}
                  title="Excluir questão"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>

              {expandedId === q.id && (
                <div className="mt-3 pt-3 border-t space-y-2.5">
                  {q.tipo === "MULTIPLA_ESCOLHA" && q.alternativas && (
                    <div className="space-y-1.5">
                      {q.alternativas.map((alt) => (
                        <div
                          key={alt.letra}
                          className={`flex items-center gap-2 text-sm rounded px-2.5 py-1.5 ${
                            alt.letra === q.gabarito
                              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {alt.letra === q.gabarito
                            ? <CheckCircle2Icon className="size-3.5 shrink-0" />
                            : <CircleIcon className="size-3.5 shrink-0" />
                          }
                          <span className="font-mono text-[11px] opacity-60">{alt.letra}.</span>
                          {alt.texto}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.tipo === "VERDADEIRO_FALSO" && (
                    <div className={`inline-flex items-center gap-1.5 text-sm font-medium rounded px-2.5 py-1 ${
                      q.gabarito === "V"
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                    }`}>
                      {q.gabarito === "V" ? <CheckCircle2Icon className="size-3.5" /> : <CircleIcon className="size-3.5" />}
                      {q.gabarito === "V" ? "Verdadeiro" : "Falso"}
                    </div>
                  )}

                  {q.explicacao && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-2">
                      {q.explicacao}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
