"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  PlusIcon, ArrowRightIcon, Loader2Icon, FileTextIcon, BrainIcon,
  Trash2Icon, SearchIcon, XIcon, FilterIcon, CalendarIcon,
  BarChart3Icon, EyeIcon, LayersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getNotas, deleteNota, deleteAllNotas, generateFlashcardsFromNota, getNotasFilterData } from "@/actions/notes";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface NotaItem {
  id: string;
  preview: string;
  titulo: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; id: string }[];
  flashcardCount: number;
  wordCount: number;
}

// ── Time helpers ──

function formatRelativeDate(date: Date): { text: string; severe: boolean } {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 5) return { text: "agora", severe: false };
  if (diffMins < 60) return { text: `${diffMins}m`, severe: false };
  if (diffHours < 24) return { text: `${diffHours}h`, severe: false };
  if (diffDays < 7) return { text: `${diffDays}d`, severe: false };
  if (diffDays < 30) return { text: `${Math.floor(diffDays / 7)}sem`, severe: false };
  return { text: new Date(date).toLocaleDateString("pt-BR"), severe: false };
}

function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Time bucket for filter ──
function getTimeBucket(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 24) return "today";
  if (diffDays < 7) return "week";
  if (diffDays < 30) return "month";
  return "older";
}

// ── Sort types ──
type SortOrder = "date-desc" | "date-asc" | "alpha" | "words-desc" | "fc-desc";

