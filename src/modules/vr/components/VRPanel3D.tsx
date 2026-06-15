"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { NODE_TYPE_COLORS, RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import { getNodeDetails } from "@/lib/graph-api";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { readAllVaultNodes, graphVaultDir } from "@/lib/vault-sync";
import { readSrsLog } from "@/lib/srs-local";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";
import {
  dominioColor, prioridadeColor, formatDate,
  TIPO_NOTA_LABELS, SUBTIPO_LABELS, buildNotaLines, panelHeight,
} from "@/modules/vr/vr-panel.helpers";

const W  = 0.60;
const PX = 0.022;
const PANEL_POS: [number, number, number] = [0.32, 1.50, -0.88];

function Sep({ y, isDark }: { y: number; isDark: boolean }) {
  return (
    <mesh position={[0, y, 0.002]}>
      <planeGeometry args={[W - PX * 2, 0.0015]} />
      <meshBasicMaterial color={isDark ? "#3f3f46" : "#d4d4d8"} />
    </mesh>
  );
}

interface DeckStats { total: number; novos: number; paraRevisar: number }
type NotaMeta = Record<string, string | null>;

interface VRPanel3DProps {
  node: SimNode;
  nodes: SimNode[];
  edges: SimEdge[];
  isDark: boolean;
  grafoId: string;
  grafoNome: string;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function VRPanel3D({ node, nodes, edges, isDark, grafoId, grafoNome, onClose, onSelectNode }: VRPanel3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion);
  });

  // ── Dados assíncronos ────────────────────────────────────────────────────────
  const [deckStats, setDeckStats]   = useState<DeckStats | null>(null);
  const [notaMeta,  setNotaMeta]    = useState<NotaMeta | null>(null);

  useEffect(() => {
    setDeckStats(null);
    setNotaMeta(null);

    if (node.tipoReal === "NOTA") {
      getNodeDetails("NOTA", node.id)
        .then(setNotaMeta)
        .catch(() => setNotaMeta(null));
    }

    if (node.tipoReal === "BARALHO") {
      let cancelled = false;
      async function loadDeck() {
        const vaultNodes = await readAllVaultNodes(grafoId, grafoNome);
        const nodeById   = new Map(vaultNodes.map((n) => [n.id, n]));
        const baralho    = nodeById.get(node.id);
        if (!baralho) return;
        const fcIds = baralho.relacoes
          .filter((r) => r.rel === "CONTEM")
          .map((r) => r.alvo)
          .filter((id) => { const n = nodeById.get(id); return n && n.tipo === "FLASHCARD"; });
        let novos = fcIds.length, paraRevisar = 0;
        if (isDesktop()) {
          const vaultDir = await desktop.vault.getPath().catch(() => null);
          if (vaultDir) {
            const srsLog = await readSrsLog(graphVaultDir(vaultDir, grafoId, grafoNome));
            const now    = new Date();
            novos = 0;
            for (const id of fcIds) {
              const s = srsLog.schedule[id];
              if (!s) novos++;
              else if (new Date(s.proximaRevisao) <= now) paraRevisar++;
            }
          }
        }
        if (!cancelled) setDeckStats({ total: fcIds.length, novos, paraRevisar });
      }
      loadDeck().catch(() => {});
      return () => { cancelled = true; };
    }
  }, [node.id, node.tipoReal, grafoId, grafoNome]);

  // ── Paleta de cores ──────────────────────────────────────────────────────────
  const e       = NODE_TYPE_COLORS[node.group as keyof typeof NODE_TYPE_COLORS];
  const palette = isDark ? e?.dark : e?.light;
  const accent  = palette?.border ?? "#6366f1";
  const bg      = isDark ? "#18181b" : "#f9f9f9";
  const text    = isDark ? "#f4f4f5" : "#18181b";
  const muted   = isDark ? "#a1a1aa" : "#71717a";
  const track   = isDark ? "#3f3f46" : "#d4d4d8";
  const pct     = Math.round(node.dominio * 100);
  const barW    = W - PX * 2;
  const dColor  = dominioColor(node.dominio);
  const pColor  = prioridadeColor(node.prioridadeRevisao);

  const nodeById   = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const connected  = useMemo(() =>
    edges
      .filter((ed) => ed.source === node.id || ed.target === node.id)
      .map((ed) => {
        const isOut   = ed.source === node.id;
        const otherId = isOut ? ed.target : ed.source;
        return { ed, isOut, otherId, otherLabel: nodeById.get(otherId)?.label ?? otherId.slice(0, 8) };
      }),
  [edges, node.id, nodeById]);

  const notaLines = buildNotaLines(notaMeta);
  const numRels   = Math.min(connected.length, 7);
  const REL_H     = 0.042;
  const H = panelHeight({
    hasPergunta:   !!node.pergunta,
    hasDeckStats:  !!deckStats,
    notaLinesCount: notaLines.length,
    numRels:        connected.length,
  });

  // ── Layout top-down ──────────────────────────────────────────────────────────
  let cur = H / 2 - 0.026;

  const yHeader = cur; cur -= 0.034;
  const yLabel  = cur; cur -= (node.label.length > 28 ? 0.058 : 0.036);
  const yId     = cur; cur -= 0.028;
  const ySep1   = cur; cur -= 0.016;
  const yDomLbl = cur; cur -= 0.020;
  const yBar    = cur; cur -= 0.020;
  const yPrio   = cur; cur -= 0.028;
  const ySep2   = cur; cur -= 0.016;

  let yPerg: number | null = null;
  if (node.pergunta) { yPerg = cur; cur -= 0.036; }

  // Baralho stats
  let yDeck: number | null = null;
  if (deckStats) { cur -= 0.006; yDeck = cur; cur -= 0.052; }

  // Nota metadata
  let yNotaStart: number | null = null;
  if (notaLines.length > 0) { cur -= 0.006; yNotaStart = cur; cur -= notaLines.length * 0.022 + 0.012; }

  const ySep3   = cur; cur -= 0.016;
  const yRelHdr = cur; cur -= 0.022;
  const yRelStart = cur;

  return (
    <group ref={groupRef} position={PANEL_POS}>
      {/* Borda */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[W + 0.006, H + 0.006]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      {/* Fundo */}
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial color={bg} />
      </mesh>

      {/* ── Cabeçalho ───────────────────────────────────────── */}
      <Text position={[-W/2+PX, yHeader, 0.002]} fontSize={0.015} color={accent} anchorX="left" anchorY="middle">
        {node.tipoReal.toLowerCase()}
      </Text>
      <group position={[W/2-0.028, yHeader, 0.003]} onClick={onClose}>
        <mesh><planeGeometry args={[0.038, 0.028]} /><meshBasicMaterial color={track} /></mesh>
        <Text position={[0,0,0.001]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
      </group>

      {/* ── Label ───────────────────────────────────────────── */}
      <Text
        position={[-W/2+PX, yLabel, 0.002]}
        fontSize={0.023} color={text}
        anchorX="left" anchorY="top"
        maxWidth={W - PX*2} lineHeight={1.25}
      >
        {node.label}
      </Text>

      {/* ── ID ──────────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yId, 0.002]} fontSize={0.012} color={muted} anchorX="left" anchorY="middle">
        {`ID: ${node.id.slice(0, 8)}…`}
      </Text>

      <Sep y={ySep1} isDark={isDark} />

      {/* ── Domínio ─────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yDomLbl, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">Domínio</Text>
      <Text position={[W/2-PX,  yDomLbl, 0.002]} fontSize={0.013} color={dColor} anchorX="right" anchorY="middle">{`${pct}%`}</Text>
      <mesh position={[0, yBar, 0.002]}><planeGeometry args={[barW, 0.008]} /><meshBasicMaterial color={track} /></mesh>
      {pct > 0 && (
        <mesh position={[-barW/2 + (barW*pct/100)/2, yBar, 0.003]}>
          <planeGeometry args={[barW*pct/100, 0.008]} />
          <meshBasicMaterial color={dColor} />
        </mesh>
      )}

      {/* ── Prioridade ──────────────────────────────────────── */}
      <Text position={[-W/2+PX, yPrio, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">
        Prioridade de revisão
      </Text>
      <mesh position={[W/2-PX-0.022, yPrio, 0.002]}>
        <planeGeometry args={[0.040, 0.020]} /><meshBasicMaterial color={pColor} transparent opacity={0.25} />
      </mesh>
      <Text position={[W/2-PX-0.022, yPrio, 0.003]} fontSize={0.013} color={pColor} anchorX="center" anchorY="middle">
        {String(node.prioridadeRevisao)}
      </Text>

      <Sep y={ySep2} isDark={isDark} />

      {/* ── Pergunta (flashcard) ─────────────────────────────── */}
      {yPerg !== null && node.pergunta && (
        <Text
          position={[-W/2+PX, yPerg, 0.002]}
          fontSize={0.013} color={muted}
          anchorX="left" anchorY="top"
          maxWidth={W - PX*2} lineHeight={1.2}
        >
          {`"${node.pergunta}"`}
        </Text>
      )}

      {/* ── Stats de baralho ─────────────────────────────────── */}
      {yDeck !== null && deckStats && (() => {
        const cols = [
          { label: "total",   val: String(deckStats.total),       color: text },
          { label: "novos",   val: String(deckStats.novos),       color: "#3b82f6" },
          { label: "revisar", val: String(deckStats.paraRevisar), color: "#f59e0b" },
        ];
        const colW = (W - PX*2) / 3;
        return cols.map(({ label, val, color }, i) => {
          const cx = -W/2 + PX + colW*i + colW/2;
          return (
            <group key={label}>
              <mesh position={[cx, yDeck! - 0.012, 0.002]}>
                <planeGeometry args={[colW - 0.008, 0.042]} />
                <meshBasicMaterial color={track} transparent opacity={0.5} />
              </mesh>
              <Text position={[cx, yDeck! - 0.002, 0.003]} fontSize={0.018} color={color} anchorX="center" anchorY="middle">
                {val}
              </Text>
              <Text position={[cx, yDeck! - 0.022, 0.003]} fontSize={0.011} color={muted} anchorX="center" anchorY="middle">
                {label}
              </Text>
            </group>
          );
        });
      })()}

      {/* ── Metadata de nota ─────────────────────────────────── */}
      {yNotaStart !== null && notaLines.map((line, i) => (
        <Text
          key={i}
          position={[-W/2+PX, yNotaStart! - i*0.022, 0.002]}
          fontSize={0.012} color={i === 0 ? text : muted}
          anchorX="left" anchorY="middle"
          maxWidth={W - PX*2}
        >
          {line}
        </Text>
      ))}

      <Sep y={ySep3} isDark={isDark} />

      {/* ── Relações ─────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yRelHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">
        {`RELAÇÕES (${connected.length})`}
      </Text>

      {connected.slice(0, 7).map(({ ed, isOut, otherId, otherLabel }, i) => {
        const ry       = yRelStart - i * REL_H;
        const relColor = getRelationColor(ed.type, isDark);
        const relLabel = RELATION_LABELS[ed.type] ?? ed.type.toLowerCase();
        return (
          <group key={`${ed.source}>${ed.target}-${i}`}>
            <mesh position={[-W/2+PX+0.008, ry+0.005, 0.002]}>
              <circleGeometry args={[0.006, 12]} /><meshBasicMaterial color={relColor} />
            </mesh>
            <Text position={[-W/2+PX+0.022, ry+0.013, 0.002]} fontSize={0.011} color={muted} anchorX="left" anchorY="middle">
              {`${isOut ? "→" : "←"} ${relLabel}  ·  peso ${Number(ed.peso.toFixed(2))}`}
            </Text>
            <group onClick={() => onSelectNode(otherId)}>
              <Text position={[-W/2+PX+0.022, ry-0.006, 0.002]} fontSize={0.014} color={text} anchorX="left" anchorY="middle" maxWidth={W-PX*2-0.04}>
                {otherLabel.length > 34 ? otherLabel.slice(0, 33)+"…" : otherLabel}
              </Text>
            </group>
          </group>
        );
      })}

      {connected.length === 0 && (
        <Text position={[-W/2+PX, yRelStart, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="top">
          Sem relações neste grafo.
        </Text>
      )}
      {connected.length > 7 && (
        <Text position={[0, yRelStart - 7*REL_H, 0.002]} fontSize={0.012} color={muted} anchorX="center" anchorY="top">
          {`+ ${connected.length - 7} relações`}
        </Text>
      )}
    </group>
  );
}
