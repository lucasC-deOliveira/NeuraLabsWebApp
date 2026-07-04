"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, FileTextIcon, FlaskConicalIcon, SparklesIcon } from "lucide-react";
import type { NotaForGen } from "../../../domain/flashcard-source.types";

type AnalysisMode = "content" | "ia";

interface NotaPickerListProps {
  notas: NotaForGen[];
  loading: boolean;
  onGenerate: (notaId: string, mode: AnalysisMode) => void;
  onCreateNota: () => void;
}

function NotaRow({ nota, onGenerate }: { nota: NotaForGen; onGenerate: (mode: AnalysisMode) => void }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800 hover:border-primary/30 transition-colors">
      <CardContent className="py-3 px-3 sm:px-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium line-clamp-1">
              {nota.preview.split("\n")[0].replace(/^#+\s*/, "") || "Sem titulo"}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{nota.preview}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {nota.conceitosRelacionados.slice(0, 4).map((c) => (
                <Badge key={c.id} variant="outline" className="text-[10px] h-4 px-1">{c.nome}</Badge>
              ))}
              {nota.conceitosRelacionados.length > 4 && (
                <span className="text-[10px] text-zinc-400">+{nota.conceitosRelacionados.length - 4}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {nota.flashcardCount > 0 ? (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{nota.flashcardCount} FC</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-emerald-500 border-emerald-300">Novo</Badge>
            )}
            {nota.dataCriacao && (
              <span className="text-[10px] text-zinc-400">{new Date(nota.dataCriacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Button size="sm" variant="outline" className="flex-1 text-xs h-9" onClick={() => onGenerate("content")}>
            <FlaskConicalIcon className="size-3.5 mr-1.5" />
            Analise conteudo
          </Button>
          <Button size="sm" className="flex-1 text-xs h-9" onClick={() => onGenerate("ia")}>
            <SparklesIcon className="size-3.5 mr-1.5" />
            Gerar com IA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotaPickerList({ notas, loading, onGenerate, onCreateNota }: NotaPickerListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Escolha uma nota</h2>
        <p className="text-xs text-zinc-400">{notas.length} nota(s)</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400 py-12 justify-center"><Loader2Icon className="size-4 animate-spin" /> Carregando notas...</div>
      ) : notas.length === 0 ? (
        <div className="text-center py-12">
          <FileTextIcon className="size-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500">Nenhuma nota disponivel.</p>
          <Button variant="link" className="text-xs mt-1" onClick={onCreateNota}>Criar nota</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {notas.map((nota) => (
            <NotaRow key={nota.id} nota={nota} onGenerate={(mode) => onGenerate(nota.id, mode)} />
          ))}
        </div>
      )}
    </div>
  );
}
