"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { PencilIcon, Trash2Icon, PlusIcon, SearchIcon, Loader2Icon } from "lucide-react";
import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  getFlashcards,
} from "@/actions/flashcard";
import { getSubjects } from "@/actions/subjects";
import type { FlashcardData, SpacedRepetitionData } from "@/types";

interface FlashcardWithMeta extends FlashcardData {
  spacedRepetition: SpacedRepetitionData | null;
  dataCriacao: Date;
}

interface ConceptOption {
  id: string;
  nome: string;
  topicoNome: string;
  assuntoNome: string;
}

const ESTAGIO_LABELS: Record<number, string> = {
  1: "Novo",
  2: "Aprendiz",
  3: "Conhece",
  4: "Familiar",
  5: "Dominado",
};

const ESTAGIO_VARIANTS: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  1: "destructive",
  2: "secondary",
  3: "secondary",
  4: "outline",
  5: "outline",
};

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<FlashcardWithMeta[]>([]);
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [conceptFilter, setConceptFilter] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardWithMeta | null>(null);
  const [formPergunta, setFormPergunta] = useState("");
  const [formResposta, setFormResposta] = useState("");
  const [formConceitoId, setFormConceitoId] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<FlashcardWithMeta | null>(null);

  // Load data
  const load = useCallback(async () => {
    setLoading(true);
    const [cards, subjects] = await Promise.all([getFlashcards(), getSubjects()]);
    setFlashcards(cards);

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
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
    const matching = concepts.find((c) => c.nome === card.conceito);
    setFormConceitoId(matching ? matching.id : "");
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

  // ---------- Filtering ----------
  const filtered = flashcards.filter((fc) => {
    const matchesSearch =
      !search ||
      fc.pergunta.toLowerCase().includes(search.toLowerCase()) ||
      fc.resposta.toLowerCase().includes(search.toLowerCase());

    const matchesConcept = !conceptFilter || fc.conceito === conceptFilter;

    return matchesSearch && matchesConcept;
  });

  // ---------- Due date badge ----------
  function getDueDateBadge(sr: SpacedRepetitionData | null) {
    if (!sr) {
      return <Badge variant="outline">Sem revisao</Badge>;
    }

    const due = new Date(sr.proximaRevisao);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }
    if (diffDays === 0) {
      return <Badge variant="secondary">Revisar hoje</Badge>;
    }
    if (diffDays <= 7) {
      return <Badge variant="outline">Em {diffDays} dia{diffDays > 1 ? "s" : ""}</Badge>;
    }
    return (
      <Badge variant="outline">
        {due.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
      </Badge>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">Flashcards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {flashcards.length} flashcard{flashcards.length !== 1 && "s"} no total
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusIcon className="size-4 mr-1" />
          Novo flashcard
        </Button>
      </div>

      <Separator />

      {/* ---------- Filters ---------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar flashcard..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={conceptFilter} onValueChange={(v) => setConceptFilter(v ?? "")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Filtrar por conceito" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {concepts.map((c) => (
              <SelectItem key={c.id} value={c.nome}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---------- Grid ---------- */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg">Nenhum flashcard encontrado.</p>
          <p className="text-sm">Crie seu primeiro flashcard para comecar!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((fc) => (
            <Card key={fc.id} className="flex flex-col">
              <CardContent className="flex-1 pt-6 space-y-3">
                <p className="text-sm font-medium line-clamp-2">{truncate(fc.pergunta, 120)}</p>
                <p className="text-sm text-muted-foreground line-clamp-3">{truncate(fc.resposta, 150)}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary">{fc.conceito}</Badge>
                  {getDueDateBadge(fc.spacedRepetition)}
                  {fc.spacedRepetition && ESTAGIO_LABELS[fc.spacedRepetition.estagioAprendizado] && (
                    <Badge variant={ESTAGIO_VARIANTS[fc.spacedRepetition.estagioAprendizado]}>
                      {ESTAGIO_LABELS[fc.spacedRepetition.estagioAprendizado]}
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEditDialog(fc)}
                  title="Editar"
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget(fc)}
                  title="Remover"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* ---------- Create / Edit Dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Editar flashcard" : "Novo flashcard"}
            </DialogTitle>
            <DialogDescription>
              {editingCard
                ? "Atualize a pergunta, resposta ou conceito deste flashcard."
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
    </div>
  );
}
