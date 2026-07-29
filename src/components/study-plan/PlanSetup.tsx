"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveStudyPlan,
  getGraphRoadmaps,
  getPlanScope,
  buildRoadmap,
  type PlanMetaTipo,
  type PlanScope,
  type RoadmapOption,
  type StudyPlan,
} from "@/lib/study-plan-api";
import { getBaralhos } from "@/lib/baralhos-api";
import { listProvas } from "@/lib/provas-api";

interface GraphOption {
  id: string;
  nome: string;
}

// Critérios de prioridade = modos do roadmap = a ORDEM de estudo. O plano gera o
// roadmap de cada grafo do conteúdo sob demanda.
const CRITERIA: { modo: string; label: string; hint: string }[] = [
  { modo: "prova", label: "O que mais cai na prova", hint: "Ordena pela frequência dos conceitos em provas." },
  { modo: "edital", label: "Ênfase do edital", hint: "Ordena pelo peso que o edital dá a cada tópico." },
  { modo: "prova_edital", label: "Prova + edital", hint: "Combina a frequência em prova e a ênfase do edital." },
  { modo: "ai", label: "Prioridade da IA", hint: "A IA ordena por pré-requisitos e relevância." },
];

interface SourceItem {
  id: string;
  titulo: string;
}

const iso = (d: string): string | null => (d ? new Date(d).toISOString() : null);
const toggle = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

