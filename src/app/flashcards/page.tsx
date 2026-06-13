"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  PencilIcon, Trash2Icon, PlusIcon, SearchIcon,
  Loader2Icon, FilterIcon, XIcon,
  BookOpenIcon, TrendingUpIcon, CalendarDaysIcon,
  BarChart3Icon, ArrowUpDownIcon, LayersIcon,
} from "lucide-react";
import Link from "next/link";
import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  deleteAllFlashcards,
  getFlashcards,
  getFlashcardFilterData,
} from "@/lib/content-api";
import type { FlashcardData, SpacedRepetitionData } from "@/types";

interface FlashcardWithMeta extends FlashcardData {
  topico: string;
  topicoId: string;
  assunto: string;
  assuntoId: string;
  spacedRepetition: SpacedRepetitionData | null;
  dataCriacao: Date;
}

interface ConceptOption {
  id: string;
  nome: string;
  topicoNome: string;
  assuntoNome: string;
}

interface AssuntoOption {
  id: string;
  nome: string;
  topicos: Array<{ id: string; nome: string; assuntoId: string }>;
}

const ESTAGIO_LABELS: Record<number, string> = {
  1: "Novo",
  2: "Aprendiz",
  3: "Conhece",
  4: "Familiar",
  5: "Dominado",
};

const ESTAGIO_STYLES: Record<number, string> = {
  1: "text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400 ring-red-200 dark:ring-red-800",
  2: "text-orange-500 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400 ring-orange-200 dark:ring-orange-800",
  3: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400 ring-yellow-200 dark:ring-yellow-800",
  4: "text-sky-500 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400 ring-sky-200 dark:ring-sky-800",
  5: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 ring-emerald-200 dark:ring-emerald-800",
};

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function formatDistanceToNow(date: Date) {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < -48) return { text: `Atrasado ${Math.ceil(Math.abs(diffHours) / 24)}d`, severe: true };
  if (diffHours < -24) return { text: "1d atrasado", severe: true };
  if (diffHours < 0) return { text: "Atrasado", severe: true };
  if (diffHours === 0) return { text: "Hoje", severe: false };
  if (diffHours < 24) return { text: `${diffHours}h`, severe: false };
  if (diffHours < 168) return { text: `${Math.floor(diffHours / 24)}d`, severe: false };
  return { text: `${Math.floor(diffHours / 168)}sem`, severe: false };
}

// Compute ease (1-5 scale where 5 is easiest) as a bar display
function getEaseBar(ease: number) {
  const level = Math.max(1, Math.min(5, ease));
  return Array.from({ length: 5 }, (_, i) => i < level);
}

