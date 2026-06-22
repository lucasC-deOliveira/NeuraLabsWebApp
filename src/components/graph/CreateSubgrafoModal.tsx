"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2Icon, NetworkIcon } from "lucide-react";
import { toast } from "sonner";
import { createSubgrafo, GRAFO_REF_RELATIONS } from "@/lib/graph-api";

interface Props {
  open: boolean;
  onClose: () => void;
  parentGrafoId: string;
  onCreated: (grafoId: string, grafoRefNodeId: string) => void;
}

export function CreateSubgrafoModal({ open, onClose, parentGrafoId, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoRelacao, setTipoRelacao] = useState("APROFUNDA");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!nome.trim()) { toast.error("Informe o nome do subgrafo."); return; }
    setSaving(true);
    try {
      const result = await createSubgrafo(parentGrafoId, { nome: nome.trim(), descricao: descricao.trim() || undefined, tipoRelacao });
      toast.success(`Subgrafo "${nome}" criado!`);
      setNome(""); setDescricao(""); setTipoRelacao("APROFUNDA");
      onCreated(result.grafoId, result.grafoRefNodeId);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar subgrafo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NetworkIcon className="size-5 text-violet-500" />
            Novo subgrafo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Álgebra Linear"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição <span className="text-zinc-400 text-xs">(opcional)</span></Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que este subgrafo cobre?"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Relação com este grafo</Label>
            <Select value={tipoRelacao} onValueChange={(v) => v && setTipoRelacao(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GRAFO_REF_RELATIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-zinc-400">
              Este grafo <strong>{GRAFO_REF_RELATIONS.find((r) => r.value === tipoRelacao)?.label.toLowerCase()}</strong> o subgrafo que será criado.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !nome.trim()}>
            {saving ? <Loader2Icon className="size-4 mr-1 animate-spin" /> : <NetworkIcon className="size-4 mr-1" />}
            Criar subgrafo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
