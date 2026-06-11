"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { getNodeDetails, updateGraphNode } from "@/actions/graph";

interface EditNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  node: { id: string; group: string; label: string } | null;
  onSuccess?: () => void;
}

export function EditNodeModal({ open, onOpenChange, grafoId, node, onSuccess }: EditNodeModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !node) return;
    setLoading(true);
    getNodeDetails(node.group, node.id)
      .then((details) => {
        if (details) {
          setFields(
            Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v ?? ""]))
          );
        } else {
          toast.error("Nó não encontrado");
          onOpenChange(false);
        }
      })
      .catch(() => toast.error("Erro ao carregar dados do nó"))
      .finally(() => setLoading(false));
  }, [open, node]);

  const handleSave = async () => {
    if (!node) return;

    if (node.group === "FLASHCARD") {
      if (!fields.pergunta?.trim() || !fields.resposta?.trim()) {
        toast.error("Pergunta e resposta são obrigatórias");
        return;
      }
    } else if (node.group === "NOTA") {
      if (!fields.titulo?.trim()) {
        toast.error("O título da nota é obrigatório");
        return;
      }
      if (!fields.textoBruto?.trim()) {
        toast.error("O texto da nota é obrigatório");
        return;
      }
    } else if (!fields.nome?.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }

    setSaving(true);
    try {
      await updateGraphNode(node.group, node.id, {
        nome: fields.nome?.trim(),
        descricao: fields.descricao?.trim() || null,
        pergunta: fields.pergunta?.trim(),
        resposta: fields.resposta?.trim(),
        textoBruto: fields.textoBruto?.trim(),
        titulo: fields.titulo?.trim(),
      }, grafoId);
      toast.success("Nó atualizado!");
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar nó");
    } finally {
      setSaving(false);
    }
  };

  const isTextEntity = node?.group === "FLASHCARD" || node?.group === "NOTA";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar nó</DialogTitle>
          <DialogDescription>
            Altere os dados de “{node?.label}”. As mudanças valem para todos os grafos que usam este nó.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {!isTextEntity && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-nome">Nome</Label>
                  <Input
                    id="edit-nome"
                    value={fields.nome ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, nome: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="edit-descricao"
                    rows={3}
                    value={fields.descricao ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, descricao: e.target.value }))}
                  />
                </div>
              </>
            )}

            {node?.group === "FLASHCARD" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-pergunta">Pergunta</Label>
                  <Textarea
                    id="edit-pergunta"
                    rows={3}
                    value={fields.pergunta ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, pergunta: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-resposta">Resposta</Label>
                  <Textarea
                    id="edit-resposta"
                    rows={3}
                    value={fields.resposta ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, resposta: e.target.value }))}
                  />
                </div>
              </>
            )}

            {node?.group === "NOTA" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-titulo">Título</Label>
                  <Input
                    id="edit-titulo"
                    value={fields.titulo ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, titulo: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-texto">Texto da nota</Label>
                  <Textarea
                    id="edit-texto"
                    rows={6}
                    value={fields.textoBruto ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, textoBruto: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
