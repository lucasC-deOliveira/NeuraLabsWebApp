"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { XIcon, NetworkIcon, ZapIcon, LinkIcon, AlertCircleIcon, HeartPulseIcon, FilterIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeGraphMetrics, TYPE_COLORS, TYPE_LABELS } from "@/lib/graph-metrics";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/lib/graph-api";

const SECTION = "mt-5 first:mt-0";
const SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2";

function KpiCard({ label, value, sub, icon: Icon, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border bg-card px-3 py-2 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-[10px] uppercase tracking-wide truncate">{label}</span>
      </div>
      <span className={`text-xl font-bold leading-tight ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  return <circle cx={cx} cy={cy} r={4} fill={payload.color} fillOpacity={0.8} stroke="none" />;
};

const CustomTooltipScatter = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-[11px] shadow-md">
      <p className="font-medium">{d.label}</p>
      <p className="text-muted-foreground">{d.group} · Domínio {d.dominio}% · Prioridade {d.prioridade}</p>
    </div>
  );
};

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-[11px] shadow-md">
      <p className="font-medium">{label}</p>
      <p>{payload[0].value} {payload[0].name === "count" ? "nós" : ""}</p>
    </div>
  );
};

const CustomTooltipPie = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-[11px] shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p>{payload[0].value} nós ({payload[0].payload.pct}%)</p>
    </div>
  );
};

const DEGREE_OPTIONS = [0, 1, 2, 3, 5, 8];

// Constantes estáveis para evitar re-renders e re-cálculos quando o painel está fechado.
// filteredData e allTypes retornam estas refs — downstream memos não re-executam.
const EMPTY_DATA = { nodes: [] as SimNode[], edges: [] as GraphEdgeType[] };
const EMPTY_TYPES: string[] = [];

export function GraphDashboard({ open, onClose, nodes, edges, onFilteredIdsChange }: {
  open: boolean;
  onClose: () => void;
  nodes: SimNode[];
  edges: GraphEdgeType[];
  onFilteredIdsChange?: (ids: Set<string> | null) => void;
}) {
  /* ── Filter state ── */
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [minDominio, setMinDominio] = useState(0);
  const [maxDominio, setMaxDominio] = useState(100);
  const [minDegree, setMinDegree] = useState(0);
  const [search, setSearch] = useState("");

  const allTypes = useMemo(
    () => open ? [...new Set(nodes.map(n => n.group))].sort() : EMPTY_TYPES,
    [open, nodes],
  );

  useEffect(() => {
    if (!open) {
      setActiveTypes(new Set());
      setMinDominio(0);
      setMaxDominio(100);
      setMinDegree(0);
      setSearch("");
    }
  }, [open]);

  const toggleType = (type: string) =>
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });

  const hasFilters =
    activeTypes.size > 0 || minDominio > 0 || maxDominio < 100 || minDegree > 0 || search.trim() !== "";

  const clearFilters = () => {
    setActiveTypes(new Set());
    setMinDominio(0);
    setMaxDominio(100);
    setMinDegree(0);
    setSearch("");
  };

  /* ── Apply filters ── */
  // Quando fechado: retorna EMPTY_DATA (ref estável) → m não re-executa → zero
  // charts re-render a cada frame de física. Quando aberto: filtra normalmente.
  const filteredData = useMemo(() => {
    if (!open) return EMPTY_DATA;
    let ns: SimNode[] = nodes;
    if (activeTypes.size > 0) ns = ns.filter(n => activeTypes.has(n.group));
    ns = ns.filter(n => {
      const d = Math.round(n.dominio * 100);
      return d >= minDominio && d <= maxDominio;
    });
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      ns = ns.filter(n => n.label.toLowerCase().includes(q));
    }
    const nodeSet = new Set(ns.map(n => n.id));
    let es = edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target));
    if (minDegree > 0) {
      const degMap = new Map<string, number>(ns.map(n => [n.id, 0]));
      for (const e of es) {
        degMap.set(e.source, (degMap.get(e.source) ?? 0) + 1);
        degMap.set(e.target, (degMap.get(e.target) ?? 0) + 1);
      }
      ns = ns.filter(n => (degMap.get(n.id) ?? 0) >= minDegree);
      const ns2 = new Set(ns.map(n => n.id));
      es = es.filter(e => ns2.has(e.source) && ns2.has(e.target));
    }
    return { nodes: ns, edges: es };
  }, [open, nodes, edges, activeTypes, minDominio, maxDominio, minDegree, search]);

  useEffect(() => {
    if (!onFilteredIdsChange) return;
    onFilteredIdsChange(hasFilters ? new Set(filteredData.nodes.map(n => n.id)) : null);
  }, [filteredData, hasFilters, onFilteredIdsChange]);

  const m = useMemo(
    () => computeGraphMetrics(filteredData.nodes, filteredData.edges),
    [filteredData],
  );

  const pieData = useMemo(() => m.nodesByType.map(t => ({
    name: t.label,
    value: t.count,
    fill: t.color,
    pct: m.totalNodes > 0 ? Math.round(t.count / m.totalNodes * 100) : 0,
  })), [m]);

  const healthColor = m.healthScore >= 70 ? "text-green-500" : m.healthScore >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[440px] z-30 flex flex-col bg-background border-l shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <NetworkIcon className="size-4 text-primary" />
          <span className="font-semibold text-sm">Analytics do Grafo</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="border-b px-4 py-3 space-y-2.5 shrink-0">
        {/* title + clear */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FilterIcon className="size-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros</span>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-primary hover:underline leading-none"
            >
              Limpar tudo
            </button>
          )}
        </div>

        {/* type chips */}
        {allTypes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTypes.map(type => {
              const selected = activeTypes.has(type);
              const allActive = activeTypes.size === 0;
              const shown = allActive || selected;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
                  style={shown
                    ? { backgroundColor: TYPE_COLORS[type] ?? "#888", borderColor: "transparent", color: "#fff", opacity: 1 }
                    : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))", opacity: 0.6 }
                  }
                >
                  {TYPE_LABELS[type] ?? type}
                </button>
              );
            })}
          </div>
        )}

        {/* search + min degree */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="buscar nó..."
              className="pl-6 h-7 text-[11px]"
            />
          </div>
          <select
            value={minDegree}
            onChange={e => setMinDegree(+e.target.value)}
            className="h-7 text-[11px] px-1.5 rounded-md border border-input bg-background text-foreground cursor-pointer"
          >
            {DEGREE_OPTIONS.map(d => (
              <option key={d} value={d}>Grau ≥ {d}</option>
            ))}
          </select>
        </div>

        {/* mastery range sliders */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-medium">Maestria</p>
          <div className="grid grid-cols-[36px_1fr_34px] items-center gap-2">
            <span className="text-[10px] text-muted-foreground text-right">Mín</span>
            <input
              type="range" min={0} max={100} step={5} value={minDominio}
              onChange={e => setMinDominio(Math.min(+e.target.value, maxDominio - 5))}
              className="w-full accent-primary h-1"
            />
            <span className="text-[10px] font-medium tabular-nums">{minDominio}%</span>
          </div>
          <div className="grid grid-cols-[36px_1fr_34px] items-center gap-2">
            <span className="text-[10px] text-muted-foreground text-right">Máx</span>
            <input
              type="range" min={0} max={100} step={5} value={maxDominio}
              onChange={e => setMaxDominio(Math.max(+e.target.value, minDominio + 5))}
              className="w-full accent-primary h-1"
            />
            <span className="text-[10px] font-medium tabular-nums">{maxDominio}%</span>
          </div>
        </div>

        {/* filter result summary */}
        {hasFilters && (
          <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
            <span className="size-1.5 rounded-full bg-primary shrink-0 inline-block" />
            {filteredData.nodes.length} nós · {filteredData.edges.length} relações
            <span className="text-muted-foreground font-normal ml-0.5">
              (de {nodes.length} · {edges.length})
            </span>
          </div>
        )}
      </div>

      {/* ── Charts body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-sm">

        {m.totalNodes === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <FilterIcon className="size-6 opacity-30" />
            <p className="text-[12px]">Nenhum nó corresponde aos filtros</p>
          </div>
        ) : (
          <>
            {/* ── KPIs ── */}
            <div className="flex gap-2 flex-wrap">
              <KpiCard label="Nós" value={m.totalNodes} icon={NetworkIcon} />
              <KpiCard label="Relações" value={m.totalEdges} icon={LinkIcon} />
              <KpiCard label="Grau médio" value={m.avgDegree} sub={`${m.densityPct}% denso`} icon={ZapIcon} />
              <KpiCard label="Isolados" value={m.isolatedCount} icon={AlertCircleIcon} color={m.isolatedCount > 0 ? "text-amber-500" : "text-foreground"} />
              <KpiCard label="Saúde" value={`${m.healthScore}`} sub="score 0-100" icon={HeartPulseIcon} color={healthColor} />
            </div>

            {/* ── Composição ── */}
            <div className={SECTION}>
              <p className={SECTION_TITLE}>Composição por tipo</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="40%" cy="50%"
                    innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltipPie />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
                    formatter={(v) => <span className="text-[11px]">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* ── Hubs ── */}
            {m.topHubs.length > 0 && (
              <div className={SECTION}>
                <p className={SECTION_TITLE}>Hubs — Centralidade de grau</p>
                <p className="text-[11px] text-muted-foreground mb-2">Nós com mais conexões determinam o fluxo de conhecimento.</p>
                <ResponsiveContainer width="100%" height={Math.max(m.topHubs.length * 28, 80)}>
                  <BarChart data={m.topHubs} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={v => v.length > 16 ? v.slice(0, 16) + "…" : v} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "hsl(var(--accent))" }} />
                    <Bar dataKey="degree" radius={[0, 4, 4, 0]} name="count">
                      {m.topHubs.map((h, i) => (
                        <Cell key={i} fill={TYPE_COLORS[h.group] ?? "#888"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Distribuição de grau ── */}
            <div className={SECTION}>
              <p className={SECTION_TITLE}>Distribuição de grau</p>
              <p className="text-[11px] text-muted-foreground mb-2">Redes de conhecimento saudáveis seguem lei de potência: poucos hubs, muitos nós folha.</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={m.degreeHistogram} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "conexões", position: "insideBottomRight", offset: -4, fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "hsl(var(--accent))" }} />
                  <Bar dataKey="count" name="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Tipos de relação ── */}
            {m.edgesByType.length > 0 && (
              <div className={SECTION}>
                <p className={SECTION_TITLE}>Tipos de relação (top 10)</p>
                <ResponsiveContainer width="100%" height={Math.max(m.edgesByType.length * 24, 60)}>
                  <BarChart data={m.edgesByType} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "hsl(var(--accent))" }} />
                    <Bar dataKey="count" name="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Maestria por tipo (radar) ── */}
            {m.dominioByType.length >= 3 && (
              <div className={SECTION}>
                <p className={SECTION_TITLE}>Maestria média por tipo (%)</p>
                <p className="text-[11px] text-muted-foreground mb-2">Identifica lacunas de aprendizado por categoria.</p>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={m.dominioByType} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                    <PolarGrid gridType="polygon" stroke="#94a3b8" strokeOpacity={0.4} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <Radar name="Domínio" dataKey="dominio" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                    <Tooltip formatter={(v) => [`${v}%`, "Domínio"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Radar: Maestria × Conectividade ── */}
            {m.radarData.length >= 3 && (
              <div className={SECTION}>
                <p className={SECTION_TITLE}>Maestria × Conectividade por tipo</p>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Tipos com alta conectividade mas baixa maestria são pontos críticos de revisão.
                </p>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={m.radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid gridType="polygon" stroke="#94a3b8" strokeOpacity={0.4} />
                    <PolarAngleAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <Radar name="Maestria (%)" dataKey="maestria" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Radar name="Conectividade (%)" dataKey="conectividade" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                    <Legend iconSize={8} formatter={(v) => <span className="text-[11px]">{v}</span>} />
                    <Tooltip formatter={(v, name) => [`${v}%`, name]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Knowledge Gap Matrix ── */}
            {m.scatter.length > 0 && (
              <div className={SECTION}>
                <p className={SECTION_TITLE}>Knowledge Gap Matrix</p>
                <p className="text-[11px] text-muted-foreground mb-2">
                  Quadrante superior-esquerdo = alta prioridade, baixo domínio → estudar primeiro.
                </p>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" dataKey="dominio" domain={[0, 100]} name="Domínio"
                        label={{ value: "Domínio (%)", position: "insideBottom", offset: -12, fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis type="number" dataKey="prioridade" domain={[0, 10]} name="Prioridade"
                        label={{ value: "Prioridade", angle: -90, position: "insideLeft", offset: 8, fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <ZAxis range={[28, 28]} />
                      <Tooltip content={<CustomTooltipScatter />} cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter data={m.scatter} shape={<CustomDot />} />
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div className="absolute top-2 left-5 text-[9px] text-amber-500 font-medium pointer-events-none">⚠ estudar</div>
                  <div className="absolute top-2 right-4 text-[9px] text-green-500 font-medium pointer-events-none">✓ dominado</div>
                </div>
              </div>
            )}

            {/* ── Nós isolados ── */}
            {m.orphans.length > 0 && (
              <div className={SECTION}>
                <p className={SECTION_TITLE}>Nós sem conexões ({m.orphans.length})</p>
                <div className="space-y-1">
                  {m.orphans.slice(0, 8).map(n => (
                    <div key={n.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">{n.label}</span>
                      <span className="ml-auto shrink-0 opacity-60">{n.group}</span>
                    </div>
                  ))}
                  {m.orphans.length > 8 && <p className="text-[10px] text-muted-foreground">+{m.orphans.length - 8} mais</p>}
                </div>
              </div>
            )}
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
