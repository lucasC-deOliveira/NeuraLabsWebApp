"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { getNodeDetails, updateGraphNode } from "@/lib/graph-api";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

const SUBTIPO_OPTIONS = [
  { value: "DEFINICAO",   label: "Definição" },
  { value: "EXPLICACAO",  label: "Explicação" },
  { value: "EXEMPLO",     label: "Exemplo" },
  { value: "COMPARACAO",  label: "Comparação" },
  { value: "SINTESE",     label: "Síntese" },
  { value: "PREREQUISITO",label: "Pré-requisito" },
  { value: "ERRO_COMUM",  label: "Erro comum" },
  { value: "APLICACAO",   label: "Aplicação" },
];

interface VREditFormProps {
  node: SimNode;
  grafoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VREditForm({ node, grafoId, onSuccess, onCancel }: VREditFormProps) {
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState<string | null>(null);
  const [fields,  setFields]    = useState<Record<string, string>>({});

  const tipo   = node.group;
  const isText = tipo === "FLASHCARD" || tipo === "NOTA";

  useEffect(() => {
    setLoading(true);
    setError(null);
    getNodeDetails(tipo, node.id)
      .then(details => {
        if (details) {
          setFields(Object.fromEntries(Object.entries(details).map(([k, v]) => [k, v ?? ""])));
        } else {
          setError("Nó não encontrado");
        }
      })
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, [node.id, tipo]);

  const set = (key: string, val: string) => setFields(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setError(null);
    if (tipo === "FLASHCARD") {
      if (!fields.pergunta?.trim()) { setError("Pergunta é obrigatória"); return; }
      if (!fields.resposta?.trim()) { setError("Resposta é obrigatória"); return; }
    } else if (tipo === "NOTA") {
      if (!fields.titulo?.trim())   { setError("Título é obrigatório"); return; }
      if (!fields.subtipo)          { setError("Selecione o subtipo"); return; }
      if (!fields.conteudo?.trim()) { setError("Texto da nota é obrigatório"); return; }
    } else if (!fields.nome?.trim()) {
      setError("Nome é obrigatório"); return;
    }

    setSaving(true);
    try {
      await updateGraphNode(tipo, node.id, {
        nome:      fields.nome?.trim(),
        descricao: fields.descricao?.trim() || null,
        pergunta:  fields.pergunta?.trim(),
        resposta:  fields.resposta?.trim(),
        conteudo:  fields.conteudo?.trim(),
        titulo:    fields.titulo?.trim(),
        tipoNota:  fields.tipoNota,
        subtipo:   fields.subtipo || undefined,
        fonte:     fields.fonte?.trim() || null,
      }, grafoId);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // Classes Tailwind de alta legibilidade para Quest 3
  const inp = [
    "block w-full rounded-xl border border-zinc-600 bg-zinc-800 text-white",
    "px-4 py-3 text-base leading-normal",
    "focus:outline-none focus:border-indigo-400",
  ].join(" ");
  const lbl = "block text-sm font-medium text-zinc-300 mb-1.5";

  return (
    <div className="w-full max-w-lg bg-zinc-900 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold text-white">Editar nó</h2>
        <button
          onClick={onCancel}
          className="text-zinc-400 hover:text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-700"
        >
          ✕
        </button>
      </div>
      <p className="text-xs text-zinc-500 mb-5 capitalize">
        {tipo.toLowerCase()} · {node.label} · {node.id.slice(0, 8)}
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2Icon className="animate-spin text-zinc-400" size={32} />
        </div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {error && (
            <p className="rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3">
              {error}
            </p>
          )}

          {/* ASSUNTO / TOPICO / CONCEITO / BARALHO / TEXTO_BRUTO */}
          {!isText && (
            <>
              <div>
                <label className={lbl}>Nome</label>
                <input
                  className={inp}
                  value={fields.nome ?? ""}
                  onChange={e => set("nome", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={lbl}>Descrição (opcional)</label>
                <textarea
                  className={inp}
                  rows={3}
                  value={fields.descricao ?? ""}
                  onChange={e => set("descricao", e.target.value)}
                />
              </div>
            </>
          )}

          {/* FLASHCARD */}
          {tipo === "FLASHCARD" && (
            <>
              <div>
                <label className={lbl}>Pergunta</label>
                <textarea
                  className={inp}
                  rows={3}
                  value={fields.pergunta ?? ""}
                  onChange={e => set("pergunta", e.target.value)}
                />
              </div>
              <div>
                <label className={lbl}>Resposta</label>
                <textarea
                  className={inp}
                  rows={3}
                  value={fields.resposta ?? ""}
                  onChange={e => set("resposta", e.target.value)}
                />
              </div>
            </>
          )}

          {/* NOTA */}
          {tipo === "NOTA" && (
            <>
              <div>
                <label className={lbl}>Título</label>
                <input
                  className={inp}
                  value={fields.titulo ?? ""}
                  onChange={e => set("titulo", e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={lbl}>Tipo de nota</label>
                <select
                  className={inp}
                  value={fields.tipoNota || "PERMANENTE"}
                  onChange={e => set("tipoNota", e.target.value)}
                >
                  <option value="LITERATURA">Nota de referência</option>
                  <option value="PERMANENTE">Nota permanente</option>
                  <option value="ESTRUTURA">Nota de estrutura</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Subtipo</label>
                <select
                  className={inp}
                  value={fields.subtipo || ""}
                  onChange={e => set("subtipo", e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {SUBTIPO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {fields.tipoNota === "LITERATURA" && (
                <div>
                  <label className={lbl}>Fonte</label>
                  <input
                    className={inp}
                    placeholder="Ex: Livro X, cap. 4"
                    value={fields.fonte ?? ""}
                    onChange={e => set("fonte", e.target.value)}
                    autoComplete="off"
                  />
                </div>
              )}
              <div>
                <label className={lbl}>Texto (suporta Markdown)</label>
                <textarea
                  className={inp}
                  rows={6}
                  value={fields.conteudo ?? ""}
                  onChange={e => set("conteudo", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2 pb-1">
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-xl border border-zinc-600 text-zinc-200 text-base font-medium hover:bg-zinc-800 active:bg-zinc-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-base font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2Icon className="animate-spin" size={18} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
