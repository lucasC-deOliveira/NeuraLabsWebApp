"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import type { ConceptOption } from "../../domain/flashcard.types";

export interface FlashcardForm {
  pergunta: string;
  resposta: string;
  conceitoId: string;
}

interface FlashcardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: FlashcardForm;
  concepts: ConceptOption[];
  submitting: boolean;
  onChange: (patch: Partial<FlashcardForm>) => void;
  onSubmit: () => void;
}

export function FlashcardEditDialog({
  open, onOpenChange, editing, form, concepts, submitting, onChange, onSubmit,
}: FlashcardEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar flashcard" : "Novo flashcard"}</DialogTitle>
          <DialogDescription>
            {editing ? "Atualize a pergunta e resposta deste flashcard." : "Preencha os campos abaixo para criar um novo flashcard."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Conceito</Label>
            <Select value={form.conceitoId} onValueChange={(v) => onChange({ conceitoId: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Selecione um conceito" /></SelectTrigger>
              <SelectContent>
                {concepts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} ({c.assuntoNome} &gt; {c.topicoNome})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Textarea placeholder="Escreva a pergunta..." value={form.pergunta} onChange={(e) => onChange({ pergunta: e.target.value })} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Resposta</Label>
            <Textarea placeholder="Escreva a resposta..." value={form.resposta} onChange={(e) => onChange({ resposta: e.target.value })} rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
            {editing ? "Salvar alteracoes" : "Criar flashcard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
