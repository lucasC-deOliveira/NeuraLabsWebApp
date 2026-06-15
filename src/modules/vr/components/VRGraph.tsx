"use client";

import React, { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { NODE_TYPE_COLORS } from "@/modules/graph/constants/graph-ui.constants";
import { getRelationColor } from "@/modules/graph/presentation/services/graph-style.service";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";

const GRAPH_CENTER = new THREE.Vector3(0, 1.5, -1.5);
const GRAPH_SCALE  = 1.4;
const STICK_DEAD   = 0.15;
const STICK_SPEED  = 1.8;

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

function computePositions(nodes: SimNode[]): Map<string, THREE.Vector3> {
  if (!nodes.length) return new Map();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
    if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const spread = Math.max(maxX - minX, maxY - minY) || 1;
  return new Map(nodes.map((n) => [n.id, new THREE.Vector3(
    ((n.x - cx) / spread) * GRAPH_SCALE,
    GROUP_Y[n.group] ?? 0,
    ((n.y - cy) / spread) * GRAPH_SCALE,
  )]));
}

// ── Edge ─────────────────────────────────────────────────────────────────────
function EdgeCylinder({ start, end, color }: { start: THREE.Vector3; end: THREE.Vector3; color: string }) {
  const { mid, quat, length } = useMemo(() => {
    const dir = end.clone().sub(start);
    const len = dir.length();
    return {
      length: len,
      mid: start.clone().add(end).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
    };
  }, [start, end]);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.005, 0.005, length, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

function EdgeLabel({ position, label, color, localGroupRef }: {
  position: THREE.Vector3; label: string; color: string;
  localGroupRef: React.RefObject<THREE.Group | null>;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current && localGroupRef.current)
      ref.current.quaternion.copy(localGroupRef.current.quaternion).invert();
  });
  return (
    <group ref={ref} position={[position.x, position.y + 0.028, position.z]}>
      <Text fontSize={0.018} color={color} anchorX="center" anchorY="middle" outlineWidth={0.002} outlineColor="#000000">
        {label}
      </Text>
    </group>
  );
}

// ── Geometria por tipo ────────────────────────────────────────────────────────
function NodeGeo({ cfg }: { cfg: GeoConfig }) {
  if (cfg.shape === "sphere" || cfg.shape === "ellipsoid")
    return <sphereGeometry args={[cfg.r, 32, 24]} />;
  return <boxGeometry args={[cfg.w, cfg.h, cfg.d]} />;
}

// ── Nó ───────────────────────────────────────────────────────────────────────
function VRNode({ node, position, isDark, selected, onSelect, localGroupRef }: {
  node: SimNode; position: THREE.Vector3; isDark: boolean;
  selected: boolean; onSelect: (n: SimNode) => void;
  localGroupRef: React.RefObject<THREE.Group | null>;
}) {
  const pulseRef = useRef<THREE.Group>(null);
  const labelRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const cfg    = GROUP_GEO[node.group] ?? ({ shape: "box" as const, w: 0.09, h: 0.07, d: 0.07 });
  const colors = getNodeColors(node.group, isDark);
  const labelY = LABEL_Y[node.group] ?? 0.09;

  const meshScale   = cfg.shape === "ellipsoid" ? new THREE.Vector3(cfg.sx, cfg.sy, cfg.sz) : new THREE.Vector3(1, 1, 1);
  const borderScale = cfg.shape === "ellipsoid" ? new THREE.Vector3(cfg.sx * 1.09, cfg.sy * 1.09, cfg.sz * 1.09) : new THREE.Vector3(1.09, 1.09, 1.09);

  useFrame(({ clock }) => {
    if (pulseRef.current)
      pulseRef.current.scale.setScalar(selected ? 1 + Math.sin(clock.getElapsedTime() * 3) * 0.07 : 1);
    if (labelRef.current && localGroupRef.current)
      labelRef.current.quaternion.copy(localGroupRef.current.quaternion).invert();
  });

  return (
    <group position={position}>
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
  const dragGroupRef = useRef<THREE.Group>(null);
  const dragRot      = useRef({ x: 0, y: 0 });
  const localGroupRef = useRef<THREE.Group>(null);

  const positions = useMemo(() => computePositions(nodes), [nodes]);

  useFrame((state, delta) => {
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

  const edgeData = useMemo(() => edges.flatMap((e) => {
    const src = positions.get(e.source);
    const tgt = positions.get(e.target);
    if (!src || !tgt) return [];
    return [{ key: `${e.source}>${e.target}`, start: src.clone(), end: tgt.clone(), type: e.type, label: e.label }];
  }), [edges, positions]);

  return (
    <group ref={dragGroupRef}>
      <group ref={localGroupRef} position={[GRAPH_CENTER.x, GRAPH_CENTER.y, GRAPH_CENTER.z]}>
        {edgeData.map((ed) => (
          <EdgeCylinder key={ed.key} start={ed.start} end={ed.end} color={getRelationColor(ed.type, isDark)} />
        ))}
        {edgeData.map((ed) => {
          if (!ed.label) return null;
          const mid = ed.start.clone().add(ed.end).multiplyScalar(0.5);
          return (
            <EdgeLabel key={ed.key + "-l"} position={mid} label={ed.label} color={getRelationColor(ed.type, isDark)} localGroupRef={localGroupRef} />
          );
        })}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <VRNode
              key={node.id}
              node={node}
              position={pos}
              isDark={isDark}
              selected={selectedNodeIds.has(node.id)}
              onSelect={onNodeClick}
              localGroupRef={localGroupRef}
            />
          );
        })}
      </group>
    </group>
  );
}
