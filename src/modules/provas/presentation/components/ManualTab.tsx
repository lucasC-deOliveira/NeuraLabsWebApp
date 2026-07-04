"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, XIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { questionsHttp } from "@/modules/questions/infra/http";
import type { QuestaoListItem } from "@/modules/questions/domain/questao.types";
import { provasHttp } from "../../infra/http";
import { validateProvaDraft } from "../../domain/services/prova-form";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V/F",
  MULTIPLA_ESCOLHA: "MC",
};

export function ManualTab({ onCreated }: { onCreated: (id: string) => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [allQuestoes, setAllQuestoes] = useState<QuestaoListItem[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QuestaoListItem[]>([]);

  useEffect(() => {
    questionsHttp
      .listQuestoes()
      .then(setAllQuestoes)
      .catch(() => toast.error("Erro ao carregar questões"))
      .finally(() => setLoadingQ(false));
  }, []);

  const selectedIds = new Set(selected.map((q) => q.id));
  const filtered = allQuestoes.filter(
    (q) => !selectedIds.has(q.id) && q.enunciado.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (q: QuestaoListItem): void => {
    setSelected((prev) => (selectedIds.has(q.id) ? prev.filter((x) => x.id !== q.id) : [...prev, q]));
  };

  const move = (idx: number, dir: -1 | 1): void => {
    setSelected((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    const err = validateProvaDraft(titulo, selected.length);
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const { provaId } = await provasHttp.createProva({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        questaoIds: selected.map((q) => q.id),
      });
      toast.success("Prova criada!");
      onCreated(provaId);
    } catch {
      toast.error("Erro ao criar prova.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Prova de Biologia — 1º Bimestre" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição <span className="text-zinc-400 text-xs">(opcional)</span></Label>
          <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Tópicos cobertos, instruções..." rows={2} className="resize-none" />
        </div>
      </div>

      {/* Questões selecionadas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Questões da prova</Label>
          {selected.length > 0 && <Badge variant="outline" className="text-xs">{selected.length} selecionada{selected.length !== 1 ? "s" : ""}</Badge>}
        </div>
        {selected.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhuma questão adicionada. Use o painel abaixo para selecionar.</div>
        ) : (
          <div className="space-y-1.5">
            {selected.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
                <div className="flex flex-col gap-0.5 text-zinc-400 shrink-0">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="hover:text-primary disabled:opacity-20 leading-none text-[10px]">▲</button>
                  <button onClick={() => move(idx, 1)} disabled={idx === selected.length - 1} className="hover:text-primary disabled:opacity-20 leading-none text-[10px]">▼</button>
                </div>
                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{TIPO_LABEL[q.tipo]}</Badge>
                <p className="text-sm flex-1 min-w-0 truncate">{q.enunciado}</p>
                <button onClick={() => toggleSelect(q)} className="text-zinc-400 hover:text-red-500 shrink-0"><XIcon className="size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seletor */}
      <div className="space-y-2">
        <Label>Adicionar questões</Label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar questões..." className="pl-8" />
        </div>
        {loadingQ ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            {allQuestoes.length === 0 ? "Nenhuma questão cadastrada." : "Sem resultados."}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filtered.map((q) => (
              <button key={q.id} onClick={() => toggleSelect(q)} className="w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <PlusIcon className="size-3.5 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{TIPO_LABEL[q.tipo]}</Badge>
                <span className="text-sm flex-1 min-w-0 truncate">{q.enunciado}</span>
                {q.conceitoNome && <span className="text-[11px] text-muted-foreground shrink-0">{q.conceitoNome}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saving || !titulo.trim() || selected.length === 0}>
          {saving ? "Criando..." : `Criar prova com ${selected.length} questão${selected.length !== 1 ? "ões" : ""}`}
        </Button>
      </div>
    </div>
  );
}
