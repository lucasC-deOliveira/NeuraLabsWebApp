"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { NODE_TYPE_COLORS, RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import {
  getNodeDetails, getGraphEdges, createEdge, updateEdge, deleteEdge,
} from "@/lib/graph-api";
import type { EdgeView } from "@/lib/graph-api";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { readAllVaultNodes, graphVaultDir } from "@/lib/vault-sync";
import { readSrsLog } from "@/lib/srs-local";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";
import {
  dominioColor, prioridadeColor,
  TIPO_NOTA_LABELS, SUBTIPO_LABELS, buildNotaLines, panelHeight,
} from "@/modules/vr/vr-panel.helpers";

const W          = 0.60;
const PX         = 0.022;
const PANEL_POS: [number, number, number] = [0.32, 1.50, -0.88];
const REL_H      = 0.042;
const REL_H_EDIT = 0.086;
const ADD_ROW_H  = 0.032;
const NODE_PAGE  = 7;
const ADD_BTN_H  = 0.036;
const CONN_ROW_H = 0.024;
const BTN_ROW_H  = 0.042;
const RELATION_TYPES = Object.keys(RELATION_LABELS);

function Sep({ y, isDark }: { y: number; isDark: boolean }) {
  return (
    <mesh position={[0, y, 0.002]}>
      <planeGeometry args={[W - PX * 2, 0.0015]} />
      <meshBasicMaterial color={isDark ? "#3f3f46" : "#d4d4d8"} />
    </mesh>
  );
}

