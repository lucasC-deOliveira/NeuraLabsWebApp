"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { getNodeDetails, getDeckForStudy } from "@/lib/graph-api";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

const cls = {
  wrap: "w-full max-w-lg bg-zinc-900 rounded-2xl p-6 shadow-2xl",
  header: "flex items-center justify-between mb-4",
  title: "text-xl font-semibold text-white truncate",
  close: "text-zinc-400 hover:text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-700 shrink-0",
  scroll: "max-h-[65vh] overflow-y-auto pr-1",
  foot: "mt-4 w-full py-4 rounded-xl border border-zinc-600 text-zinc-200 text-base font-medium hover:bg-zinc-800 active:bg-zinc-700",
  err: "rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3",
  loader: "flex justify-center py-12",
  badge: "text-xs rounded-full border border-zinc-600 text-zinc-300 px-2 py-0.5",
  badgeSm: "text-xs rounded-full bg-zinc-700 text-zinc-300 px-2 py-0.5",
};

const SUBTIPO_MAP: Record<string, string> = {
  DEFINICAO: "Definição", EXPLICACAO: "Explicação", EXEMPLO: "Exemplo",
  COMPARACAO: "Comparação", SINTESE: "Síntese", PREREQUISITO: "Pré-requisito",
  ERRO_COMUM: "Erro comum", APLICACAO: "Aplicação",
};
const TIPO_NOTA_MAP: Record<string, string> = {
  LITERATURA: "Ref. literatura", PERMANENTE: "Nota permanente", ESTRUTURA: "Nota de estrutura",
};

// ── BARALHO ──────────────────────────────────────────────────────────

type Card = { id: string; pergunta: string; resposta: string };

