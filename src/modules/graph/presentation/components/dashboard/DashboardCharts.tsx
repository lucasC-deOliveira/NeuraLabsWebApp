import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { NetworkIcon, ZapIcon, LinkIcon, AlertCircleIcon, HeartPulseIcon, FilterIcon } from "lucide-react";
import type { ComponentType } from "react";
import { computeGraphMetrics, TYPE_COLORS } from "@/lib/graph-metrics";

export type GraphMetrics = ReturnType<typeof computeGraphMetrics>;

const SECTION = "mt-5 first:mt-0";
const SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2";

interface ScatterPoint { label: string; group: string; dominio: number; prioridade: number; color: string }
interface TooltipEntry<T> { value: number | string; name?: string; payload: T }
interface ChartTooltip<T> { active?: boolean; payload?: TooltipEntry<T>[]; label?: string }

function KpiCard({ label, value, sub, icon: Icon, color = "text-foreground" }: {
  label: string; value: string | number; sub?: string;
  icon: ComponentType<{ className?: string }>; color?: string;
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

function CustomDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { color?: string } }) {
  return <circle cx={cx} cy={cy} r={4} fill={payload?.color} fillOpacity={0.8} stroke="none" />;
}

function CustomTooltipScatter({ active, payload }: ChartTooltip<ScatterPoint>) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-[11px] shadow-md">
      <p className="font-medium">{d.label}</p>
      <p className="text-muted-foreground">{d.group} · Domínio {d.dominio}% · Prioridade {d.prioridade}</p>
    </div>
  );
}

function CustomTooltipBar({ active, payload, label }: ChartTooltip<unknown>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-[11px] shadow-md">
      <p className="font-medium">{label}</p>
      <p>{payload[0].value} {payload[0].name === "count" ? "nós" : ""}</p>
    </div>
  );
}

function CustomTooltipPie({ active, payload }: ChartTooltip<{ pct: number }>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1.5 text-[11px] shadow-md">
      <p className="font-medium">{payload[0].name}</p>
      <p>{payload[0].value} nós ({payload[0].payload.pct}%)</p>
    </div>
  );
}

function KpiRow({ m }: { m: GraphMetrics }) {
  const healthColor = m.healthScore >= 70 ? "text-green-500" : m.healthScore >= 40 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex gap-2 flex-wrap">
      <KpiCard label="Nós" value={m.totalNodes} icon={NetworkIcon} />
      <KpiCard label="Relações" value={m.totalEdges} icon={LinkIcon} />
      <KpiCard label="Grau médio" value={m.avgDegree} sub={`${m.densityPct}% denso`} icon={ZapIcon} />
      <KpiCard label="Isolados" value={m.isolatedCount} icon={AlertCircleIcon} color={m.isolatedCount > 0 ? "text-amber-500" : "text-foreground"} />
      <KpiCard label="Saúde" value={`${m.healthScore}`} sub="score 0-100" icon={HeartPulseIcon} color={healthColor} />
    </div>
  );
}

function CompositionChart({ m }: { m: GraphMetrics }) {
  const pieData = m.nodesByType.map((t) => ({
    name: t.label,
    value: t.count,
    fill: t.color,
    pct: m.totalNodes > 0 ? Math.round((t.count / m.totalNodes) * 100) : 0,
  }));
  return (
    <div className={SECTION}>
      <p className={SECTION_TITLE}>Composição por tipo</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="40%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Pie>
          <Tooltip content={<CustomTooltipPie />} />
          <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={8}
            formatter={(v) => <span className="text-[11px]">{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function HubsChart({ m }: { m: GraphMetrics }) {
  if (m.topHubs.length === 0) return null;
  return (
    <div className={SECTION}>
      <p className={SECTION_TITLE}>Hubs — Centralidade de grau</p>
      <p className="text-[11px] text-muted-foreground mb-2">Nós com mais conexões determinam o fluxo de conhecimento.</p>
      <ResponsiveContainer width="100%" height={Math.max(m.topHubs.length * 28, 80)}>
        <BarChart data={m.topHubs} layout="vertical" margin={{ left: 8, right: 24, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={(v) => (v.length > 16 ? v.slice(0, 16) + "…" : v)} />
          <Tooltip content={<CustomTooltipBar />} cursor={{ fill: "hsl(var(--accent))" }} />
          <Bar dataKey="degree" radius={[0, 4, 4, 0]} name="count">
            {m.topHubs.map((h, i) => <Cell key={i} fill={TYPE_COLORS[h.group] ?? "#888"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DegreeHistogram({ m }: { m: GraphMetrics }) {
  return (
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
  );
}

function EdgeTypesChart({ m }: { m: GraphMetrics }) {
  if (m.edgesByType.length === 0) return null;
  return (
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
  );
}

function MasteryRadar({ m }: { m: GraphMetrics }) {
  if (m.dominioByType.length < 3) return null;
  return (
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
  );
}

function MasteryConnectivityRadar({ m }: { m: GraphMetrics }) {
  if (m.radarData.length < 3) return null;
  return (
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
  );
}

function KnowledgeGapMatrix({ m }: { m: GraphMetrics }) {
  if (m.scatter.length === 0) return null;
  return (
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
  );
}

function OrphansList({ m }: { m: GraphMetrics }) {
  if (m.orphans.length === 0) return null;
  return (
    <div className={SECTION}>
      <p className={SECTION_TITLE}>Nós sem conexões ({m.orphans.length})</p>
      <div className="space-y-1">
        {m.orphans.slice(0, 8).map((n) => (
          <div key={n.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">{n.label}</span>
            <span className="ml-auto shrink-0 opacity-60">{n.group}</span>
          </div>
        ))}
        {m.orphans.length > 8 && <p className="text-[10px] text-muted-foreground">+{m.orphans.length - 8} mais</p>}
      </div>
    </div>
  );
}

export function DashboardCharts({ m }: { m: GraphMetrics }) {
  if (m.totalNodes === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
        <FilterIcon className="size-6 opacity-30" />
        <p className="text-[12px]">Nenhum nó corresponde aos filtros</p>
      </div>
    );
  }
  return (
    <>
      <KpiRow m={m} />
      <CompositionChart m={m} />
      <HubsChart m={m} />
      <DegreeHistogram m={m} />
      <EdgeTypesChart m={m} />
      <MasteryRadar m={m} />
      <MasteryConnectivityRadar m={m} />
      <KnowledgeGapMatrix m={m} />
      <OrphansList m={m} />
    </>
  );
}
