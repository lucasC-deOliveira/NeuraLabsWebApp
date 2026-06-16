"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { NODE_TYPE_COLORS } from "@/modules/graph/constants/graph-ui.constants";
import { physicsStep, DEFAULT_PHYSICS_OPTIONS } from "@/modules/graph/presentation/services/graph-physics.service";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";

const GRAPH_CENTER = new THREE.Vector3(0, 1.5, -1.5);
const GRAPH_SCALE  = 1.4;
const STICK_DEAD   = 0.15;
const STICK_SPEED  = 1.8;

const VR_PHYSICS_OPTIONS = {
  ...DEFAULT_PHYSICS_OPTIONS,
  orbitalStrength: 0.12,
  damping: 0.45,
};

const GROUP_Y: Record<string, number> = {
  ASSUNTO: 0.38, TOPICO: 0.18, CONCEITO: 0.0,
  NOTA: -0.12, FLASHCARD: -0.22, TEXTO_BRUTO: -0.16, BARALHO: -0.10,
};

type GeoConfig =
  | { shape: "sphere";    r: number }
  | { shape: "ellipsoid"; r: number; sx: number; sy: number; sz: number }
  | { shape: "box";       w: number; h: number; d: number };

const GROUP_GEO: Record<string, GeoConfig> = {
  ASSUNTO:     { shape: "sphere",    r: 0.075 },
  TOPICO:      { shape: "ellipsoid", r: 0.07, sx: 1.6, sy: 0.65, sz: 0.65 },
  CONCEITO:    { shape: "box",       w: 0.13, h: 0.065, d: 0.065 },
  NOTA:        { shape: "box",       w: 0.06, h: 0.11,  d: 0.055 },
  FLASHCARD:   { shape: "box",       w: 0.09, h: 0.065, d: 0.030 },
  TEXTO_BRUTO: { shape: "box",       w: 0.11, h: 0.055, d: 0.055 },
  BARALHO:     { shape: "box",       w: 0.10, h: 0.075, d: 0.065 },
};

const LABEL_Y: Record<string, number> = {
  ASSUNTO:     0.075 + 0.045,
  TOPICO:      0.07 * 0.65 + 0.045,
  CONCEITO:    0.065 / 2 + 0.045,
  NOTA:        0.11  / 2 + 0.045,
  FLASHCARD:   0.065 / 2 + 0.045,
  TEXTO_BRUTO: 0.055 / 2 + 0.045,
  BARALHO:     0.075 / 2 + 0.045,
};

function getNodeColors(group: string, isDark: boolean) {
  const e = NODE_TYPE_COLORS[group as keyof typeof NODE_TYPE_COLORS];
  return {
    fill:   isDark ? (e?.dark.bg     ?? "#1e1b4b") : (e?.light.bg     ?? "#eef2ff"),
    border: isDark ? (e?.dark.border ?? "#818cf8") : (e?.light.border ?? "#4338ca"),
  };
}

/** Converte coordenadas 2D da física para posição 3D normalizada. */
function toVR3D(x: number, y: number, group: string, bx: number, by: number, spread: number): THREE.Vector3 {
  return new THREE.Vector3(
    ((x - bx) / spread) * GRAPH_SCALE,
    GROUP_Y[group] ?? 0,
    ((y - by) / spread) * GRAPH_SCALE,
  );
}

function computeBounds(nodes: SimNode[]): { bx: number; by: number; spread: number } {
  if (!nodes.length) return { bx: 0, by: 0, spread: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  }
  return {
    bx: (minX + maxX) / 2,
    by: (minY + maxY) / 2,
    spread: Math.max(maxX - minX, maxY - minY) || 1,
  };
}

// ── Geometria por tipo ────────────────────────────────────────────────────────
function NodeGeo({ cfg }: { cfg: GeoConfig }) {
  if (cfg.shape === "sphere" || cfg.shape === "ellipsoid")
    return <sphereGeometry args={[cfg.r, 32, 24]} />;
  return <boxGeometry args={[cfg.w, cfg.h, cfg.d]} />;
}