// Config do plano: CONTEÚDO = grafos + baralhos + provas (o objetivo é aprender tudo);
// a prioridade é só a ORDEM; meta diária; data-alvo.
export function PlanSetup({ graphs, initial, onSaved, onCancel }: {
  graphs: GraphOption[];
  initial: StudyPlan | null;
  onSaved: (plan: StudyPlan) => void;
  onCancel?: () => void;
}) {
  const editing = initial !== null;
  const [grafoIds, setGrafoIds] = useState<string[]>(initial?.grafoIds ?? []);
  // Roadmaps já gerados por grafo, para saber o que precisa ser gerado ao salvar.
  const [roadmapsByGraph, setRoadmapsByGraph] = useState<Record<string, RoadmapOption[]>>({});
  // Os grafos escolhidos contêm prova/edital? Libera os modos prova/edital.
  const [scope, setScope] = useState<PlanScope>({ hasProva: false, hasEdital: false });
  // Sem prova no plano, o critério padrão não pode depender de prova → IA.
  const [prioridade, setPrioridade] = useState(
    initial?.prioridade ?? (initial?.provaIds?.length ? "prova" : "ai"),
  );
  const [generating, setGenerating] = useState(false);
  const [metaTipo, setMetaTipo] = useState<PlanMetaTipo>(initial?.metaTipo ?? "NOVOS");
  const [metaValor, setMetaValor] = useState(String(initial?.metaValor ?? 5));
  const [dataAlvo, setDataAlvo] = useState(initial?.dataAlvo?.slice(0, 10) ?? "");
  const [baralhos, setBaralhos] = useState<SourceItem[]>([]);
  const [provas, setProvas] = useState<SourceItem[]>([]);
  const [baralhoIds, setBaralhoIds] = useState<string[]>(initial?.baralhoIds ?? []);
  const [provaIds, setProvaIds] = useState<string[]>(initial?.provaIds ?? []);
  const [saving, setSaving] = useState(false);

  // Busca os roadmaps de cada grafo escolhido (para saber quais faltam gerar).
  useEffect(() => {
    let active = true;
    Promise.all(grafoIds.map((g) => getGraphRoadmaps(g).then((rs) => [g, rs] as const).catch(() => [g, []] as const)))
      .then((pairs) => { if (active) setRoadmapsByGraph(Object.fromEntries(pairs)); });
    return () => { active = false; };
  }, [grafoIds]);

  // Descobre se os grafos escolhidos têm prova/edital dentro (libera esses modos).
  useEffect(() => {
    let active = true;
    getPlanScope(grafoIds)
      .then((s) => { if (active) setScope(s); })
      .catch(() => { if (active) setScope({ hasProva: false, hasEdital: false }); });
    return () => { active = false; };
  }, [grafoIds]);

  useEffect(() => {
    let active = true;
    Promise.all([getBaralhos(), listProvas()])
      .then(([bs, ps]) => {
        if (!active) return;
        setBaralhos(bs.map((b) => ({ id: b.id, titulo: b.titulo })));
        setProvas(ps.map((p) => ({ id: p.id, titulo: p.titulo })));
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Grafos escolhidos que ainda não têm o roadmap do modo → precisam gerar ao salvar.
  const graphsMissing = (modo: string): string[] =>
    grafoIds.filter((g) => !(roadmapsByGraph[g] ?? []).some((r) => r.modo === modo));

  // A prova/edital pode vir do conteúdo (provaIds) OU de dentro dos grafos escolhidos.
  const provaAvailable = provaIds.length > 0 || scope.hasProva;
  const editalAvailable = provaIds.length > 0 || scope.hasEdital;
  // Modo bloqueado se falta a fonte que ele precisa (só a IA nunca depende de prova).
  const modeLocked = (modo: string): boolean => {
    if (modo === "ai") return false;
    if (modo === "prova") return !provaAvailable;
    if (modo === "edital") return !editalAvailable;
    return !(provaAvailable && editalAvailable); // prova_edital
  };
  const lockedHint = (modo: string): string =>
    modo === "edital"
      ? "Requer edital no conteúdo ou no grafo"
      : modo === "prova_edital"
        ? "Requer prova e edital no conteúdo ou no grafo"
        : "Requer prova no conteúdo ou no grafo";

  // Se o modo escolhido deixou de estar disponível (tirou a prova/grafo), volta pra IA.
  useEffect(() => {
    if (prioridade !== "ai" && modeLocked(prioridade)) setPrioridade("ai");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, provaIds, grafoIds]);

  const salvar = async (): Promise<void> => {
    const valor = Number(metaValor);
    if (!Number.isInteger(valor) || valor <= 0) { toast.error("A meta diária precisa ser maior que zero."); return; }
    if (grafoIds.length + baralhoIds.length + provaIds.length === 0) {
      toast.error("Escolha ao menos um conteúdo (grafo, baralho ou prova).");
      return;
    }
    setSaving(true);
    try {
      await ensureRoadmaps();
      const plan = await saveStudyPlan({
        id: initial?.id,
        grafoIds,
        prioridade,
        metaTipo,
        metaValor: valor,
        dataAlvo: iso(dataAlvo),
        baralhoIds,
        provaIds,
        conceitosExcluidos: initial?.conceitosExcluidos ?? [],
      });
      toast.success("Plano salvo!");
      onSaved(plan);
    } catch {
      toast.error("Não foi possível salvar o plano.");
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  // Gera o roadmap do modo escolhido para cada grafo do conteúdo que ainda não o tem.
  const ensureRoadmaps = async (): Promise<void> => {
    const missing = graphsMissing(prioridade);
    if (missing.length === 0) return;
    setGenerating(true);
    for (const g of missing) await buildRoadmap(g, prioridade);
    setGenerating(false);
  };

  // O efeito acima repõe a prioridade em IA se o modo ficar indisponível.
  const toggleProva = (id: string): void => setProvaIds((v) => toggle(v, id));

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <Field label="Conteúdo (o objetivo é aprender tudo isto)">
        <p className="-mt-1 mb-1 text-xs text-muted-foreground">
          Escolha grafos, baralhos e provas para estudar. O plano cobre todo o conteúdo marcado.
        </p>
        <SourceToggles
          label="Grafos"
          items={graphs.map((g) => ({ id: g.id, titulo: g.nome }))}
          selected={grafoIds}
          onToggle={(id) => setGrafoIds((v) => toggle(v, id))}
        />
        <SourceToggles label="Baralhos" items={baralhos} selected={baralhoIds} onToggle={(id) => setBaralhoIds((v) => toggle(v, id))} />
        <SourceToggles label="Provas" items={provas} selected={provaIds} onToggle={toggleProva} />
      </Field>

      {grafoIds.length > 0 && (
        <Field label="Prioridade (a ordem de estudo dos grafos)">
          <div className="grid gap-2 sm:grid-cols-2">
            {CRITERIA.map((c) => {
              const locked = modeLocked(c.modo);
              const on = prioridade === c.modo;
              const missing = graphsMissing(c.modo).length;
              return (
                <button
                  key={c.modo}
                  type="button"
                  disabled={locked}
                  onClick={() => setPrioridade(c.modo)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
                >
                  <div className="font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.hint}</div>
                  {locked ? (
                    <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">{lockedHint(c.modo)}</div>
                  ) : missing > 0 ? (
                    <div className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
                      Gera o roadmap ao salvar{missing > 1 ? ` (${missing} grafos)` : ""}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Meta por dia">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border">
            {(["NOVOS", "TEMPO"] as PlanMetaTipo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMetaTipo(t)}
                className={`px-3 py-2 text-sm transition-colors ${metaTipo === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {t === "NOVOS" ? "Nº de novos" : "Minutos"}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            value={metaValor}
            onChange={(e) => setMetaValor(e.target.value)}
            className="w-24 rounded-lg border bg-background p-2 text-sm outline-none focus:border-primary/60"
          />
          <span className="text-sm text-muted-foreground">{metaTipo === "NOVOS" ? "conceitos/dia" : "min/dia"}</span>
        </div>
      </Field>

      <Field label="Data-alvo (opcional)">
        <input
          type="date"
          value={dataAlvo}
          onChange={(e) => setDataAlvo(e.target.value)}
          className="rounded-lg border bg-background p-2 text-sm outline-none focus:border-primary/60"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Sem data: só projeta o término. Com data: mostra se o seu ritmo a alcança.
        </p>
      </Field>

      <div className="flex items-center gap-2">
        <Button onClick={salvar} disabled={saving} className="gap-2">
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          {generating ? "Gerando roadmap…" : editing ? "Salvar alterações" : "Criar plano"}
        </Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

// Chips de seleção de fontes (grafos/baralhos/provas). Marcado = entra no plano.
function SourceToggles({ label, items, selected, onToggle }: {
  label: string;
  items: SourceItem[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => {
          const on = selected.includes(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onToggle(it.id)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {it.titulo}
            </button>
          );
        })}
      </div>
    </div>
  );
}
