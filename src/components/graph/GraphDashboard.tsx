"use client";

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import { XIcon, NetworkIcon, ZapIcon, LinkIcon, AlertCircleIcon, HeartPulseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeGraphMetrics } from "@/lib/graph-metrics";
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

export function GraphDashboard({ open, onClose, nodes, edges }: {
  open: boolean;
  onClose: () => void;
  nodes: SimNode[];
  edges: GraphEdgeType[];
}) {
  const m = useMemo(() => computeGraphMetrics(nodes, edges), [nodes, edges]);

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
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <NetworkIcon className="size-4 text-primary" />
          <span className="font-semibold text-sm">Analytics do Grafo</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-sm">

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

        {/* ── Hubs (centralidade de grau) ── */}
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
                  <Cell key={i} fill={
                    h.group === "ASSUNTO" ? "#4338ca" : h.group === "TOPICO" ? "#0369a1" :
                    h.group === "CONCEITO" ? "#059669" : h.group === "NOTA" ? "#9333ea" :
                    h.group === "FLASHCARD" ? "#eab308" : "#475569"
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

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

        {/* ── Maestria por tipo (radar) ── */}
        {m.dominioByType.length >= 3 && (
          <div className={SECTION}>
            <p className={SECTION_TITLE}>Maestria média por tipo (%)</p>
            <p className="text-[11px] text-muted-foreground mb-2">Identifica lacunas de aprendizado por categoria.</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={m.dominioByType} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
                <PolarGrid stroke="hsl(var(--border))" />
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
                <PolarGrid stroke="hsl(var(--border))" />
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
              {/* quadrant labels */}
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

        <div className="h-4" />
      </div>
    </div>
  );
}
