"use client";

import { useEffect, useState } from "react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, Trash2Icon, ClipboardListIcon, ChevronRightIcon } from "lucide-react";
import { toast } from "sonner";
import { provasHttp } from "../infra/http";
import type { ProvaListItem } from "../domain/prova.types";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <ClipboardListIcon className="size-12 text-zinc-300 dark:text-zinc-600" />
      <div>
        <p className="font-medium text-zinc-500">Nenhuma prova ainda</p>
        <p className="text-sm text-zinc-400 mt-1">Monte uma prova selecionando questões e veja o gabarito</p>
      </div>
      <Link href="/provas/new">
        <Button variant="outline" className="gap-2">
          <PlusIcon className="size-4" /> Criar primeira prova
        </Button>
      </Link>
    </div>
  );
}

function ProvaRow({ prova, deleting, onDelete }: {
  prova: ProvaListItem;
  deleting: boolean;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={`/provas/${prova.id}`}
      className="group flex items-center gap-4 rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <ClipboardListIcon className="size-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{prova.titulo}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[11px] h-5 px-1.5">
            {prova.totalQuestoes} {prova.totalQuestoes === 1 ? "questão" : "questões"}
          </Badge>
          {prova.descricao && (
            <span className="text-xs text-muted-foreground truncate">{prova.descricao}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          onClick={onDelete}
          disabled={deleting}
          title="Excluir prova"
        >
          <Trash2Icon className="size-4" />
        </button>
        <ChevronRightIcon className="size-4 text-zinc-400 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

export function ProvasListPage() {
  const [provas, setProvas] = useState<ProvaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    provasHttp
      .listProvas()
      .then(setProvas)
      .catch(() => toast.error("Erro ao carregar provas"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Excluir esta prova?")) return;
    setDeletingId(id);
    try {
      await provasHttp.deleteProva(id);
      setProvas((prev) => prev.filter((p) => p.id !== id));
      toast.success("Prova excluída");
    } catch {
      toast.error("Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Provas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {provas.length} prova{provas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/provas/new">
          <Button className="gap-2">
            <PlusIcon className="size-4" />
            Nova prova
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>
      ) : provas.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {provas.map((p) => (
            <ProvaRow key={p.id} prova={p} deleting={deletingId === p.id} onDelete={(e) => handleDelete(e, p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
