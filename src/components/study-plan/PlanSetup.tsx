"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2Icon, SaveIcon, TargetIcon, NetworkIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
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

interface SourceItem {
  id: string;
  titulo: string;
}

// Dois "mundos": preparar pra prova (ordem = o que mais cai + edital) ou dominar um
// assunto pelo grafo (ordem = a IA prioriza). O objetivo escolhe a ordem sozinho —
// o usuário não precisa entender "modo de roadmap".
type Objetivo = "prova" | "grafo";

// Ritmos em linguagem humana no lugar de "meta NOVOS/TEMPO".
const RITMOS: { label: string; desc: string; valor: number }[] = [
  { label: "Leve", desc: "5 conceitos novos/dia", valor: 5 },
  { label: "Médio", desc: "10 conceitos novos/dia", valor: 10 },
  { label: "Intenso", desc: "20 conceitos novos/dia", valor: 20 },
];

const iso = (d: string): string | null => (d ? new Date(d).toISOString() : null);
const fmtBR = (d: string): string =>
  new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const toggle = (ids: string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
// Ao editar, deduz o objetivo pela prioridade salva (prova/edital → prova; ai → grafo).
const inferObjetivo = (prioridade?: string): Objetivo => (prioridade && prioridade !== "ai" ? "prova" : "grafo");

// Assistente de 3 passos: Objetivo → Conteúdo → Ritmo. O objetivo determina a ordem
// (prioridade) automaticamente; a prova/edital vêm de dentro do grafo escolhido.
export function PlanSetup({ graphs, initial, onSaved, onCancel }: {
  graphs: GraphOption[];
  initial: StudyPlan | null;
  onSaved: (plan: StudyPlan) => void;
  onCancel?: () => void;
}) {
  const editing = initial !== null;
  const [step, setStep] = useState(1);
  const [objetivo, setObjetivo] = useState<Objetivo | null>(initial ? inferObjetivo(initial.prioridade) : null);
  const [grafoIds, setGrafoIds] = useState<string[]>(initial?.grafoIds ?? []);
  const [roadmapsByGraph, setRoadmapsByGraph] = useState<Record<string, RoadmapOption[]>>({});
  const [scope, setScope] = useState<PlanScope>({ hasProva: false, hasEdital: false });
  const [metaTipo, setMetaTipo] = useState<PlanMetaTipo>(initial?.metaTipo ?? "NOVOS");
  const [metaValor, setMetaValor] = useState(String(initial?.metaValor ?? 5));
  const [dataAlvo, setDataAlvo] = useState(initial?.dataAlvo?.slice(0, 10) ?? "");
  const [baralhos, setBaralhos] = useState<SourceItem[]>([]);
  const [provas, setProvas] = useState<SourceItem[]>([]);
  const [baralhoIds, setBaralhoIds] = useState<string[]>(initial?.baralhoIds ?? []);
  const [provaIds, setProvaIds] = useState<string[]>(initial?.provaIds ?? []);
  const [showExtras, setShowExtras] = useState((initial?.baralhoIds?.length ?? 0) + (initial?.provaIds?.length ?? 0) > 0);
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all(grafoIds.map((g) => getGraphRoadmaps(g).then((rs) => [g, rs] as const).catch(() => [g, []] as const)))
      .then((pairs) => { if (active) setRoadmapsByGraph(Object.fromEntries(pairs)); });
    return () => { active = false; };
  }, [grafoIds]);

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

  // A prova/edital pode vir do conteúdo (provaIds) OU de dentro dos grafos escolhidos.
  const provaAvailable = provaIds.length > 0 || scope.hasProva;
  // A ordem (prioridade) é DERIVADA do objetivo — sem seletor de "modo" para o usuário.
  const provaMode = scope.hasProva && scope.hasEdital ? "prova_edital" : scope.hasEdital ? "edital" : "prova";
  const prioridade = objetivo === "prova" ? provaMode : "ai";
  const totalConteudo = grafoIds.length + baralhoIds.length + provaIds.length;

  const graphsMissing = (modo: string): string[] =>
    grafoIds.filter((g) => !(roadmapsByGraph[g] ?? []).some((r) => r.modo === modo));

  // Gera o roadmap do modo escolhido para cada grafo do conteúdo que ainda não o tem.
  const ensureRoadmaps = async (): Promise<void> => {
    const missing = graphsMissing(prioridade);
    if (missing.length === 0) return;
    setGenerating(true);
    for (const g of missing) await buildRoadmap(g, prioridade);
    setGenerating(false);
  };

  const salvar = async (): Promise<void> => {
    const valor = Number(metaValor);
    if (!Number.isInteger(valor) || valor <= 0) { toast.error("O ritmo diário precisa ser maior que zero."); return; }
    if (totalConteudo === 0) { toast.error("Escolha ao menos um conteúdo."); return; }
    if (objetivo === "prova" && !provaAvailable) {
      toast.error("Nenhuma prova nos grafos escolhidos — marque uma prova ou escolha “Dominar um assunto”.");
      return;
    }
    setSaving(true);
    try {
      await ensureRoadmaps();
      const plan = await saveStudyPlan({
        id: initial?.id, grafoIds, prioridade, metaTipo, metaValor: valor,
        dataAlvo: iso(dataAlvo), baralhoIds, provaIds,
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

  const canNext = step === 1 ? objetivo !== null : step === 2 ? totalConteudo > 0 : true;
  const pickRitmo = (valor: number): void => { setMetaTipo("NOVOS"); setMetaValor(String(valor)); setCustom(false); };
  const activePreset = (v: number): boolean => !custom && metaTipo === "NOVOS" && Number(metaValor) === v;
  const resumo = planSummary(objetivo, scope, metaTipo, metaValor, dataAlvo);

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <Stepper step={step} onGo={setStep} />

      {step === 1 && (
        <Section title="O que você quer?">
          <div className="grid gap-3 sm:grid-cols-2">
            <ObjetivoCard
              icon={<TargetIcon className="size-5" />}
              title="Passar numa prova"
              desc="Estude focado no que mais cai e no que o edital cobra."
              on={objetivo === "prova"}
              onClick={() => setObjetivo("prova")}
            />
            <ObjetivoCard
              icon={<NetworkIcon className="size-5" />}
              title="Dominar um assunto"
              desc="Aprenda todo o grafo, na ordem que a IA prioriza."
              on={objetivo === "grafo"}
              onClick={() => setObjetivo("grafo")}
            />
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section title={objetivo === "prova" ? "Qual grafo tem a sua prova?" : "Qual assunto você quer dominar?"}>
          <SourceToggles
            label="Grafos"
            items={graphs.map((g) => ({ id: g.id, titulo: g.nome }))}
            selected={grafoIds}
            onToggle={(id) => setGrafoIds((v) => toggle(v, id))}
          />
          {objetivo === "prova" && grafoIds.length > 0 && !provaAvailable && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esses grafos não têm prova. Escolha um com prova, ou marque uma prova avulsa abaixo.
            </p>
          )}
          <button type="button" onClick={() => setShowExtras((v) => !v)} className="text-xs text-primary hover:underline">
            {showExtras ? "− Ocultar" : "+ Incluir baralhos ou provas avulsas (opcional)"}
          </button>
          {showExtras && (
            <div className="space-y-2 rounded-lg border bg-background/50 p-3">
              <SourceToggles label="Baralhos" items={baralhos} selected={baralhoIds} onToggle={(id) => setBaralhoIds((v) => toggle(v, id))} />
              <SourceToggles label="Provas" items={provas} selected={provaIds} onToggle={(id) => setProvaIds((v) => toggle(v, id))} />
            </div>
          )}
        </Section>
      )}

      {step === 3 && (
        <Section title="Seu ritmo">
          <div className="grid gap-2 sm:grid-cols-3">
            {RITMOS.map((r) => (
              <ChoiceCard key={r.label} title={r.label} desc={r.desc} on={activePreset(r.valor)} onClick={() => pickRitmo(r.valor)} />
            ))}
          </div>
          <button type="button" onClick={() => setCustom((v) => !v)} className="text-xs text-primary hover:underline">
            {custom ? "− Usar um ritmo pronto" : "+ Personalizar (minutos ou nº exato)"}
          </button>
          {custom && <CustomRitmo metaTipo={metaTipo} metaValor={metaValor} onTipo={setMetaTipo} onValor={setMetaValor} />}

          <div className="space-y-1">
            <label htmlFor="alvo" className="text-xs font-medium text-muted-foreground">Tem uma data? (opcional)</label>
            <input
              id="alvo" type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)}
              className="block rounded-lg border bg-background p-2 text-sm outline-none focus:border-primary/60"
            />
          </div>

          <p className="rounded-lg bg-primary/5 p-3 text-sm text-foreground">{resumo}</p>
        </Section>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="gap-1">
              <ChevronLeftIcon className="size-4" /> Voltar
            </Button>
          )}
          {onCancel && step === 1 && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}
        </div>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext} className="gap-1">
            Próximo <ChevronRightIcon className="size-4" />
          </Button>
        ) : (
          <Button onClick={salvar} disabled={saving} className="gap-2">
            {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
            {generating ? "Gerando roadmap…" : editing ? "Salvar alterações" : "Criar plano"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Frase-resumo do plano em linguagem de gente (nada de jargão).
function planSummary(
  objetivo: Objetivo | null,
  scope: PlanScope,
  metaTipo: PlanMetaTipo,
  metaValor: string,
  dataAlvo: string,
): string {
  const ritmo = metaTipo === "NOVOS" ? `~${metaValor} conceitos novos/dia` : `~${metaValor} min/dia`;
  const foco =
    objetivo === "prova"
      ? `focando no que mais cai na prova${scope.hasEdital ? " e no edital" : ""}`
      : "na ordem que a IA prioriza";
  const prazo = dataAlvo ? ` Meta: até ${fmtBR(dataAlvo)}.` : " Sem prazo — só completar tudo.";
  return `Você vai estudar ${ritmo}, ${foco}.${prazo}`;
}

function Stepper({ step, onGo }: { step: number; onGo: (s: number) => void }) {
  const labels = ["Objetivo", "Conteúdo", "Ritmo"];
  return (
    <div className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = i + 1;
        const on = n === step;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onGo(n)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${
              on ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`flex size-4 items-center justify-center rounded-full text-[10px] ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{n}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function ObjetivoCard({ icon, title, desc, on, onClick }: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors ${on ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
    >
      <span className={`flex size-9 items-center justify-center rounded-lg ${on ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{icon}</span>
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}

function ChoiceCard({ title, desc, on, onClick }: { title: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${on ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}

function CustomRitmo({ metaTipo, metaValor, onTipo, onValor }: {
  metaTipo: PlanMetaTipo;
  metaValor: string;
  onTipo: (t: PlanMetaTipo) => void;
  onValor: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/50 p-3">
      <div className="flex overflow-hidden rounded-lg border">
        {(["NOVOS", "TEMPO"] as PlanMetaTipo[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTipo(t)}
            className={`px-3 py-2 text-sm transition-colors ${metaTipo === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {t === "NOVOS" ? "Nº de novos" : "Minutos"}
          </button>
        ))}
      </div>
      <input
        type="number" min={1} value={metaValor} onChange={(e) => onValor(e.target.value)}
        className="w-24 rounded-lg border bg-background p-2 text-sm outline-none focus:border-primary/60"
      />
      <span className="text-sm text-muted-foreground">{metaTipo === "NOVOS" ? "conceitos/dia" : "min/dia"}</span>
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