// ── Nó ───────────────────────────────────────────────────────────────────────
// A posição do grupo externo é controlada imperativamente pela física.
// O React nunca recebe uma prop `position` no grupo externo, então re-renders
// por seleção/hover NÃO sobrescrevem a posição calculada pela física.
function VRNode({ node, initialPos, isDark, selected, onSelect, localGroupRef, onGroupMount }: {
  node: SimNode;
  initialPos: THREE.Vector3;
  isDark: boolean;
  selected: boolean;
  onSelect: (n: SimNode) => void;
  localGroupRef: React.RefObject<THREE.Group | null>;
  onGroupMount: (id: string, group: THREE.Group) => void;
}) {
  const nodeGroupRef = useRef<THREE.Group>(null);
  const pulseRef     = useRef<THREE.Group>(null);
  const labelRef     = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const cfg    = GROUP_GEO[node.group] ?? ({ shape: "box" as const, w: 0.09, h: 0.07, d: 0.07 });
  const colors = getNodeColors(node.group, isDark);
  const labelY = LABEL_Y[node.group] ?? 0.09;

  const meshScale   = cfg.shape === "ellipsoid" ? new THREE.Vector3(cfg.sx, cfg.sy, cfg.sz) : new THREE.Vector3(1, 1, 1);
  const borderScale = cfg.shape === "ellipsoid" ? new THREE.Vector3(cfg.sx * 1.09, cfg.sy * 1.09, cfg.sz * 1.09) : new THREE.Vector3(1.09, 1.09, 1.09);

  // Registra o grupo externo na física e aplica posição inicial antes do primeiro frame.
  useLayoutEffect(() => {
    const g = nodeGroupRef.current;
    if (!g) return;
    g.position.copy(initialPos);
    onGroupMount(node.id, g);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // uma vez no mount

  useFrame(({ clock }) => {
    if (pulseRef.current)
      pulseRef.current.scale.setScalar(selected ? 1 + Math.sin(clock.getElapsedTime() * 3) * 0.07 : 1);
    if (labelRef.current && localGroupRef.current)
      labelRef.current.quaternion.copy(localGroupRef.current.quaternion).invert();
  });

  return (
    // Sem prop `position` — posição controlada pela física via nodeGroupRef
    <group ref={nodeGroupRef}>
      <group
        ref={pulseRef}
        onClick={() => onSelect(node)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <mesh scale={meshScale}>
          <NodeGeo cfg={cfg} />
          <meshStandardMaterial
            color={selected ? "#dbeafe" : hovered ? colors.border : colors.fill}
            emissive={selected ? "#1d4ed8" : hovered ? colors.border : "#000000"}
            emissiveIntensity={selected ? 0.45 : hovered ? 0.15 : 0}
            roughness={0.3} metalness={0.1}
          />
        </mesh>
        <mesh scale={borderScale}>
          <NodeGeo cfg={cfg} />
          <meshBasicMaterial color={colors.border} side={THREE.BackSide} />
        </mesh>
      </group>

      <group ref={labelRef}>
        <Text
          position={[0, labelY, 0]}
          fontSize={0.030}
          color={isDark ? "#f4f4f5" : "#18181b"}
          anchorX="center" anchorY="bottom"
          maxWidth={0.40}
          outlineWidth={0.003}
          outlineColor={isDark ? "#000000" : "#ffffff"}
        >
          {node.label.length > 20 ? node.label.slice(0, 19) + "…" : node.label}
        </Text>
      </group>
    </group>
  );
}

// ── Grafo ─────────────────────────────────────────────────────────────────────
interface VRGraphProps {
  nodes: SimNode[];
  edges: SimEdge[];
  isDark: boolean;
  selectedNodeIds: Set<string>;
  onNodeClick: (node: SimNode) => void;
}

export function VRGraph({ nodes, edges, isDark, selectedNodeIds, onNodeClick }: VRGraphProps) {
  const dragGroupRef  = useRef<THREE.Group>(null);
  const dragRot       = useRef({ x: 0, y: 0 });
  const localGroupRef = useRef<THREE.Group>(null);

  // ── Física — tudo em refs, sem React state (estado não é lido no render) ─────
  const physNodesRef   = useRef<SimNode[]>([...nodes]);
  const edgesRef       = useRef(edges);
  edgesRef.current     = edges;
  const settledRef     = useRef(false);
  const isDarkRef      = useRef(isDark);
  isDarkRef.current    = isDark;

  // Mapa nodeId → THREE.Group (preenchido por cada VRNode no mount)
  const nodeGroupMap   = useRef(new Map<string, THREE.Group>());

  // LineSegments para todas as arestas (atualizado imperativamente)
  const edgeLinesRef   = useRef<THREE.LineSegments | null>(null);

  // Reinicia física quando o grafo muda.
  // NÃO limpa nodeGroupMap aqui — useLayoutEffect dos VRNodes roda antes deste
  // useEffect (children-first), então clear() apagaria o mapa recém-preenchido.
  // Os grupos obsoletos no mapa são inofensivos: só nós de physNodesRef são lidos.
  useEffect(() => {
    // Kick inicial: pequena velocidade aleatória garante que physicsStep saia do
    // equilíbrio do runForceLayout (parâmetros diferentes) e produza movimento visível.
    physNodesRef.current = nodes.map(n => ({
      ...n,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
    }));
    settledRef.current = false;
  }, [nodes]);

  // Posições iniciais para o primeiro frame (antes da física rodar)
  const initialPositions = useMemo(() => {
    const { bx, by, spread } = computeBounds(nodes);
    return new Map(nodes.map(n => [n.id, toVR3D(n.x, n.y, n.group, bx, by, spread)]));
  }, [nodes]);

  // Callback estável para VRNode registrar seu group
  const handleGroupMount = useCallback((id: string, group: THREE.Group) => {
    nodeGroupMap.current.set(id, group);
  }, []);

  useFrame((state, delta) => {
    // ── Passo de física (imperativo, sem setState) ────────────────────────
    if (!settledRef.current) {
      const next = physicsStep(physNodesRef.current, edgesRef.current, VR_PHYSICS_OPTIONS);
      if (next === physNodesRef.current) {
        settledRef.current = true;
      } else {
        physNodesRef.current = next;
      }
    }

    const curr = physNodesRef.current;
    const { bx, by, spread } = computeBounds(curr);

    // Atualiza posição de cada nó diretamente no Group Three.js
    for (const node of curr) {
      const group = nodeGroupMap.current.get(node.id);
      if (group) {
        group.position.x = ((node.x - bx) / spread) * GRAPH_SCALE;
        group.position.y = GROUP_Y[node.group] ?? 0;
        group.position.z = ((node.y - by) / spread) * GRAPH_SCALE;
      }
    }

    // Atualiza o buffer de arestas (LineSegments)
    const edgeLines = edgeLinesRef.current;
    if (edgeLines) {
      const nodeMap = new Map(curr.map(n => [n.id, n]));
      const posArr: number[] = [];
      const colArr: number[] = [];
      const edgeColor = new THREE.Color(isDarkRef.current ? "#818cf8" : "#6366f1");

      for (const e of edgesRef.current) {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) continue;
        posArr.push(
          ((src.x - bx) / spread) * GRAPH_SCALE, GROUP_Y[src.group] ?? 0, ((src.y - by) / spread) * GRAPH_SCALE,
          ((tgt.x - bx) / spread) * GRAPH_SCALE, GROUP_Y[tgt.group] ?? 0, ((tgt.y - by) / spread) * GRAPH_SCALE,
        );
        colArr.push(edgeColor.r, edgeColor.g, edgeColor.b, edgeColor.r, edgeColor.g, edgeColor.b);
      }

      const geom = edgeLines.geometry;
      const posAttr = geom.getAttribute("position") as THREE.BufferAttribute | undefined;
      if (posAttr && posAttr.array.length === posArr.length) {
        (posAttr.array as Float32Array).set(posArr);
        posAttr.needsUpdate = true;
        const colAttr = geom.getAttribute("color") as THREE.BufferAttribute | undefined;
        if (colAttr) { (colAttr.array as Float32Array).set(colArr); colAttr.needsUpdate = true; }
      } else {
        geom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posArr), 3));
        geom.setAttribute("color",    new THREE.BufferAttribute(new Float32Array(colArr), 3));
      }
    }

    // ── Rotação via joysticks ────────────────────────────────────────────
    if (dragGroupRef.current) {
      dragGroupRef.current.rotation.y = dragRot.current.y;
      dragGroupRef.current.rotation.x = dragRot.current.x;
    }
    if (!localGroupRef.current) return;

    const session = (state.gl as any).xr?.getSession?.() as XRSession | null;
    if (session) {
      for (const source of session.inputSources) {
        const gp = source.gamepad;
        if (!gp) continue;

        if (source.handedness === "right") {
          const ax = gp.axes[2] ?? 0;
          const ay = gp.axes[3] ?? 0;
          if (Math.abs(ax) > STICK_DEAD)
            localGroupRef.current.rotation.y += ax * delta * STICK_SPEED;
          if (Math.abs(ay) > STICK_DEAD)
            localGroupRef.current.rotation.x = Math.max(-0.9, Math.min(0.9,
              localGroupRef.current.rotation.x + ay * delta * STICK_SPEED));
        }

        if (source.handedness === "left") {
          const ax = gp.axes[2] ?? 0;
          const ay = gp.axes[3] ?? 0;
          if (Math.abs(ax) > STICK_DEAD)
            dragRot.current.y -= ax * delta * STICK_SPEED;
          if (Math.abs(ay) > STICK_DEAD)
            dragRot.current.x = Math.max(-0.5, Math.min(0.5,
              dragRot.current.x + ay * delta * STICK_SPEED * 0.5));
        }
      }
    }
  });

  return (
    <group ref={dragGroupRef}>
      <group ref={localGroupRef} position={[GRAPH_CENTER.x, GRAPH_CENTER.y, GRAPH_CENTER.z]}>

        {/* Arestas — LineSegments atualizado imperativamente a cada frame */}
        <lineSegments ref={edgeLinesRef}>
          <bufferGeometry />
          <lineBasicMaterial vertexColors={true} transparent opacity={0.7} />
        </lineSegments>

        {/* Nós */}
        {nodes.map((node) => {
          const initialPos = initialPositions.get(node.id) ?? new THREE.Vector3();
          return (
            <VRNode
              key={node.id}
              node={node}
              initialPos={initialPos}
              isDark={isDark}
              selected={selectedNodeIds.has(node.id)}
              onSelect={onNodeClick}
              localGroupRef={localGroupRef}
              onGroupMount={handleGroupMount}
            />
          );
        })}

      </group>
    </group>
  );
}
