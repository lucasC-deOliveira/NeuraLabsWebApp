"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { listUserGraphs, createGrafo, deleteGrafo } from "@/lib/graph-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeftIcon, PlusIcon, Trash2Icon, Loader2Icon, FolderIcon } from "lucide-react";
import { toast } from "sonner";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { graphVaultDir } from "@/lib/vault-sync";
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";

interface GrafosList {
  id: string;
  nome: string;
  descricao?: string | null;
  dataCriacao?: string;
}

export default function GraphListPage() {
  const router = useRouter();
  const [graphs, setGraphs] = useState<GrafosList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingGrafo, setCreatingGrafo] = useState(false);
  const [newGrafoName, setNewGrafoName] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const list = await listUserGraphs();
        setGraphs(list);
      } catch (e) {
        toast.error("Erro ao carregar grafos");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateGrafo = async () => {
    if (!newGrafoName.trim()) return;
    setCreatingGrafo(true);
    try {
      const { id } = await createGrafo(newGrafoName.trim());

      if (isDesktop()) {
        try {
          const vaultPath = await desktop.vault.getPath();
          if (vaultPath) {
            const graphDir = graphVaultDir(vaultPath, id, newGrafoName.trim());
            await desktop.vault.write(graphDir, [
              { relPath: VAULT_GUIDE_FILENAME, content: buildVaultGuide() },
            ]);
            await desktop.vault.writeSyncState(graphDir, {
              dir: graphDir,
              lastPull: new Date().toISOString(),
            });
          }
        } catch {
          // não-fatal: vault pode não estar configurado ainda
        }
      }

      toast.success("Grafo criado");
      router.push(`/graph/${id}`);
    } catch (e) {
      console.error("Erro ao criar grafo:", e);
      toast.error("Erro ao criar grafo: " + (e instanceof Error ? e.message : String(e)));
      setCreatingGrafo(false);
    }
  };

  const handleDeleteGrafo = async (id: string, name: string) => {
    if (!confirm(`Apagar "${name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteGrafo(id);
      setGraphs((prev) => prev.filter((g) => g.id !== id));
      toast.success(`Grafo "${name}" removido`);
    } catch (e) {
      toast.error("Erro ao remover grafo");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="border-b px-3 sm:px-5 py-2.5 sm:py-3 dark:border-zinc-800">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeftIcon className="mr-1 size-4" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <h1 className="text-base sm:text-lg font-semibold">Meus Grafos</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-5 py-6 sm:py-10">
        {/* Create section */}
        <Card className="mb-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium mb-2">Novo grafo de conhecimento</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Crie um grafo vazio para organizar seus estudos em um contexto específico.
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Nome do grafo (ex: Direito Constitucional)"
                value={newGrafoName}
                onChange={(e) => setNewGrafoName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateGrafo(); }}
                className="flex-1 h-10 px-3 text-sm bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <Button
                onClick={handleCreateGrafo}
                disabled={creatingGrafo || !newGrafoName.trim()}
                className="gap-1.5 flex-shrink-0"
              >
                <PlusIcon className="size-4" />
                Criar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Graph list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : graphs.length === 0 ? (
          <div className="text-center py-16">
            <div className="size-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <FolderIcon className="size-7 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum grafo criado</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              Crie seu primeiro grafo para começar a mapear seu conhecimento.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {graphs.map((g) => (
              <Card
                key={g.id}
                className="cursor-pointer hover:border-primary/50 dark:hover:border-primary/50 transition-colors bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                onClick={() => router.push(`/graph/${g.id}`)}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FolderIcon className="size-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{g.nome}</h3>
                      {g.descricao && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">{g.descricao}</p>
                      )}
                      <p className="text-[11px] text-zinc-400 mt-2">
                        Criado em {g.dataCriacao ? new Date(g.dataCriacao).toLocaleDateString("pt-BR") : "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="flex-shrink-0 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGrafo(g.id, g.nome); }}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
