"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { getNodeDetails, getDeckForStudy } from "@/lib/graph-api";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

const W    = 0.60;
const PX   = 0.022;
const PANEL_POS: [number, number, number] = [0.32, 1.50, -0.88];
const LINES = 5;
const LH    = 0.018; // height per line
const TH    = LINES * LH; // text area height
const BH    = TH + 0.010; // box height (with vertical padding)
const CPL   = 58; // chars per line for manual pagination

type Card = { id: string; pergunta: string; resposta: string };

function Btn3D({ x, y, w, h = 0.030, label, bg, color, fs = 0.013, onClick }: {
  x: number; y: number; w: number; h?: number;
  label: string; bg: string; color: string; fs?: number;
  onClick: () => void;
}) {
  return (
    <group onClick={onClick}>
      <mesh position={[x, y, 0.003]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={bg} /></mesh>
      <Text position={[x, y, 0.004]} fontSize={fs} color={color} anchorX="center" anchorY="middle">{label}</Text>
    </group>
  );
}

function splitText(raw: string): string[] {
  const lines: string[] = [];
  for (const line of raw.replace(/[#*_`>]/g, "").split("\n")) {
    if (!line.trim()) continue;
    for (let i = 0; i < Math.max(1, line.length); i += CPL)
      lines.push(line.slice(i, i + CPL));
  }
  return lines.length ? lines : [""];
}

export function VRStudyPanel3D({
  node, isDark, onClose,
}: { node: SimNode; isDark: boolean; onClose: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => { if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion); });

  const [loading,  setLoading]  = useState(true);
  const [cards,    setCards]    = useState<Card[]>([]);
  const [idx,      setIdx]      = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [pp,       setPp]       = useState(0);
  const [rp,       setRp]       = useState(0);

  useEffect(() => {
    let ok = true;
    setLoading(true); setIdx(0); setRevealed(false); setError(null);
    (async () => {
      if (node.group === "FLASHCARD") {
        const d = await getNodeDetails("FLASHCARD", node.id);
        if (ok) d ? setCards([{ id: node.id, pergunta: d.pergunta ?? "", resposta: d.resposta ?? "" }])
                  : setError("Flashcard não encontrado");
      } else {
        const deck = await getDeckForStudy(node.id);
        if (ok) { const c = deck?.cards ?? []; setCards(c); if (!c.length) setError("Baralho vazio"); }
      }
    })().catch(() => { if (ok) setError("Erro ao carregar"); }).finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id, node.group]);

  const card   = cards[idx];
  const isLast = idx >= cards.length - 1;
  const goNext = useCallback(() => {
    if (isLast) { onClose(); return; }
    setIdx(i => i + 1); setRevealed(false); setPp(0); setRp(0);
  }, [isLast, onClose]);

  const bg    = isDark ? "#18181b" : "#f9f9f9";
  const text  = isDark ? "#f4f4f5" : "#18181b";
  const muted = isDark ? "#a1a1aa" : "#71717a";
  const track = isDark ? "#3f3f46" : "#d4d4d8";
  const barW  = W - PX * 2;
  const H     = 0.46;

  // Layout top-down
  let cur = H / 2 - 0.026;
  const yHdr = cur; cur -= 0.032;
  const ySp1 = cur; cur -= 0.013;
  cur -= 0.006;
  const yPLbl = cur; cur -= 0.016;
  cur -= 0.004;
  const yPBoxCtr = cur - BH / 2; cur -= BH;
  cur -= 0.008;
  const ySp2 = cur; cur -= 0.013;
  cur -= 0.006;
  const yRBoxCtr = cur - BH / 2; cur -= BH;
  cur -= 0.008;
  const yBtn  = cur - 0.030 / 2; cur -= 0.030;
  cur -= 0.006;
  const yProg = cur;

  const pLines  = card ? splitText(card.pergunta) : [];
  const rLines  = card ? splitText(card.resposta)  : [];
  const pPages  = Math.max(1, Math.ceil(pLines.length / LINES));
  const rPages  = Math.max(1, Math.ceil(rLines.length / LINES));
  const pChunk  = pLines.slice(pp * LINES, (pp + 1) * LINES).join("\n");
  const rChunk  = rLines.slice(rp * LINES, (rp + 1) * LINES).join("\n");

  return (
    <group ref={groupRef} position={PANEL_POS}>
      <mesh position={[0, 0, 0]}><planeGeometry args={[W+0.006, H+0.006]} /><meshBasicMaterial color="#22c55e" /></mesh>
      <mesh position={[0, 0, 0.001]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={bg} /></mesh>

      {/* Header */}
      <Text position={[-W/2+PX, yHdr, 0.002]} fontSize={0.012} color="#22c55e" anchorX="left" anchorY="middle">ESTUDAR</Text>
      <Text position={[0, yHdr, 0.002]} fontSize={0.015} color={text} anchorX="center" anchorY="middle" maxWidth={W-0.14}>
        {node.label}
      </Text>
      <group onClick={onClose}>
        <mesh position={[W/2-0.028, yHdr, 0.003]}><planeGeometry args={[0.038, 0.026]} /><meshBasicMaterial color={track} /></mesh>
        <Text position={[W/2-0.028, yHdr, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
      </group>

      <mesh position={[0, ySp1, 0.002]}><planeGeometry args={[barW, 0.0015]} /><meshBasicMaterial color={track} /></mesh>

      {loading && (
        <Text position={[0, 0, 0.002]} fontSize={0.016} color={muted} anchorX="center" anchorY="middle">Carregando…</Text>
      )}
      {!loading && error && (
        <Text position={[0, 0, 0.002]} fontSize={0.014} color="#ef4444" anchorX="center" anchorY="middle">{error}</Text>
      )}

      {!loading && !error && card && (
        <>
          {/* Pergunta label + page nav */}
          <Text position={[-W/2+PX, yPLbl, 0.002]} fontSize={0.011} color={muted} anchorX="left" anchorY="middle">PERGUNTA</Text>
          {pPages > 1 && (
            <>
              {pp > 0 && <Btn3D x={W/2-PX-0.060} y={yPLbl} w={0.028} h={0.014} label="◀" bg={track} color={text} fs={0.010} onClick={() => setPp(p => p-1)} />}
              <Text position={[W/2-PX-0.028, yPLbl, 0.002]} fontSize={0.010} color={muted} anchorX="center" anchorY="middle">{`${pp+1}/${pPages}`}</Text>
              {pp < pPages-1 && <Btn3D x={W/2-PX-0.006} y={yPLbl} w={0.028} h={0.014} label="▶" bg={track} color={text} fs={0.010} onClick={() => setPp(p => p+1)} />}
            </>
          )}

          {/* Pergunta box */}
          <mesh position={[0, yPBoxCtr, 0.002]}><planeGeometry args={[barW, BH]} /><meshBasicMaterial color={isDark ? "#27272a" : "#f0f0f0"} /></mesh>
          <Text
            position={[-W/2+PX+0.006, yPBoxCtr+BH/2-0.006, 0.003]}
            fontSize={0.013} color={text} anchorX="left" anchorY="top"
            maxWidth={barW-0.012} lineHeight={1.35}
          >
            {pChunk}
          </Text>

          <mesh position={[0, ySp2, 0.002]}><planeGeometry args={[barW, 0.0015]} /><meshBasicMaterial color={track} /></mesh>

          {/* Resposta area */}
          {!revealed ? (
            <Btn3D x={0} y={yRBoxCtr} w={barW} h={BH} label="Ver resposta" bg="#6366f1" color="#fff" fs={0.016}
              onClick={() => { setRevealed(true); setRp(0); }} />
          ) : (
            <>
              {rPages > 1 && (
                <>
                  {rp > 0 && <Btn3D x={W/2-PX-0.060} y={yPLbl-(yPLbl-ySp2)-0.006} w={0.028} h={0.014} label="◀" bg={track} color={text} fs={0.010} onClick={() => setRp(p => p-1)} />}
                  <Text position={[W/2-PX-0.028, yRBoxCtr+BH/2+0.008, 0.002]} fontSize={0.010} color={muted} anchorX="center" anchorY="middle">{`${rp+1}/${rPages}`}</Text>
                  {rp < rPages-1 && <Btn3D x={W/2-PX-0.006} y={yRBoxCtr+BH/2+0.008} w={0.028} h={0.014} label="▶" bg={track} color={text} fs={0.010} onClick={() => setRp(p => p+1)} />}
                </>
              )}
              <mesh position={[0, yRBoxCtr, 0.002]}><planeGeometry args={[barW, BH]} /><meshBasicMaterial color={isDark ? "#1e1b4b" : "#eef2ff"} /></mesh>
              <Text
                position={[-W/2+PX+0.006, yRBoxCtr+BH/2-0.006, 0.003]}
                fontSize={0.013} color={isDark ? "#c7d2fe" : "#312e81"} anchorX="left" anchorY="top"
                maxWidth={barW-0.012} lineHeight={1.35}
              >
                {rChunk}
              </Text>
            </>
          )}

          {revealed && (
            <Btn3D x={0} y={yBtn} w={barW} h={0.030}
              label={isLast ? "✓ Concluir" : "Próxima →"} bg="#22c55e" color="#fff" fs={0.014}
              onClick={goNext} />
          )}

          {cards.length > 1 && (
            <Text position={[0, yProg, 0.002]} fontSize={0.012} color={muted} anchorX="center" anchorY="middle">
              {`${idx+1} / ${cards.length}`}
            </Text>
          )}
        </>
      )}
    </group>
  );
}
