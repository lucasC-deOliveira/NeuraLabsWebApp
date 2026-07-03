"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon, ChevronRightIcon, CheckCircle2Icon } from "lucide-react";
import type { ConceitoArvore, TopicoEntry, ConceitoNode } from "../../../domain/concept-tree.types";
import { countSelectedInAssunto, countSelectedInTopico } from "../../../domain/services/concept-tree";

export type ExpandKind = "assunto" | "relAssunto" | "topico" | "relTopico";

export interface TreeCtx {
  selected: Set<string>;
  isExpanded: (kind: ExpandKind, id: string) => boolean;
  toggle: (kind: ExpandKind, id: string) => void;
  onToggleConcept: (id: string) => void;
}

function Chevron({ open, size = "size-3.5" }: { open: boolean; size?: string }) {
  return open ? <ChevronDownIcon className={`${size} text-zinc-400`} /> : <ChevronRightIcon className={`${size} text-zinc-400`} />;
}

function ConceitoRow({ conc, ctx }: { conc: ConceitoNode; ctx: TreeCtx }) {
  const sel = ctx.selected.has(conc.id);
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 ${sel ? "bg-primary/[0.04]" : ""}`}
      onClick={() => ctx.onToggleConcept(conc.id)}
    >
      <div className={`size-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${sel ? "bg-primary border-primary text-primary-foreground" : "border-zinc-300 dark:border-zinc-600"}`}>
        {sel && <CheckCircle2Icon className="size-2.5" />}
      </div>
      <span className="text-xs text-zinc-700 dark:text-zinc-300">{conc.nome}</span>
    </button>
  );
}

function TopicoNode({ topico, ctx }: { topico: TopicoEntry; ctx: TreeCtx }) {
  const te = ctx.isExpanded("topico", topico.id);
  const count = countSelectedInTopico(topico, ctx.selected);
  return (
    <div>
      <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => ctx.toggle("topico", topico.id)}>
        <Chevron open={te} size="size-3" />
        <span className="text-xs text-zinc-500">{topico.nome}</span>
        {count > 0 && <span className="ml-auto text-[10px] text-emerald-500">{count}</span>}
      </button>
      {te && topico.relacoesTopicoConceito.map((rtc) => {
        const rte = ctx.isExpanded("relTopico", topico.id);
        return (
          <div key={rtc.tipoRelacao}>
            <button type="button" className="w-full flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => ctx.toggle("relTopico", topico.id)}>
              <Chevron open={rte} size="size-2.5" />
              <Badge variant="outline" className="text-[9px] h-3.5 px-0.5">{rtc.tipoRelacao}</Badge>
            </button>
            {rte && (
              <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">
                {rtc.conceitos.map((c) => <ConceitoRow key={c.id} conc={c} ctx={ctx} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AssuntoNode({ assunto, ctx }: { assunto: ConceitoArvore; ctx: TreeCtx }) {
  const ae = ctx.isExpanded("assunto", assunto.id);
  const count = countSelectedInAssunto(assunto, ctx.selected);
  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
      <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => ctx.toggle("assunto", assunto.id)}>
        <Chevron open={ae} />
        <span className="text-sm">{assunto.nome}</span>
        {count > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">{count}</Badge>}
      </button>
      {ae && assunto.relAssuntoTopico.map((rg) => {
        const re = ctx.isExpanded("relAssunto", assunto.id);
        return (
          <div key={rg.tipoRelacao}>
            <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => ctx.toggle("relAssunto", assunto.id)}>
              <Chevron open={re} size="size-3" />
              <Badge variant="outline" className="text-[10px] h-4 px-1">{rg.tipoRelacao}</Badge>
            </button>
            {re && (
              <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">
                {rg.topicos.map((topico) => <TopicoNode key={topico.id} topico={topico} ctx={ctx} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