function BaralhoContent({ node, onClose }: { node: SimNode; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo]   = useState("");
  const [cards, setCards]     = useState<Card[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    getDeckForStudy(node.id)
      .then(d => { if (ok) { setTitulo(d?.titulo ?? ""); setCards(d?.cards ?? []); } })
      .catch(() => { if (ok) setError("Erro ao carregar o baralho"); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id]);

  const toggle = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className={cls.wrap}>
      <div className={cls.header}>
        <div>
          <h2 className={cls.title}>{titulo || node.label}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {cards.length} flashcard{cards.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={onClose} className={cls.close}>✕</button>
      </div>

      {loading ? (
        <div className={cls.loader}><Loader2Icon className="animate-spin text-zinc-400" size={32} /></div>
      ) : error ? (
        <p className={cls.err}>{error}</p>
      ) : cards.length === 0 ? (
        <p className="text-zinc-400 text-sm text-center py-8">Este baralho não tem flashcards.</p>
      ) : (
        <div className={`${cls.scroll} space-y-2`}>
          {cards.map((c, i) => {
            const open = expanded.has(c.id);
            return (
              <div key={c.id} className="rounded-xl border border-zinc-700 bg-zinc-800">
                <button onClick={() => toggle(c.id)} className="flex w-full items-start gap-3 p-3 text-left">
                  <span className="text-xs text-zinc-500 pt-0.5 w-5 shrink-0">{i + 1}.</span>
                  <span className={`text-sm text-zinc-100 flex-1 ${open ? "" : "line-clamp-2"}`}>
                    {c.pergunta.replace(/[#*_`>-]/g, "").trim()}
                  </span>
                  <span className="text-zinc-500 shrink-0 text-xs">{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  <div className="border-t border-zinc-700 bg-zinc-900/60 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Resposta</p>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{c.resposta.replace(/[#*_`>-]/g, "").trim()}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button onClick={onClose} className={`${cls.foot} block mt-4`}>Fechar</button>
    </div>
  );
}

// ── NOTA ─────────────────────────────────────────────────────────────

function NotaContent({ node, onClose }: { node: SimNode; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<Record<string, string | null> | null>(null);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    getNodeDetails("NOTA", node.id)
      .then(d => { if (ok) setData(d); })
      .catch(() => { if (ok) setError("Erro ao carregar a nota"); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id]);

  return (
    <div className={cls.wrap}>
      <div className={cls.header}>
        <h2 className={cls.title}>{data?.titulo || node.label}</h2>
        <button onClick={onClose} className={cls.close}>✕</button>
      </div>
      {data && (
        <div className="flex flex-wrap gap-2 mb-4">
          {data.tipoNota && <span className={cls.badge}>{TIPO_NOTA_MAP[data.tipoNota] ?? data.tipoNota}</span>}
          {data.subtipo  && <span className={cls.badgeSm}>{SUBTIPO_MAP[data.subtipo] ?? data.subtipo}</span>}
          {data.fonte    && <span className="text-xs text-zinc-500">Fonte: {data.fonte}</span>}
        </div>
      )}
      {loading ? (
        <div className={cls.loader}><Loader2Icon className="animate-spin text-zinc-400" size={32} /></div>
      ) : error ? (
        <p className={cls.err}>{error}</p>
      ) : (
        <div className={`${cls.scroll} mb-4`}>
          <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
            {data?.conteudo || "(sem conteúdo)"}
          </p>
        </div>
      )}
      <button onClick={onClose} className={cls.foot}>Fechar</button>
    </div>
  );
}

// ── TEXTO_BRUTO ───────────────────────────────────────────────────────

function TextoBrutoContent({ node, onClose }: { node: SimNode; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo]   = useState("");
  const [texto, setTexto]     = useState("");
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    getNodeDetails("TEXTO_BRUTO", node.id)
      .then(d => { if (!ok) return; setTitulo(d?.titulo ?? d?.nome ?? "Texto bruto"); setTexto(d?.texto ?? ""); })
      .catch(() => { if (ok) setError("Erro ao carregar o texto"); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id]);

  return (
    <div className={cls.wrap}>
      <div className={cls.header}>
        <h2 className={cls.title}>{titulo || node.label}</h2>
        <button onClick={onClose} className={cls.close}>✕</button>
      </div>
      {loading ? (
        <div className={cls.loader}><Loader2Icon className="animate-spin text-zinc-400" size={32} /></div>
      ) : error ? (
        <p className={cls.err}>{error}</p>
      ) : (
        <div className={`${cls.scroll} mb-4`}>
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
            {texto || "(sem conteúdo)"}
          </pre>
        </div>
      )}
      <button onClick={onClose} className={cls.foot}>Fechar</button>
    </div>
  );
}

// ── FLASHCARD ─────────────────────────────────────────────────────────

function FlashcardContent({ node, onClose }: { node: SimNode; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    getNodeDetails("FLASHCARD", node.id)
      .then(d => { if (!ok) return; setPergunta(d?.pergunta ?? ""); setResposta(d?.resposta ?? ""); })
      .catch(() => { if (ok) setError("Erro ao carregar o flashcard"); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id]);

  return (
    <div className={cls.wrap}>
      <div className={cls.header}>
        <h2 className={cls.title}>Conteúdo do flashcard</h2>
        <button onClick={onClose} className={cls.close}>✕</button>
      </div>
      {loading ? (
        <div className={cls.loader}><Loader2Icon className="animate-spin text-zinc-400" size={32} /></div>
      ) : error ? (
        <p className={cls.err}>{error}</p>
      ) : (
        <div className="space-y-4 mb-4">
          <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Pergunta</p>
            <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
              {pergunta.replace(/[#*_`>-]/g, "").trim()}
            </p>
          </div>
          <div className="rounded-xl bg-indigo-950/60 border border-indigo-700/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-2">Resposta</p>
            <p className="text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
              {resposta.replace(/[#*_`>-]/g, "").trim()}
            </p>
          </div>
        </div>
      )}
      <button onClick={onClose} className={cls.foot}>Fechar</button>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────

export function VRContentViewer({ node, onClose }: { node: SimNode; onClose: () => void }) {
  switch (node.group) {
    case "BARALHO":     return <BaralhoContent     node={node} onClose={onClose} />;
    case "NOTA":        return <NotaContent         node={node} onClose={onClose} />;
    case "TEXTO_BRUTO": return <TextoBrutoContent   node={node} onClose={onClose} />;
    case "FLASHCARD":   return <FlashcardContent    node={node} onClose={onClose} />;
    default:            return null;
  }
}
