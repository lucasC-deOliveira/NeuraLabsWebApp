"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { PlusIcon, ListIcon } from "lucide-react";
import { toast } from "sonner";
import { questionsHttp } from "../infra/http";
import type { QuestaoListItem } from "../domain/questao.types";
import { QuestaoCard } from "./components/QuestaoCard";

function ListHeader({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">Questões</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{count} questão{count !== 1 ? "ões" : ""}</p>
      </div>
      <Link href="/questions/new">
        <Button className="gap-2">
          <PlusIcon className="size-4" />
          Nova questão
        </Button>
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
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
  );
}

export function QuestoesListPage() {
  const [questoes, setQuestoes] = useState<QuestaoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    questionsHttp
      .listQuestoes()
      .then(setQuestoes)
      .catch(() => toast.error("Erro ao carregar questões"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string): Promise<void> => {
    setDeletingId(id);
    try {
      await questionsHttp.deleteQuestao(id);
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
      <ListHeader count={questoes.length} />
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>
      ) : questoes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {questoes.map((q) => (
            <QuestaoCard
              key={q.id}
              questao={q}
              expanded={expandedId === q.id}
              deleting={deletingId === q.id}
              onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
              onDelete={() => handleDelete(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
