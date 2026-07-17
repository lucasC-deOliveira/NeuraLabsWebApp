"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { graphHttp } from "@/modules/graph/infra/http";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, Trash2Icon, Loader2Icon, FolderIcon, SearchXIcon, TagIcon } from "lucide-react";
import { toast } from "sonner";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { graphVaultDir } from "@/lib/vault-sync";
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import { DeleteGraphModal } from "@/modules/graph/presentation/components/vault/DeleteGraphModal";
import { useGraphList } from "@/modules/graph/presentation/hooks/useGraphList";
import { useGraphAssuntos } from "@/modules/graph/presentation/hooks/useGraphAssuntos";
import { GraphListFilters } from "@/modules/graph/presentation/components/GraphListFilters";
import { GraphListPagination } from "@/modules/graph/presentation/components/GraphListPagination";

export default function GraphListPage() {
  const router = useRouter();
  const { params, result, loading, setFilter, setPage, reload } = useGraphList();
  const assuntos = useGraphAssuntos();
  const [creatingGrafo, setCreatingGrafo] = useState(false);
  const [newGrafoName, setNewGrafoName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);
  const [deletingGrafo, setDeletingGrafo] = useState(false);

  // Filtros ativos que REDUZEM os resultados (ordenação não conta) — distingue
  // "nenhum grafo ainda" de "nenhum resultado para o filtro".
  const hasActiveFilters =
    !!params.q ||
    (params.tipo && params.tipo !== "todos") ||
    !!params.createdFrom ||
    !!params.assuntoIds?.length;

  const handleCreateGrafo = async () => {
    if (!newGrafoName.trim()) return;
    setCreatingGrafo(true);
    try {
      const { id } = await graphHttp.createGrafo(newGrafoName.trim());

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

  const confirmDeleteGrafo = async () => {
    if (!deleteTarget) return;
    const { id, nome } = deleteTarget;
    setDeletingGrafo(true);
    try {
      await graphHttp.deleteGrafo(id);
      toast.success(`Grafo "${nome}" removido`);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      toast.error("Erro ao remover grafo");
    } finally {
      setDeletingGrafo(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Content */}
      <PageContainer className="flex-1">
        <PageHeader title="Meus Grafos" />
        {/* Create section */}
        <Card className="mb-8 bg-card border-border">
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium mb-2">Novo grafo de conhecimento</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Crie um grafo vazio para organizar seus estudos em um contexto específico.
            </p>
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                placeholder="Nome do grafo (ex: Direito Constitucional)"
                value={newGrafoName}
                onChange={(e) => setNewGrafoName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateGrafo(); }}
                className="flex-1 h-10 px-3 text-sm bg-transparent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
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

        {/* Filtros avançados */}
        <GraphListFilters params={params} assuntos={assuntos} onFilter={setFilter} />

        {/* Graph list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : result.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              {hasActiveFilters ? (
                <SearchXIcon className="size-7 text-muted-foreground" />
              ) : (
                <FolderIcon className="size-7 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {hasActiveFilters ? "Nenhum grafo encontrado" : "Nenhum grafo criado"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "Tente ajustar a busca ou os filtros para encontrar seus grafos."
                : "Crie seu primeiro grafo para começar a mapear seu conhecimento."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((g) => (
              <Card
                key={g.id}
                className="cursor-pointer hover:border-primary/50 dark:hover:border-primary/50 transition-colors bg-card border-border"
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
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.descricao}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Criado em {g.dataCriacao ? new Date(g.dataCriacao).toLocaleDateString("pt-BR") : "—"}
                        {g.filhosCount ? ` · ${g.filhosCount} subgrafo${g.filhosCount === 1 ? "" : "s"}` : ""}
                      </p>
                      {g.assuntos && g.assuntos.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {g.assuntos.slice(0, 3).map((a, i) => {
                            // Backend ordena por peso desc — a 1ª (com peso > 0) é o assunto
                            // mais conectado do grafo; ganha destaque visual.
                            const isTop = i === 0 && a.peso > 0;
                            return (
                              <Badge
                                key={a.id}
                                variant={isTop ? "default" : "secondary"}
                                className={`gap-1 text-[10px] ${isTop ? "font-medium" : "font-normal"}`}
                                title={isTop ? "Assunto mais conectado deste grafo" : undefined}
                              >
                                <TagIcon className="size-2.5" />
                                {a.nome}
                              </Badge>
                            );
                          })}
                          {g.assuntos.length > 3 && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              +{g.assuntos.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="flex-shrink-0 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: g.id, nome: g.nome }); }}
                    >
                      <Trash2Icon className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && (
          <GraphListPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            onPage={setPage}
          />
        )}
      </PageContainer>

      <DeleteGraphModal
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        graphName={deleteTarget?.nome ?? ""}
        loading={deletingGrafo}
        onConfirm={confirmDeleteGrafo}
      />
    </div>
  );
}
