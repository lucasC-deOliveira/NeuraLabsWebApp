"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, ArrowRightIcon, Loader2Icon, FileTextIcon, BrainIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { getNotas, deleteNota, generateFlashcardsFromNota } from "@/actions/notes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NotaItem {
  id: string;
  preview: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; id: string }[];
  flashcardCount: number;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays} dia(s) atrás`;
  return new Date(date).toLocaleDateString("pt-BR");
}

export default function NotesPage() {
  const [notas, setNotas] = useState<NotaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFromNota, setGeneratingFromNota] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotaItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotas();
      setNotas(data);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerateFlashcards = async (notaId: string) => {
    setGeneratingFromNota(notaId);
    try {
      const result = await generateFlashcardsFromNota(notaId);
      if (result.flashcards.length > 0) {
        toast.success(
          `${result.flashcards.length} flashcard(s) gerado(s) a partir da nota!`,
        );
      } else {
        toast.info("Nenhum flashcard pôde ser gerado. Verifique se a nota contém definições ou conceitos vinculados.");
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Notas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Suas notas de estudo convertidas de texto bruto.
          </p>
        </div>
        <Link href="/notes/new">
          <Button>
            <PlusIcon className="size-4 mr-1" />
            Nova nota
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-zinc-400" />
        </div>
      ) : notas.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="py-12 text-center space-y-3">
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
      ) : (
        <div className="space-y-3">
          {notas.map((nota) => (
            <Card
              key={nota.id}
              className="border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <Link href={`/notes/${nota.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-1">
                        {nota.preview.split("\n")[0].replace(/^#+\s*/, "")}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {formatRelativeDate(nota.dataCriacao)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                      {nota.flashcardCount > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                          <BrainIcon className="size-3 mr-0.5" />
                          {nota.flashcardCount} FC
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                        {nota.conceitosRelacionados.length} conceito(s)
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {nota.preview}
                  </p>

                  {nota.conceitosRelacionados.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {nota.conceitosRelacionados.map((c) => (
                        <Badge key={c.id} variant="outline" className="text-[10px]">
                          {c.nome}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-400">Abrir</span>
                    <ArrowRightIcon className="size-3.5 text-zinc-400" />

                    <div className="flex-1" />

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700"
                      onClick={(e) => {
                        e.preventDefault();
                        handleGenerateFlashcards(nota.id);
                      }}
                      disabled={generatingFromNota === nota.id}
                    >
                      {generatingFromNota === nota.id ? (
                        <Loader2Icon className="size-3.5 mr-1 animate-spin" />
                      ) : (
                        <BrainIcon className="size-3.5 mr-1" />
                      )}
                      Gerar flashcards
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-7 w-7 text-red-400 hover:text-red-500"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(nota);
                      }}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta nota? Os flashcards gerados a partir dela serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