export default function NotesPage() {
  const [notas, setNotas] = useState<NotaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFromNota, setGeneratingFromNota] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotaItem | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [assuntos, setAssuntos] = useState<Array<{ id: string; nome: string }>>([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [conceptFilter, setConceptFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week" | "month" | "older">("all");
  const [fcFilter, setFcFilter] = useState<"all" | "has-fc" | "no-fc">("all");
  const [sortBy, setSortBy] = useState<SortOrder>("date-desc");
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // All unique concepts across notes for filter dropdown
  const allConcepts = useMemo(() => {
    const map = new Map<string, string>();
    for (const nota of notas) {
      for (const c of nota.conceitosRelacionados) {
        map.set(c.id, c.nome);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [notas]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, filterData] = await Promise.all([getNotas(), getNotasFilterData()]);
      setNotas(data);
      setAssuntos(filterData);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerateFlashcards = async (notaId: string) => {
    setGeneratingFromNota(notaId);
    try {
      const result = await generateFlashcardsFromNota(notaId);
      if (result.flashcards.length > 0) {
        toast.success(`${result.flashcards.length} flashcard(s) gerado(s) a partir da nota!`);
      } else {
        toast.info("Nenhum flashcard pôde ser gerado.");
      }
      await load();
    } catch {
      toast.error("Erro ao gerar flashcards.");
    } finally {
      setGeneratingFromNota(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteNota(deleteTarget.id);
      toast.success("Nota removida.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Erro ao remover nota.");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { count } = await deleteAllNotas();
      toast.success(`${count} nota(s) removida(s).`);
      setShowDeleteAllDialog(false);
      await load();
    } catch {
      toast.error("Erro ao remover notas.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setConceptFilter("");
    setTimeFilter("all");
    setFcFilter("all");
    setSortBy("date-desc");
  };

  const activeFilterCount = [
    conceptFilter || null,
    timeFilter !== "all" ? "1" : null,
    fcFilter !== "all" ? "1" : null,
    sortBy !== "date-desc" ? "1" : null,
  ].filter(Boolean).length;

  // ── Filter pipeline ──
  const filtered = useMemo(() => {
    let result = [...notas];

    if (search) {
      const l = search.toLowerCase();
      result = result.filter((n) =>
        n.titulo.toLowerCase().includes(l) ||
        n.preview.toLowerCase().includes(l)
      );
    }

    if (conceptFilter) {
      result = result.filter((n) =>
        n.conceitosRelacionados.some((c) => c.id === conceptFilter)
      );
    }

    if (timeFilter !== "all") {
      result = result.filter((n) => getTimeBucket(n.dataCriacao) === timeFilter);
    }

    if (fcFilter === "has-fc") {
      result = result.filter((n) => n.flashcardCount > 0);
    } else if (fcFilter === "no-fc") {
      result = result.filter((n) => n.flashcardCount === 0);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "date-asc": return new Date(a.dataCriacao).getTime() - new Date(b.dataCriacao).getTime();
        case "alpha": return a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base" });
        case "words-desc": return b.wordCount - a.wordCount;
        case "fc-desc": return b.flashcardCount - a.flashcardCount;
        default: return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
      }
    });

    return result;
  }, [notas, search, conceptFilter, timeFilter, fcFilter, sortBy]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = notas.length;
    let withFc = 0, noFc = 0, totalWords = 0;
    const conceptSet = new Set<string>();
    for (const n of notas) {
      if (n.flashcardCount > 0) withFc++; else noFc++;
      totalWords += n.wordCount;
      for (const c of n.conceitosRelacionados) conceptSet.add(c.id);
    }
    return { total, withFc, noFc, totalWords, conceptCount: conceptSet.size };
  }, [notas]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
        <div>
          <div className="h-8 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-40 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mt-2" />
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Notas</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {stats.total} nota{stats.total !== 1 && "s"}, {stats.totalWords.toLocaleString("pt-BR")} palavras
          </p>
        </div>
        <div className="flex gap-2">
          {notas.length > 0 && (
            <Button variant="outline" className="text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 h-9" onClick={() => setShowDeleteAllDialog(true)}>
              <Trash2Icon className="size-3.5 mr-1" />
              Todas
            </Button>
          )}
          <Link href="/notes/new">
            <Button className="w-full sm:w-auto">
              <PlusIcon className="size-4 mr-1" />
              Nova nota
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={LayersIcon} iconColor="text-violet-500" iconBg="bg-violet-100 dark:bg-violet-900/30" value={String(stats.conceptCount)} label="Conceitos" />
        <StatCard icon={BrainIcon} iconColor="text-emerald-500" iconBg="bg-emerald-100 dark:bg-emerald-900/30" value={String(stats.withFc)} label="Com flashcards" />
        <StatCard icon={EyeIcon} iconColor="text-amber-500" iconBg="bg-amber-100 dark:bg-amber-900/30" value={String(stats.noFc)} label="Sem flashcards" />
        <StatCard icon={BarChart3Icon} iconColor="text-sky-500" iconBg="bg-sky-100 dark:bg-sky-900/30" value={stats.totalWords.toLocaleString("pt-BR")} label="Palavras" />
      </div>

      <Separator />

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Buscar por titulo ou conteudo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <XIcon className="size-3.5 cursor-pointer" />
            </button>
          )}
        </div>
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <Button variant="outline" className="relative sm:w-[160px]" onClick={() => setShowFilterDialog(true)}>
            <FilterIcon className="size-4 mr-1.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 bg-primary text-[9px] text-primary-foreground rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Refine a lista de notas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Concept filter */}
              {allConcepts.length > 0 && (
                <div className="space-y-2">
                  <Label>Conceito</Label>
                  <Select value={conceptFilter} onValueChange={(v) => setConceptFilter(v || "")}>
                    <SelectTrigger><SelectValue placeholder="Todos os conceitos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {allConcepts.map(([id, nome]) => (
                        <SelectItem key={id} value={id}>{nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Flashcards status */}
              <div className="space-y-2">
                <Label>Flashcards</Label>
                <Select value={fcFilter} onValueChange={(v) => setFcFilter(v as typeof fcFilter)}>
                  <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="has-fc">Com flashcards</SelectItem>
                    <SelectItem value="no-fc">Sem flashcards</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time */}
              <div className="space-y-2">
                <Label>Periodo</Label>
                <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as typeof timeFilter)}>
                  <SelectTrigger><SelectValue placeholder="Qualquer data" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Qualquer</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta semana</SelectItem>
                    <SelectItem value="month">Este mês</SelectItem>
                    <SelectItem value="older">Antigas</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1 flex-wrap">
                  <TimePill label="Hoje" value="today" active={timeFilter} onChange={setTimeFilter} />
                  <TimePill label="Semana" value="week" active={timeFilter} onChange={setTimeFilter} />
                  <TimePill label="Mes" value="month" active={timeFilter} onChange={setTimeFilter} />
                  <TimePill label="Antigas" value="older" active={timeFilter} onChange={setTimeFilter} />
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOrder)}>
                  <SelectTrigger><SelectValue placeholder="Mais recente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Mais recente</SelectItem>
                    <SelectItem value="date-asc">Mais antiga</SelectItem>
                    <SelectItem value="alpha">Alfabetica</SelectItem>
                    <SelectItem value="words-desc">Mais palavras</SelectItem>
                    <SelectItem value="fc-desc">Mais flashcards</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" size="sm" onClick={clearFilters} disabled={activeFilterCount === 0} className="text-xs">Limpar filtros</Button>
              <Button onClick={() => setShowFilterDialog(false)} size="sm">Aplicar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {conceptFilter && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
              {allConcepts.find(c => c[0] === conceptFilter)?.[1] || "Conceito"}
              <button type="button" onClick={() => setConceptFilter("")}><XIcon className="size-3 ml-0.5" /></button>
            </Badge>
          )}
          {timeFilter !== "all" && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
              <CalendarIcon className="size-3" />
              {({ today: "Hoje", week: "Semana", month: "Mes", older: "Antigas" } as Record<string, string>)[timeFilter]}
              <button type="button" onClick={() => setTimeFilter("all")}><XIcon className="size-3 ml-0.5" /></button>
            </Badge>
          )}
          {fcFilter !== "all" && (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
              <BrainIcon className="size-3" />
              {fcFilter === "has-fc" ? "Com FC" : "Sem FC"}
              <button type="button" onClick={() => setFcFilter("all")}><XIcon className="size-3 ml-0.5" /></button>
            </Badge>
          )}
          <button type="button" onClick={clearFilters} className="text-[10px] text-zinc-400 hover:text-zinc-600 ml-1 underline">Limpar tudo</button>
        </div>
      )}

      {/* Results count */}
      {search && (
        <p className="text-xs text-zinc-400">{filtered.length} de {notas.length} nota(s)</p>
      )}

      {/* Notes list */}
      {notas.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="py-8 sm:py-12 text-center space-y-3">
            <FileTextIcon className="size-10 mx-auto text-zinc-300 dark:text-zinc-600" />
            <div>
              <p className="text-lg font-medium">Nenhuma nota criada</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Cole texto bruto e transforme em notas com vínculos semânticos.
              </p>
            </div>
            <Link href="/notes/new">
              <Button variant="outline" className="mt-2">
                Criar primeira nota
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <FilterIcon className="size-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum resultado para os filtros aplicados.</p>
          <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">Limpar filtros</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((nota) => {
            const timeInfo = formatRelativeDate(nota.dataCriacao);
            return (
              <Card key={nota.id} className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <Link href={`/notes/${nota.id}`}>
                  <div className="px-3 sm:px-6 pt-3 pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Title + time row */}
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium line-clamp-1 truncate">{nota.titulo}</h3>
                          <span className={`text-[10px] font-medium flex-shrink-0 ${timeInfo.severe ? "text-red-500" : "text-zinc-400"}`}>
                            {formatFullDate(nota.dataCriacao)}
                          </span>
                        </div>
                        {/* Preview */}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {nota.preview}
                        </p>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {/* Word count */}
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums">
                        {nota.wordCount} palavras
                      </Badge>
                      {/* Flashcard count */}
                      {nota.flashcardCount > 0 ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5">
                          <BrainIcon className="size-3" />{nota.flashcardCount}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-emerald-500 border-emerald-300 dark:border-emerald-700">
                          Sem FC
                        </Badge>
                      )}
                      {/* Concept badges */}
                      {nota.conceitosRelacionados.length > 0 && (
                        <span className="text-[10px] text-zinc-400 mr-0.5 flex items-center gap-1">
                          <LayersIcon className="size-3" />
                          {nota.conceitosRelacionados.slice(0, 4).map((c) => (
                            <Badge key={c.id} variant="outline" className="text-[10px] h-5 px-1">{c.nome}</Badge>
                          ))}
                          {nota.conceitosRelacionados.length > 4 && (
                            <span className="text-[10px] text-zinc-400">+{nota.conceitosRelacionados.length - 4}</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                        Abrir <ArrowRightIcon className="size-3" />
                      </span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGenerateFlashcards(nota.id); }}
                        disabled={generatingFromNota === nota.id}
                      >
                        {generatingFromNota === nota.id ? (
                          <Loader2Icon className="size-3.5 mr-1 animate-spin" />
                        ) : (
                          <BrainIcon className="size-3.5 mr-1" />
                        )}
                        <span className="hidden sm:inline">Gerar FC</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-7 w-7 text-red-400 hover:text-red-500"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(nota); }}
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta nota? Os flashcards gerados a partir dela serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Remover todas as notas</DialogTitle>
            <DialogDescription>
              Esta ação remove permanentemente todas as {stats.total} nota(s). Flashcards gerados serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>Remover todas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Small components ──

function StatCard({ icon: Icon, iconColor, iconBg, value, label }: { icon: React.ComponentType<{ className?: string }>; iconColor: string; iconBg: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-3 py-2.5">
      <div className={`size-8 rounded-md flex items-center justify-center ${iconBg}`}>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

function TimePill<T extends string>({ label, value, active, onChange }: { label: string; value: T; active: T | "all"; onChange: (v: T | "all") => void }) {
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => onChange(isActive ? "all" : value)}
      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700"}`}
    >
      {label}
    </button>
  );
}