function Btn3D({
  x, y, w = 0.080, h = 0.022, label, bg, color, fontSize = 0.013, onClick,
}: {
  x: number; y: number; w?: number; h?: number;
  label: string; bg: string; color: string; fontSize?: number;
  onClick: () => void;
}) {
  return (
    <group onClick={onClick}>
      <mesh position={[x, y, 0.003]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={bg} />
      </mesh>
      <Text position={[x, y, 0.004]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
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
  onEdgesChanged: () => void;
  onEditNode: () => void;
  onShowContent: () => void;
  onStudy: () => void;
}

export function VRPanel3D({
  node, nodes, edges, isDark, grafoId, grafoNome,
  onClose, onSelectNode, onEdgesChanged, onEditNode, onShowContent, onStudy,
}: VRPanel3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => { if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion); });

  // ── Dados assíncronos ────────────────────────────────────────────────────
  const [deckStats, setDeckStats] = useState<DeckStats | null>(null);
  const [notaMeta,  setNotaMeta]  = useState<NotaMeta | null>(null);
  const [edgeViews, setEdgeViews] = useState<EdgeView[]>([]);
  const [mutating,  setMutating]  = useState(false);

  const loadEdgeViews = useCallback(() => {
    getGraphEdges(grafoId).then(setEdgeViews).catch(() => {});
  }, [grafoId]);

  useEffect(() => {
    setDeckStats(null);
    setNotaMeta(null);
    loadEdgeViews();

    if (node.tipoReal === "NOTA") {
      getNodeDetails("NOTA", node.id).then(setNotaMeta).catch(() => {});
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
            const now = new Date();
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
  }, [node.id, node.tipoReal, grafoId, grafoNome, loadEdgeViews]);

  // ── Estado de edição / adição ────────────────────────────────────────────
  const [editKey,     setEditKey]     = useState<string | null>(null);
  const [editType,    setEditType]    = useState("");
  const [editPeso,    setEditPeso]    = useState(1);
  const [addStep,     setAddStep]     = useState<null | "target" | "type">(null);
  const [addTargetId, setAddTargetId] = useState<string | null>(null);
  const [addTypeIdx,  setAddTypeIdx]  = useState(0);
  const [addPeso,     setAddPeso]     = useState(1.0);
  const [nodePage,    setNodePage]    = useState(0);

  useEffect(() => {
    setEditKey(null);
    setAddStep(null);
    setAddTargetId(null);
    setAddTypeIdx(0);
    setAddPeso(1.0);
    setNodePage(0);
  }, [node.id]);

  // ── Operações de aresta ──────────────────────────────────────────────────
  const findView = (ed: SimEdge) =>
    edgeViews.find(v => v.source === ed.source && v.target === ed.target && v.tipoRelacao === ed.type);

  const handleDelete = async (ed: SimEdge) => {
    const ev = findView(ed);
    if (!ev || mutating) return;
    setMutating(true);
    try { await deleteEdge(ev.id, grafoId); loadEdgeViews(); onEdgesChanged(); } catch { /**/ }
    setMutating(false);
  };

  const handleStartEdit = (ed: SimEdge) => {
    setEditKey(`${ed.source}_${ed.target}_${ed.type}`);
    setEditType(ed.type);
    setEditPeso(ed.peso);
    setAddStep(null);
  };

  const handleConfirmEdit = async (ed: SimEdge) => {
    const ev = findView(ed);
    if (!ev || mutating) return;
    setMutating(true);
    try {
      await updateEdge(ev.id, grafoId, { tipoRelacao: editType, peso: editPeso });
      setEditKey(null);
      loadEdgeViews();
      onEdgesChanged();
    } catch { /**/ }
    setMutating(false);
  };

  const handleConfirmAdd = async () => {
    if (!addTargetId || mutating) return;
    setMutating(true);
    try {
      await createEdge(grafoId, {
        sourceNodeId: node.id,
        targetNodeId: addTargetId,
        tipoRelacao: RELATION_TYPES[addTypeIdx],
        peso: addPeso,
      });
      setAddStep(null);
      setAddTargetId(null);
      loadEdgeViews();
      onEdgesChanged();
    } catch { /**/ }
    setMutating(false);
  };

  // ── Paleta de cores ──────────────────────────────────────────────────────
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

  const nodeById  = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const connected = useMemo(() =>
    edges
      .filter(ed => ed.source === node.id || ed.target === node.id)
      .map(ed => {
        const isOut   = ed.source === node.id;
        const otherId = isOut ? ed.target : ed.source;
        return { ed, isOut, otherId, otherLabel: nodeById.get(otherId)?.label ?? otherId.slice(0, 8) };
      }),
  [edges, node.id, nodeById]);

  const notaLines = buildNotaLines(notaMeta);
  const numRels   = Math.min(connected.length, 7);
  const editExtra = editKey ? (REL_H_EDIT - REL_H) : 0;

  const nonSelf   = useMemo(() => nodes.filter(n => n.id !== node.id), [nodes, node.id]);
  const pageStart = nodePage * NODE_PAGE;
  const pageNodes = nonSelf.slice(pageStart, pageStart + NODE_PAGE);

  // ── Altura dinâmica ──────────────────────────────────────────────────────
  const hasContent = ["BARALHO", "NOTA", "TEXTO_BRUTO", "FLASHCARD"].includes(node.group);
  const hasStudy   = ["BARALHO", "FLASHCARD"].includes(node.group);

  const baseNoRels = panelHeight({
    hasPergunta:    !!node.pergunta,
    hasDeckStats:   !!deckStats,
    notaLinesCount: notaLines.length,
    numRels: 0,
  }) + CONN_ROW_H + BTN_ROW_H;

  let H: number;
  if (addStep === "target") {
    const vis = Math.max(1, pageNodes.length);
    H = baseNoRels + 0.022 + vis * ADD_ROW_H + 0.030 + 0.028;
  } else if (addStep === "type") {
    H = baseNoRels + 0.022 + 0.032 + 0.032 + 0.036;
  } else {
    H = baseNoRels + numRels * REL_H + editExtra + ADD_BTN_H;
  }

  // ── Layout top-down ──────────────────────────────────────────────────────
  let cur = H / 2 - 0.026;
  const yHeader = cur; cur -= 0.034;
  const yLabel  = cur; cur -= (node.label.length > 28 ? 0.058 : 0.036);
  const yId     = cur; cur -= 0.028;
  const ySep1   = cur; cur -= 0.016;
  const yDomLbl = cur; cur -= 0.020;
  const yBar    = cur; cur -= 0.020;
  const yPrio   = cur; cur -= 0.028;
  const yConns  = cur; cur -= CONN_ROW_H;
  const ySep2   = cur; cur -= 0.016;

  let yPerg: number | null = null;
  if (node.pergunta) { yPerg = cur; cur -= 0.036; }
  let yDeck: number | null = null;
  if (deckStats) { cur -= 0.006; yDeck = cur; cur -= 0.052; }
  let yNotaStart: number | null = null;
  if (notaLines.length > 0) { cur -= 0.006; yNotaStart = cur; cur -= notaLines.length * 0.022 + 0.012; }

  cur -= 0.006;
  const yActions = cur - BTN_ROW_H / 2; cur -= BTN_ROW_H;

  const ySep3    = cur; cur -= 0.016;
  const yRelHdr  = cur; cur -= 0.022;
  const yRelStart = cur;

  // Pré-computa Y de cada linha de relação (uma pode estar em modo edit)
  const relYs: number[] = [];
  let yRel = yRelStart;
  for (const { ed } of connected.slice(0, 7)) {
    relYs.push(yRel);
    yRel -= (editKey === `${ed.source}_${ed.target}_${ed.type}`) ? REL_H_EDIT : REL_H;
  }
  const yAddBtn = yRel - 0.006;

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
      {/* Botão fechar */}
      <group onClick={onClose}>
        <mesh position={[W/2-0.028, yHeader, 0.003]}>
          <planeGeometry args={[0.038, 0.026]} /><meshBasicMaterial color={track} />
        </mesh>
        <Text position={[W/2-0.028, yHeader, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
      </group>

      {/* ── Label ───────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yLabel, 0.002]} fontSize={0.023} color={text} anchorX="left" anchorY="top" maxWidth={W-PX*2} lineHeight={1.25}>
        {node.label}
      </Text>

      {/* ── ID ──────────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yId, 0.002]} fontSize={0.012} color={muted} anchorX="left" anchorY="middle">
        {`ID: ${node.id.slice(0, 8)}…`}
      </Text>

      <Sep y={ySep1} isDark={isDark} />

      {/* ── Domínio ─────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yDomLbl, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">Domínio</Text>
      <Text position={[W/2-PX, yDomLbl, 0.002]} fontSize={0.013} color={dColor} anchorX="right" anchorY="middle">{`${pct}%`}</Text>
      <mesh position={[0, yBar, 0.002]}><planeGeometry args={[barW, 0.008]} /><meshBasicMaterial color={track} /></mesh>
      {pct > 0 && (
        <mesh position={[-barW/2+(barW*pct/100)/2, yBar, 0.003]}>
          <planeGeometry args={[barW*pct/100, 0.008]} /><meshBasicMaterial color={dColor} />
        </mesh>
      )}

      {/* ── Prioridade ──────────────────────────────────────── */}
      <Text position={[-W/2+PX, yPrio, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">Prioridade de revisão</Text>
      <mesh position={[W/2-PX-0.022, yPrio, 0.002]}>
        <planeGeometry args={[0.040, 0.020]} /><meshBasicMaterial color={pColor} transparent opacity={0.25} />
      </mesh>
      <Text position={[W/2-PX-0.022, yPrio, 0.003]} fontSize={0.013} color={pColor} anchorX="center" anchorY="middle">
        {String(node.prioridadeRevisao)}
      </Text>

      {/* ── Conexões ────────────────────────────────────────── */}
      <Text position={[-W/2+PX, yConns, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">Conexões</Text>
      <Text position={[W/2-PX, yConns, 0.002]} fontSize={0.013} color={text} anchorX="right" anchorY="middle">
        {String(connected.length)}
      </Text>

      <Sep y={ySep2} isDark={isDark} />

      {/* ── Pergunta ────────────────────────────────────────── */}
      {yPerg !== null && node.pergunta && (
        <Text position={[-W/2+PX, yPerg, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="top" maxWidth={W-PX*2} lineHeight={1.2}>
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
        return cols.map(({ label, val, color: c }, idx) => {
          const cx = -W/2 + PX + colW*idx + colW/2;
          return (
            <group key={label}>
              <mesh position={[cx, yDeck! - 0.012, 0.002]}>
                <planeGeometry args={[colW - 0.008, 0.042]} /><meshBasicMaterial color={track} transparent opacity={0.5} />
              </mesh>
              <Text position={[cx, yDeck! - 0.002, 0.003]} fontSize={0.018} color={c} anchorX="center" anchorY="middle">{val}</Text>
              <Text position={[cx, yDeck! - 0.022, 0.003]} fontSize={0.011} color={muted} anchorX="center" anchorY="middle">{label}</Text>
            </group>
          );
        });
      })()}

      {/* ── Metadata de nota ─────────────────────────────────── */}
      {yNotaStart !== null && notaLines.map((line, idx) => (
        <Text key={idx} position={[-W/2+PX, yNotaStart! - idx*0.022, 0.002]} fontSize={0.012}
          color={idx === 0 ? text : muted} anchorX="left" anchorY="middle" maxWidth={W-PX*2}>
          {line}
        </Text>
      ))}

      {/* ── Botões de ação ───────────────────────────────────── */}
      {(() => {
        const numBtns = hasStudy ? 3 : hasContent ? 2 : 1;
        const gap  = 0.006;
        const bw   = (W - PX * 2 - gap * (numBtns - 1)) / numBtns;
        const by   = yActions;
        const bh   = 0.030;

        const x1 = -W / 2 + PX + bw / 2;
        const x2 = numBtns === 3 ? 0 : W / 2 - PX - bw / 2;
        const x3 = W / 2 - PX - bw / 2;

        return (
          <>
            {/* Editar — sempre */}
            <Btn3D x={x1} y={by} w={bw} h={bh} label="Editar" bg={track} color={text} fontSize={0.013}
              onClick={onEditNode} />
            {/* Conteúdo — para BARALHO, NOTA, TEXTO_BRUTO, FLASHCARD */}
            {hasContent && (
              <Btn3D x={x2} y={by} w={bw} h={bh} label="Conteúdo" bg={accent} color="#fff" fontSize={0.013}
                onClick={onShowContent} />
            )}
            {/* Estudar — para BARALHO e FLASHCARD */}
            {hasStudy && (
              <Btn3D x={x3} y={by} w={bw} h={bh} label="Estudar" bg="#22c55e" color="#fff" fontSize={0.013}
                onClick={onStudy} />
            )}
          </>
        );
      })()}

      <Sep y={ySep3} isDark={isDark} />

      {/* ══════════════════════════════════════════════════════
          SEÇÃO DINÂMICA: relações normais | picker de nó | picker de tipo
      ══════════════════════════════════════════════════════ */}

      {addStep === null && (
        <>
          {/* ── Cabeçalho de relações ────────────────────────── */}
          <Text position={[-W/2+PX, yRelHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">
            {`RELAÇÕES (${connected.length})`}
          </Text>

          {connected.length === 0 && (
            <Text position={[-W/2+PX, yRelStart, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="top">
              Sem relações neste grafo.
            </Text>
          )}

          {/* ── Linhas de relação ───────────────────────────── */}
          {connected.slice(0, 7).map(({ ed, isOut, otherId, otherLabel }, i) => {
            const edKey    = `${ed.source}_${ed.target}_${ed.type}`;
            const isEdit   = editKey === edKey;
            const ry       = relYs[i];
            const relColor = getRelationColor(ed.type, isDark);
            const relLabel = RELATION_LABELS[ed.type] ?? ed.type.toLowerCase();

            if (isEdit) {
              const tIdx  = RELATION_TYPES.indexOf(editType);
              const tLabel = RELATION_LABELS[editType] ?? editType.toLowerCase();
              const y1 = ry - 0.012; // linha tipo
              const y2 = ry - 0.054; // linha peso
              return (
                <group key={edKey}>
                  {/* linha 1: [•] [<] tipo [>] [✗] */}
                  <mesh position={[-W/2+PX+0.008, y1, 0.002]}>
                    <circleGeometry args={[0.005, 12]} /><meshBasicMaterial color={relColor} />
                  </mesh>
                  <Btn3D x={-W/2+PX+0.030} y={y1} w={0.020} h={0.018} label="<" bg={track} color={text} fontSize={0.014}
                    onClick={() => setEditType(RELATION_TYPES[(tIdx - 1 + RELATION_TYPES.length) % RELATION_TYPES.length])} />
                  <Text position={[0, y1, 0.003]} fontSize={0.012} color={text} anchorX="center" anchorY="middle" maxWidth={0.26}>
                    {tLabel}
                  </Text>
                  <Btn3D x={W/2-PX-0.090} y={y1} w={0.020} h={0.018} label=">" bg={track} color={text} fontSize={0.014}
                    onClick={() => setEditType(RELATION_TYPES[(tIdx + 1) % RELATION_TYPES.length])} />
                  <Btn3D x={W/2-PX-0.016} y={y1} w={0.028} h={0.020} label="✗" bg="#ef4444" color="#fff" fontSize={0.014}
                    onClick={() => setEditKey(null)} />

                  {/* linha 2: Peso [−] N.N [+] [✓] */}
                  <Text position={[-W/2+PX, y2, 0.002]} fontSize={0.012} color={muted} anchorX="left" anchorY="middle">Peso:</Text>
                  <Btn3D x={-W/2+PX+0.090} y={y2} w={0.022} h={0.018} label="−" bg={track} color={text} fontSize={0.015}
                    onClick={() => setEditPeso(p => Math.max(0.1, parseFloat((p - 0.1).toFixed(1))))} />
                  <Text position={[-W/2+PX+0.122, y2, 0.003]} fontSize={0.013} color={text} anchorX="center" anchorY="middle">
                    {editPeso.toFixed(1)}
                  </Text>
                  <Btn3D x={-W/2+PX+0.154} y={y2} w={0.022} h={0.018} label="+" bg={track} color={text} fontSize={0.015}
                    onClick={() => setEditPeso(p => Math.min(10, parseFloat((p + 0.1).toFixed(1))))} />
                  <Btn3D x={W/2-PX-0.016} y={y2} w={0.028} h={0.020} label="✓" bg="#22c55e" color="#fff" fontSize={0.014}
                    onClick={() => handleConfirmEdit(ed)} />
                </group>
              );
            }

            // linha normal
            return (
              <group key={edKey}>
                <mesh position={[-W/2+PX+0.008, ry-0.004, 0.002]}>
                  <circleGeometry args={[0.005, 12]} /><meshBasicMaterial color={relColor} />
                </mesh>
                <Text position={[-W/2+PX+0.022, ry+0.008, 0.002]} fontSize={0.011} color={muted} anchorX="left" anchorY="middle">
                  {`${isOut ? "→" : "←"} ${relLabel}  ·  peso ${Number(ed.peso.toFixed(2))}`}
                </Text>
                <group onClick={() => onSelectNode(otherId)}>
                  <Text position={[-W/2+PX+0.022, ry-0.012, 0.002]} fontSize={0.013} color={text}
                    anchorX="left" anchorY="middle" maxWidth={W-PX*2-0.07}>
                    {otherLabel.length > 30 ? otherLabel.slice(0, 29)+"…" : otherLabel}
                  </Text>
                </group>
                <Btn3D x={W/2-PX-0.038} y={ry-0.004} w={0.026} h={0.018} label="✏" bg={track} color={muted} fontSize={0.012}
                  onClick={() => handleStartEdit(ed)} />
                <Btn3D x={W/2-PX-0.010} y={ry-0.004} w={0.026} h={0.018} label="✕" bg={track} color="#ef4444" fontSize={0.012}
                  onClick={() => handleDelete(ed)} />
              </group>
            );
          })}

          {connected.length > 7 && (
            <Text position={[0, yRel - 0.006, 0.002]} fontSize={0.012} color={muted} anchorX="center" anchorY="top">
              {`+ ${connected.length - 7} relações`}
            </Text>
          )}

          {/* ── Botão nova relação ───────────────────────────── */}
          <Btn3D x={0} y={yAddBtn} w={W-PX*2} h={0.028} label="＋  Nova relação" bg={accent} color="#fff" fontSize={0.013}
            onClick={() => { setAddStep("target"); setNodePage(0); }} />
        </>
      )}

      {/* ── Picker: selecionar nó alvo ───────────────────────── */}
      {addStep === "target" && (
        <>
          <Text position={[-W/2+PX, yRelHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">
            NOVA RELAÇÃO — Selecionar nó:
          </Text>

          {pageNodes.map((n, i) => {
            const ny    = yRelStart - i * ADD_ROW_H;
            const nDot  = NODE_TYPE_COLORS[n.group as keyof typeof NODE_TYPE_COLORS];
            const nClr  = (isDark ? nDot?.dark : nDot?.light)?.border ?? "#6366f1";
            return (
              <group key={n.id} onClick={() => { setAddTargetId(n.id); setAddStep("type"); }}>
                <mesh position={[-W/2+PX+0.008, ny, 0.002]}>
                  <circleGeometry args={[0.005, 12]} /><meshBasicMaterial color={nClr} />
                </mesh>
                <Text position={[-W/2+PX+0.022, ny, 0.002]} fontSize={0.013} color={text}
                  anchorX="left" anchorY="middle" maxWidth={W-PX*2-0.030}>
                  {n.label.length > 36 ? n.label.slice(0, 35)+"…" : n.label}
                </Text>
              </group>
            );
          })}

          {pageNodes.length === 0 && (
            <Text position={[-W/2+PX, yRelStart, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">
              Sem nós disponíveis.
            </Text>
          )}

          {/* Navegação de página */}
          {(() => {
            const navY   = yRelStart - Math.max(1, pageNodes.length) * ADD_ROW_H - 0.010;
            const hasPrev = pageStart > 0;
            const hasNext = pageStart + NODE_PAGE < nonSelf.length;
            return (
              <>
                {hasPrev && <Btn3D x={-W/4} y={navY} w={0.130} h={0.022} label="< Anterior" bg={track} color={text} fontSize={0.012}
                  onClick={() => setNodePage(p => p - 1)} />}
                {hasNext && <Btn3D x={W/4}  y={navY} w={0.130} h={0.022} label="Próxima >"  bg={track} color={text} fontSize={0.012}
                  onClick={() => setNodePage(p => p + 1)} />}
                <Btn3D x={0} y={navY - 0.034} w={W-PX*2} h={0.024} label="✗ Cancelar" bg="#ef4444" color="#fff" fontSize={0.013}
                  onClick={() => setAddStep(null)} />
              </>
            );
          })()}
        </>
      )}

      {/* ── Picker: tipo e peso da nova relação ──────────────── */}
      {addStep === "type" && (() => {
        const addTarget  = nodes.find(n => n.id === addTargetId);
        const addTypeKey = RELATION_TYPES[addTypeIdx];
        const addTypeLbl = RELATION_LABELS[addTypeKey] ?? addTypeKey.toLowerCase();
        const ty1 = yRelStart;           // target label
        const ty2 = ty1 - 0.030;        // type selector
        const ty3 = ty2 - 0.034;        // peso row
        const ty4 = ty3 - 0.038;        // confirm/cancel
        return (
          <>
            <Text position={[-W/2+PX, yRelHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">
              NOVA RELAÇÃO
            </Text>
            <Text position={[-W/2+PX, ty1, 0.002]} fontSize={0.013} color={text}
              anchorX="left" anchorY="middle" maxWidth={W-PX*2}>
              {`→ ${addTarget?.label ?? addTargetId}`}
            </Text>

            {/* Tipo */}
            <Btn3D x={-W/2+PX+0.016} y={ty2} w={0.026} h={0.026} label="<" bg={track} color={text} fontSize={0.015}
              onClick={() => setAddTypeIdx(i => (i - 1 + RELATION_TYPES.length) % RELATION_TYPES.length)} />
            <Text position={[0, ty2, 0.003]} fontSize={0.013} color={text} anchorX="center" anchorY="middle" maxWidth={W-0.10}>
              {addTypeLbl}
            </Text>
            <Btn3D x={W/2-PX-0.016} y={ty2} w={0.026} h={0.026} label=">" bg={track} color={text} fontSize={0.015}
              onClick={() => setAddTypeIdx(i => (i + 1) % RELATION_TYPES.length)} />

            {/* Peso */}
            <Text position={[-W/2+PX, ty3, 0.002]} fontSize={0.012} color={muted} anchorX="left" anchorY="middle">Peso:</Text>
            <Btn3D x={-W/2+PX+0.090} y={ty3} w={0.022} h={0.022} label="−" bg={track} color={text} fontSize={0.015}
              onClick={() => setAddPeso(p => Math.max(0.1, parseFloat((p - 0.1).toFixed(1))))} />
            <Text position={[-W/2+PX+0.122, ty3, 0.003]} fontSize={0.013} color={text} anchorX="center" anchorY="middle">
              {addPeso.toFixed(1)}
            </Text>
            <Btn3D x={-W/2+PX+0.154} y={ty3} w={0.022} h={0.022} label="+" bg={track} color={text} fontSize={0.015}
              onClick={() => setAddPeso(p => Math.min(10, parseFloat((p + 0.1).toFixed(1))))} />

            {/* Ações */}
            <Btn3D x={-W/4} y={ty4} w={0.140} h={0.028} label="✗ Cancelar" bg="#ef4444" color="#fff" fontSize={0.013}
              onClick={() => { setAddStep(null); setAddTargetId(null); }} />
            <Btn3D x={W/4}  y={ty4} w={0.140} h={0.028} label="✓ Adicionar" bg="#22c55e" color="#fff" fontSize={0.013}
              onClick={handleConfirmAdd} />
          </>
        );
      })()}
    </group>
  );
}