export default function FlashcardsPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<FlashcardWithMeta[]>([]);
  const [filterData, setFilterData] = useState<AssuntoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [assuntoFilter, setAssuntoFilter] = useState("");
  const [topicoFilter, setTopicoFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "due" | "not-due" | "overdue" | "new" | "mastered">("all");
  const [sortBy, setSortBy] = useState<"date" | "difficulty" | "interval" | "alpha">("date");
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0, due: 0, overdue: 0, mastered: 0, newCount: 0,
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardWithMeta | null>(null);
  const [formPergunta, setFormPergunta] = useState("");
  const [formResposta, setFormResposta] = useState("");
  const [formConceitoId, setFormConceitoId] = useState("");
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FlashcardWithMeta | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  // Detail view
  const [detailCard, setDetailCard] = useState<FlashcardWithMeta | null>(null);

  // Load data
  const load = useCallback(async () => {
    setLoading(true);
    const [cards, hier] = await Promise.all([getFlashcards(), getFlashcardFilterData()]);
    setFlashcards(cards);
    setFilterData(hier);

    // Load concepts for dialog dropdown
    const { getConceptHierarchy } = await import("@/lib/content-api");
    const subjects = await getConceptHierarchy();
    const flatConcepts: ConceptOption[] = [];
    for (const subject of subjects) {
      for (const topico of subject.topicos) {
        for (const conceito of topico.conceitos) {
          flatConcepts.push({
            id: conceito.id,
            nome: conceito.nome,
            topicoNome: topico.nome,
            assuntoNome: subject.nome,
          });
        }
      }
    }
    flatConcepts.sort((a, b) => a.nome.localeCompare(b.nome));
    setConcepts(flatConcepts);

    // Compute stats
    const now = new Date();
    let dueCount = 0, overdueCount = 0, mastered = 0, newCount = 0;
    for (const c of cards) {
      if (!c.spacedRepetition) { newCount++; continue; }
      const stage = c.spacedRepetition.estagioAprendizado;
      if (stage === 5) { mastered++; continue; }
      const dueDate = new Date(c.spacedRepetition.proximaRevisao);
      const isOverdue = dueDate < now;
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (isOverdue) overdueCount++;
      if (diffHours < 24) dueCount++;
      if (stage <= 1) newCount++;
    }

    setStats({
      total: cards.length,
      due: dueCount,
      overdue: overdueCount,
      mastered,
      newCount,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Topic filter depends on selected assunto
  const availableTopicos = useMemo(() => {
    if (!assuntoFilter) return [];
    const ass = filterData.find((a) => a.id === assuntoFilter);
    return ass?.topicos ?? [];
  }, [assuntoFilter, filterData]);

  // ---------- Filter pipeline ----------
  const filtered = useMemo(() => {
    const now = new Date();
    let result = [...flashcards];

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((fc) =>
        fc.pergunta.toLowerCase().includes(lower) ||
        fc.resposta.toLowerCase().includes(lower) ||
        (fc.conceito ?? "").toLowerCase().includes(lower) ||
        fc.topico.toLowerCase().includes(lower) ||
        fc.assunto.toLowerCase().includes(lower)
      );
    }

    if (assuntoFilter) {
      result = result.filter((fc) => fc.assuntoId === assuntoFilter);
    }

    if (topicoFilter) {
      result = result.filter((fc) => fc.topicoId === topicoFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((fc) => {
        if (!fc.spacedRepetition) {
          return statusFilter === "new";
        }
        const dueDate = new Date(fc.spacedRepetition.proximaRevisao);
        const isOverdue = dueDate < now;
        const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        switch (statusFilter) {
          case "overdue": return isOverdue;
          case "due": return diffHours <= 24;
          case "not-due": return !isOverdue && diffHours > 24;
          case "new": return fc.spacedRepetition!.estagioAprendizado <= 1;
          case "mastered": return fc.spacedRepetition!.estagioAprendizado === 5;
          default: return true;
        }
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "alpha":
          return (a.conceito ?? "").localeCompare(b.conceito ?? "");
        case "difficulty": {
          const dA = a.spacedRepetition?.dificuldade ?? 999;
          const dB = b.spacedRepetition?.dificuldade ?? 999;
          return dA - dB;
        }
        case "interval": {
          const iA = a.spacedRepetition?.intervalo ?? 99999;
          const iB = b.spacedRepetition?.intervalo ?? 99999;
          return iA - iB;
        }
        case "date":
          return new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime();
        default: return 0;
      }
    });

    return result;
  }, [search, assuntoFilter, topicoFilter, statusFilter, sortBy, flashcards]);

  // ---------- Create / Update ----------
  const openCreateDialog = () => {
    setEditingCard(null);
    setFormPergunta("");
    setFormResposta("");
    setFormConceitoId("");
    setDialogOpen(true);
  };

  const openEditDialog = (card: FlashcardWithMeta) => {
    setEditingCard(card);
    setFormPergunta(card.pergunta);
    setFormResposta(card.resposta);
    setFormConceitoId("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formPergunta.trim() || !formResposta.trim() || !formConceitoId) {
      toast.error("Preencha todos os campos antes de salvar.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCard) {
        await updateFlashcard(editingCard.id, {
          pergunta: formPergunta,
          resposta: formResposta,
        });
      } else {
        await createFlashcard({
          pergunta: formPergunta,
          resposta: formResposta,
          conceitoId: formConceitoId,
        });
      }
      toast.success(editingCard ? "Flashcard atualizado!" : "Flashcard criado!");
      setDialogOpen(false);
      await load();
    } catch {
      toast.error("Erro ao salvar o flashcard. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Delete ----------
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setSubmitting(true);
    try {
      await deleteFlashcard(deleteTarget.id);
      toast.success("Flashcard removido!");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Erro ao remover o flashcard. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { count } = await deleteAllFlashcards();
      toast.success(`${count} flashcard(s) removido(s)!`);
      setShowDeleteAllDialog(false);
      await load();
    } catch {
      toast.error("Erro ao remover flashcards.");
    }
  };

  // ---------- Active filter count ----------
  const activeFilterCount = [
    assuntoFilter || null,
    topicoFilter || null,
    statusFilter !== "all" ? "1" : null,
    sortBy !== "date" ? "1" : null,
  ].filter(Boolean).length;

  // ---------- Clear all filters ----------
  const clearFilters = () => {
    setAssuntoFilter("");
    setTopicoFilter("");
    setStatusFilter("all");
    setSortBy("date");
    setSearch("");
  };

  // ---------- Due date badge ----------
  function getDueDateBadge(sr: SpacedRepetitionData | null) {
    if (!sr) return { badge: <Badge variant="outline" className="text-[10px] h-5 px-1.5">Sem revisao</Badge> };
    const due = new Date(sr.proximaRevisao);
    const info = formatDistanceToNow(due);
    const now = new Date();
    const isOverdue = due < now;
    const isDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60) <= 24;

    if (isOverdue) {
      return { badge: <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{info.text}</Badge> };
    }
    if (isDue) {
      return { badge: <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{info.text}</Badge> };
    }
    return { badge: <Badge variant="outline" className="text-[10px] h-5 px-1.5">{info.text}</Badge> };
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 lg:px-8 space-y-6 sm:space-y-8">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold">Flashcards</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {stats.total} flashcard{stats.total !== 1 && "s"} no total
          </p>
        </div>
        <div className="flex gap-2">
          {stats.total > 0 && (
            <Button variant="outline" className="text-red-500 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/30 h-9" onClick={() => setShowDeleteAllDialog(true)}>
              <Trash2Icon className="size-3.5 mr-1" />
              Todos
            </Button>
          )}
          <Link href="/flashcards/new">
            <Button className="w-full sm:w-auto">
              <PlusIcon className="size-4 mr-1" />
              Novo flashcard
            </Button>
          </Link>
        </div>
      </div>

      {/* ---------- Stats bar ---------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          icon={CalendarDaysIcon}
          iconColor="text-red-500"
          iconBg="bg-red-100 dark:bg-red-900/30"
          value={String(stats.overdue)}
          label="Atrasados"
        />
        <StatCard
          icon={BookOpenIcon}
          iconColor="text-orange-500"
          iconBg="bg-orange-100 dark:bg-orange-900/30"
          value={String(stats.due)}
          label="Para hoje"
        />
        <StatCard
          icon={BarChart3Icon}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-100 dark:bg-yellow-900/30"
          value={String(stats.newCount)}
          label="Iniciando"
        />
        <StatCard
          icon={TrendingUpIcon}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          value={String(stats.mastered)}
          label="Dominados"
        />
      </div>

      <Separator />

      {/* ---------- Search ---------- */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pergunta, resposta, conceito, topico, materia..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setTopicoFilter(""); }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <XIcon className="size-3.5 cursor-pointer" />
            </button>
          )}
        </div>

        {/* Filter dialog trigger */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <Button
            variant="outline"
            className="relative sm:w-[160px]"
            onClick={() => setShowFilterDialog(true)}
          >
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
              <DialogDescription>Refine a lista de flashcards criteriosamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Materia */}
              <div className="space-y-2">
                <Label>Materia</Label>
                <Select value={assuntoFilter} onValueChange={(v) => { setAssuntoFilter(v ?? ""); setTopicoFilter(""); }}>
                  <SelectTrigger><SelectValue placeholder="Todas materias" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {filterData.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topico */}
              {assuntoFilter && availableTopicos.length > 0 && (
                <div className="space-y-2">
                  <Label>Topico</Label>
                  <Select value={topicoFilter} onValueChange={(v) => setTopicoFilter(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="Todos os topicos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {availableTopicos.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="overdue">Atrasados</SelectItem>
                    <SelectItem value="due">Para hoje</SelectItem>
                    <SelectItem value="not-due">Em dia</SelectItem>
                    <SelectItem value="new">Novos / Iniciando</SelectItem>
                    <SelectItem value="mastered">Dominados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><ArrowUpDownIcon className="size-3.5" />Ordenar por</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Mais recentes</SelectItem>
                    <SelectItem value="difficulty">Dificuldade crescente</SelectItem>
                    <SelectItem value="interval">Intervalo crescente</SelectItem>
                    <SelectItem value="alpha">Alfabetica (conceito)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={() => { clearFilters(); setShowFilterDialog(false); }}>
                <XIcon className="size-3.5 mr-1" />Limpar tudo
              </Button>
              <Button onClick={() => setShowFilterDialog(false)}>Aplicar filtros</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active filter tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-zinc-500">Ativos:</span>
          {assuntoFilter && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
              Materia: {filterData.find((a) => a.id === assuntoFilter)?.nome}
              <XIcon className="size-3 cursor-pointer" onClick={() => { setAssuntoFilter(""); setTopicoFilter(""); }} />
            </Badge>
          )}
          {topicoFilter && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
              Topico: {availableTopicos.find((t) => t.id === topicoFilter)?.nome}
              <XIcon className="size-3 cursor-pointer" onClick={() => setTopicoFilter("")} />
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
              Status: {statusFilter === "not-due" ? "Em dia" : statusFilter === "overdue" ? "Atrasados" : statusFilter}
              <XIcon className="size-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
            </Badge>
          )}
          {sortBy !== "date" && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
              Ordem: {sortBy === "difficulty" ? "Dificuldade" : sortBy === "interval" ? "Intervalo" : "Alfabetica"}
              <XIcon className="size-3 cursor-pointer" onClick={() => setSortBy("date")} />
            </Badge>
          )}
        </div>
      )}

      {/* ---------- Grid ---------- */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <LayersIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-lg font-medium">Nenhum flashcard encontrado.</p>
          <p className="text-sm text-zinc-400 mt-1">Crie seu primeiro flashcard para comecar!</p>
          <Link href="/flashcards/new">
            <Button variant="link" className="mt-2">Criar novo flashcard</Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400">{filtered.length} flashcard{filtered.length !== 1 && "s"} filtrado{filtered.length !== 1 && "s"}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((fc) => {
              const dueBadge = getDueDateBadge(fc.spacedRepetition);
              const sr = fc.spacedRepetition;
              const stage = sr?.estagioAprendizado;
              const stageStyle = stage && stage > 0 ? ESTAGIO_STYLES[stage] : null;

              return (
                <Card
                  key={fc.id}
                  className="group flex flex-col transition-all hover:border-primary/30 hover:shadow-sm cursor-pointer"
                >
                  <CardContent className="flex-1 px-4 pt-4 pb-2 space-y-2.5" onClick={() => setDetailCard(fc)}>
                    {/* Concept */}
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
                      {fc.conceito}
                    </Badge>

                    {/* Question/Answer */}
                    <div>
                      <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">{truncate(fc.pergunta, 150)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{truncate(fc.resposta, 160)}</p>
                    </div>

                    <Separator />

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {dueBadge.badge}
                      {stage !== undefined && stage > 0 && stageStyle && (
                        <div className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium ring-1 ring-inset ${stageStyle}`}>
                          {ESTAGIO_LABELS[stage as number]}
                        </div>
                      )}
                    </div>

                    {/* Hierarchy path */}
                    <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                      <span className="font-medium text-zinc-500 dark:text-zinc-400">{fc.assunto}</span>
                      <span>/</span>
                      <span>{fc.topico}</span>
                    </div>

                    {/* Spaced repetition mini info */}
                    {sr && (
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <div className="flex items-center gap-1">
                          <span className="flex items-center gap-0.5">D</span>
                          {getEaseBar(Math.max(1, Math.min(5, 6 - sr.dificuldade))).map((filled, i) => (
                            <div key={i} className={`w-1.5 h-2 rounded-sm ${filled ? (sr.dificuldade <= 2 ? "bg-emerald-400" : sr.dificuldade <= 3 ? "bg-yellow-400" : "bg-red-400") : "bg-zinc-200 dark:bg-zinc-700"}`} />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarDaysIcon className="size-3" />
                          <span>{sr.intervalo}d</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="px-4 pb-3 pt-0 justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(fc); }}
                      title="Editar"
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(fc); }}
                      title="Remover"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ---------- Detail Dialog ---------- */}
      <Dialog open={!!detailCard} onOpenChange={(open) => !open && setDetailCard(null)}>
        <DialogContent className="max-w-xl">
          {detailCard && (() => {
            const sr = detailCard.spacedRepetition;
            const stage = sr?.estagioAprendizado;
            const stageStyle = stage && stage > 0 ? ESTAGIO_STYLES[stage] : null;
            const due = sr ? new Date(sr.proximaRevisao) : null;
            const dueInfo = due ? formatDistanceToNow(due) : null;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>Flashcard</DialogTitle>
                  <DialogDescription>Detalhes do flashcard</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Pergunta</Label>
                    <p className="text-sm font-medium mt-1">{detailCard.pergunta}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Resposta</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">{detailCard.resposta}</p>
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">{detailCard.conceito}</Badge>
                    <Badge variant="outline" className="text-xs">{detailCard.topico}</Badge>
                    <Badge variant="outline" className="text-xs">{detailCard.assunto}</Badge>
                    {stage !== undefined && stage > 0 && stageStyle && (
                      <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${stageStyle}`}>
                        {ESTAGIO_LABELS[stage as number]}
                      </div>
                    )}
                  </div>
                  {sr ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-zinc-800">
                      <div className="text-center">
                        <p className="text-lg font-semibold">{sr.dificuldade}</p>
                        <p className="text-[10px] text-zinc-400">Dificuldade</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">{sr.intervalo}d</p>
                        <p className="text-[10px] text-zinc-400">Intervalo</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold">{ESTAGIO_LABELS[stage as number] || "-"}</p>
                        <p className="text-[10px] text-zinc-400">Estagio</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-semibold ${dueInfo?.severe ? "text-red-500" : ""}`}>
                          {dueInfo?.text || "-"}
                        </p>
                        <p className="text-[10px] text-zinc-400">Proxima revisao</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-zinc-800">
                      <p className="text-xs text-zinc-400">Sem dados de repeticao espacada</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Criado em {detailCard.dataCriacao.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    <span>ID: {detailCard.id.slice(-6)}</span>
                  </div>
                </div>
                <DialogFooter className="gap-1">
                  <Button variant="outline" size="sm" onClick={() => setDetailCard(null)}>Fechar</Button>
                  <Button variant="outline" size="sm" onClick={() => { setDetailCard(null); openEditDialog(detailCard); }}>
                    <PencilIcon className="size-3.5 mr-1" />Editar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ---------- Create / Edit Dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Editar flashcard" : "Novo flashcard"}
            </DialogTitle>
            <DialogDescription>
              {editingCard
                ? "Atualize a pergunta e resposta deste flashcard."
                : "Preencha os campos abaixo para criar um novo flashcard."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conceito</Label>
              <Select value={formConceitoId} onValueChange={(v) => setFormConceitoId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um conceito" />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({c.assuntoNome} &gt; {c.topicoNome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pergunta</Label>
              <Textarea
                placeholder="Escreva a pergunta..."
                value={formPergunta}
                onChange={(e) => setFormPergunta(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Resposta</Label>
              <Textarea
                placeholder="Escreva a resposta..."
                value={formResposta}
                onChange={(e) => setFormResposta(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              {editingCard ? "Salvar alteracoes" : "Criar flashcard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Delete Confirmation Dialog ---------- */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o flashcard &quot;{deleteTarget ? truncate(deleteTarget.pergunta, 80) : ""}&quot;? Essa acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={submitting}
            >
              {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover todos os flashcards</DialogTitle>
            <DialogDescription>
              Esta ação remove permanentemente todos os {stats.total} flashcard(s). Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAllDialog(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={submitting}>
              {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              Remover todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reusable stat card component
function StatCard({
  icon,
  iconColor,
  iconBg,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
}) {
  const IconComp = icon;
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2.5">
      <div className={`p-1.5 rounded-md ${iconBg} ${iconColor}`}>
        <IconComp className="size-3.5" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-[10px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
