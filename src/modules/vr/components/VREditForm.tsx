"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

const SUBTIPO_OPTIONS = [
  { value: "DEFINICAO",    label: "Definição" },
  { value: "EXPLICACAO",   label: "Explicação" },
  { value: "EXEMPLO",      label: "Exemplo" },
  { value: "COMPARACAO",   label: "Comparação" },
  { value: "SINTESE",      label: "Síntese" },
  { value: "PREREQUISITO", label: "Pré-requisito" },
  { value: "ERRO_COMUM",   label: "Erro comum" },
  { value: "APLICACAO",    label: "Aplicação" },
];

export interface VREditFormProps {
  node: SimNode;
  grafoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const inp = [
  "block w-full rounded-xl border border-zinc-600 bg-zinc-800 text-white",
  "px-4 py-3 text-base leading-normal",
  "focus:outline-none focus:border-indigo-400",
].join(" ");
const lbl = "block text-sm font-medium text-zinc-300 mb-1.5";

type Fields = Record<string, string>;
interface FieldSectionProps {
  fields: Fields;
  set: (k: string, v: string) => void;
}

function validateFlashcard(f: Fields): string | null {
  if (!f.pergunta?.trim()) return "Pergunta obrigatória";
  return f.resposta?.trim() ? null : "Resposta obrigatória";
}

function validateNota(f: Fields): string | null {
  if (!f.titulo?.trim()) return "Título obrigatório";
  if (!f.subtipo) return "Selecione o subtipo";
  return f.conteudo?.trim() ? null : "Texto obrigatório";
}

// Valida os campos obrigatórios por tipo de nó; devolve a mensagem de erro ou null.
function validateFields(tipo: string, f: Fields): string | null {
  if (tipo === "FLASHCARD") return validateFlashcard(f);
  if (tipo === "NOTA") return validateNota(f);
  if (tipo === "TEXTO_BRUTO") return f.titulo?.trim() ? null : "Título obrigatório";
  return f.nome?.trim() ? null : "Nome obrigatório";
}

function buildUpdatePayload(f: Fields): Record<string, unknown> {
  return {
    nome: f.nome?.trim(),
    descricao: f.descricao?.trim() || null,
    titulo: f.titulo?.trim(),
    texto: f.texto?.trim(),
    pergunta: f.pergunta?.trim(),
    resposta: f.resposta?.trim(),
    conteudo: f.conteudo?.trim(),
    tipoNota: f.tipoNota,
    subtipo: f.subtipo || undefined,
    fonte: f.fonte?.trim() || null,
  };
}

function Field({ label, value, onChange, multiline, rows }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {multiline
        ? <textarea className={inp} rows={rows ?? 3} value={value} onChange={(e) => onChange(e.target.value)} />
        : <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />}
    </div>
  );
}

function StructuralFields({ fields, set }: FieldSectionProps) {
  return (
    <>
      <Field label="Nome" value={fields.nome ?? ""} onChange={(v) => set("nome", v)} />
      <Field label="Descrição (opcional)" value={fields.descricao ?? ""} onChange={(v) => set("descricao", v)} multiline rows={3} />
    </>
  );
}

function TextoBrutoFields({ fields, set }: FieldSectionProps) {
  return (
    <>
      <Field label="Título" value={fields.titulo ?? ""} onChange={(v) => set("titulo", v)} />
      <Field label="Texto" value={fields.texto ?? ""} onChange={(v) => set("texto", v)} multiline rows={8} />
    </>
  );
}

function FlashcardFields({ fields, set }: FieldSectionProps) {
  return (
    <>
      <Field label="Pergunta" value={fields.pergunta ?? ""} onChange={(v) => set("pergunta", v)} multiline rows={3} />
      <Field label="Resposta" value={fields.resposta ?? ""} onChange={(v) => set("resposta", v)} multiline rows={3} />
    </>
  );
}

function NotaFields({ fields, set }: FieldSectionProps) {
  return (
    <>
      <Field label="Título" value={fields.titulo ?? ""} onChange={(v) => set("titulo", v)} />
      <div>
        <label className={lbl}>Tipo de nota</label>
        <select className={inp} value={fields.tipoNota || "PERMANENTE"} onChange={(e) => set("tipoNota", e.target.value)}>
          <option value="LITERATURA">Nota de referência</option>
          <option value="PERMANENTE">Nota permanente</option>
          <option value="ESTRUTURA">Nota de estrutura</option>
        </select>
      </div>
      <div>
        <label className={lbl}>Subtipo</label>
        <select className={inp} value={fields.subtipo || ""} onChange={(e) => set("subtipo", e.target.value)}>
          <option value="">Selecione…</option>
          {SUBTIPO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {fields.tipoNota === "LITERATURA" && (
        <Field label="Fonte" value={fields.fonte ?? ""} onChange={(v) => set("fonte", v)} />
      )}
      <Field label="Texto (Markdown)" value={fields.conteudo ?? ""} onChange={(v) => set("conteudo", v)} multiline rows={6} />
    </>
  );
}

function EditFields({ tipo, fields, set }: { tipo: string } & FieldSectionProps) {
  if (tipo === "FLASHCARD") return <FlashcardFields fields={fields} set={set} />;
  if (tipo === "NOTA") return <NotaFields fields={fields} set={set} />;
  if (tipo === "TEXTO_BRUTO") return <TextoBrutoFields fields={fields} set={set} />;
  return <StructuralFields fields={fields} set={set} />;
}

export function VREditForm({ node, grafoId, onSuccess, onCancel }: VREditFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [prevKey, setPrevKey] = useState("");

  const tipo = node.group;
  const nodeKey = `${node.id}:${tipo}`;

  // Reset ao trocar de nó — durante render (react-hooks v7 proíbe setState síncrono no effect).
  if (nodeKey !== prevKey) {
    setPrevKey(nodeKey);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    let ok = true;
    graphHttp.getNodeDetails(tipo, node.id)
      .then((d) => {
        if (!ok) return;
        if (d) setFields(Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ""])));
        else setError("Nó não encontrado");
      })
      .catch(() => { if (ok) setError("Erro ao carregar dados"); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id, tipo]);

  const set = (k: string, v: string): void => setFields((f) => ({ ...f, [k]: v }));

  const handleSave = async (): Promise<void> => {
    const err = validateFields(tipo, fields);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await graphHttp.updateGraphNode(tipo, node.id, buildUpdatePayload(fields), grafoId);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-zinc-900 rounded-2xl p-6 shadow-2xl">
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
            <p className="rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3">{error}</p>
          )}

          <EditFields tipo={tipo} fields={fields} set={set} />

          <div className="flex gap-3 pt-2 pb-1">
            <button onClick={onCancel} className="flex-1 py-4 rounded-xl border border-zinc-600 text-zinc-200 text-base font-medium hover:bg-zinc-800 active:bg-zinc-700">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-base font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2Icon className="animate-spin" size={18} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
