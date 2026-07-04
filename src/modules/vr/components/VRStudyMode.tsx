"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

type Card = { id: string; pergunta: string; resposta: string };

interface VRStudyModeProps {
  node: SimNode;
  onClose: () => void;
}

const btn = "py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2";

export function VRStudyMode({ node, onClose }: VRStudyModeProps) {
  const [loading, setLoading]   = useState(true);
  const [cards, setCards]       = useState<Card[]>([]);
  const [cardIdx, setCardIdx]   = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [prevKey, setPrevKey]   = useState("");

  // Reset ao trocar de nó — durante render (react-hooks v7 proíbe setState síncrono no effect).
  const nodeKey = `${node.id}:${node.group}`;
  if (nodeKey !== prevKey) {
    setPrevKey(nodeKey);
    setLoading(true); setCardIdx(0); setRevealed(false);
  }

  useEffect(() => {
    let ok = true;
    async function load() {
      if (node.group === "FLASHCARD") {
        const d = await graphHttp.getNodeDetails("FLASHCARD", node.id);
        if (ok) {
          if (d) setCards([{ id: node.id, pergunta: d.pergunta ?? "", resposta: d.resposta ?? "" }]);
          else setError("Flashcard não encontrado");
        }
      } else {
        const deck = await graphHttp.getDeckForStudy(node.id);
        if (ok) {
          const list = deck?.cards ?? [];
          setCards(list);
          if (!list.length) setError("Este baralho está vazio");
        }
      }
    }

    load()
      .catch(() => { if (ok) setError("Erro ao carregar"); })
      .finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id, node.group]);

  const card   = cards[cardIdx];
  const isLast = cardIdx >= cards.length - 1;

  const next = () => { if (isLast) { onClose(); return; } setCardIdx(i => i + 1); setRevealed(false); };

  return (
    <div className="w-full max-w-lg bg-zinc-900 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {node.group === "BARALHO" ? node.label : "Estudar flashcard"}
          </h2>
          {cards.length > 1 && (
            <p className="text-xs text-zinc-500 mt-0.5">Carta {cardIdx + 1} de {cards.length}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-zinc-700 shrink-0"
        >
          ✕
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2Icon className="animate-spin text-zinc-400" size={32} />
        </div>
      ) : error ? (
        <>
          <p className="rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-3 mb-4">{error}</p>
          <button onClick={onClose} className={`${btn} w-full border border-zinc-600 text-zinc-200 hover:bg-zinc-800`}>Fechar</button>
        </>
      ) : card ? (
        <>
          {/* Pergunta */}
          <div className="rounded-xl bg-zinc-800 border border-zinc-700 p-4 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Pergunta</p>
            <p className="text-base text-zinc-100 leading-relaxed whitespace-pre-wrap">
              {card.pergunta.replace(/[#*_`>-]/g, "").trim()}
            </p>
          </div>

          {/* Revelar / Resposta */}
          {!revealed ? (
            <button onClick={() => setRevealed(true)} className={`${btn} w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white mb-3`}>
              Ver resposta
            </button>
          ) : (
            <>
              <div className="rounded-xl bg-indigo-950/60 border border-indigo-700/50 p-4 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 mb-2">Resposta</p>
                <p className="text-base text-zinc-100 leading-relaxed whitespace-pre-wrap">
                  {card.resposta.replace(/[#*_`>-]/g, "").trim()}
                </p>
              </div>
              <button onClick={next} className={`${btn} w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white mb-3`}>
                {isLast ? "Concluir" : "Próxima →"}
              </button>
            </>
          )}

          <button onClick={onClose} className={`${btn} w-full border border-zinc-600 text-zinc-200 hover:bg-zinc-800`}>
            Sair
          </button>
        </>
      ) : null}
    </div>
  );
}
