"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { graphHttp } from "@/modules/graph/infra/http";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

const W    = 0.60;
const PX   = 0.022;
const PANEL_POS: [number, number, number] = [0.32, 1.50, -0.88];
const LINES = 6;
const LH    = 0.018;
const TH    = LINES * LH;
const BH    = TH + 0.010;
const CPL   = 58;
const CARDS_PER_PAGE = 6;

type Card = { id: string; pergunta: string; resposta: string };

const TIPO_NOTA_MAP: Record<string, string> = {
  LITERATURA: "Ref. Literatura", PERMANENTE: "Nota permanente", ESTRUTURA: "Nota de estrutura",
};
const SUBTIPO_MAP: Record<string, string> = {
  DEFINICAO: "Definição", EXPLICACAO: "Explicação", EXEMPLO: "Exemplo",
  COMPARACAO: "Comparação", SINTESE: "Síntese", PREREQUISITO: "Pré-requisito",
  ERRO_COMUM: "Erro comum", APLICACAO: "Aplicação",
};

function Btn3D({ x, y, w, h = 0.028, label, bg, color, fs = 0.012, onClick }: {
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

export function VRContentPanel3D({
  node, isDark, onClose,
}: { node: SimNode; isDark: boolean; onClose: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => { if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion); });

  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [page,    setPage]    = useState(0);

  // BARALHO
  const [cards,    setCards]    = useState<Card[]>([]);
  const [cardPage, setCardPage] = useState(0);

  // NOTA / TEXTO_BRUTO / FLASHCARD
  const [title,     setTitle]    = useState("");
  const [body,      setBody]     = useState("");
  const [body2,     setBody2]    = useState(""); // resposta for FLASHCARD
  const [metaBadge, setMeta]     = useState("");

  useEffect(() => {
    let ok = true;
    setLoading(true); setError(null); setPage(0); setCardPage(0);
    (async () => {
      const g = node.group;
      if (g === "BARALHO") {
        const deck = await graphHttp.getDeckForStudy(node.id);
        if (ok) setCards(deck?.cards ?? []);
      } else if (g === "NOTA") {
        const d = await graphHttp.getNodeDetails("NOTA", node.id);
        if (ok && d) {
          setTitle(d.titulo ?? node.label);
          const tipo = TIPO_NOTA_MAP[d.tipoNota ?? ""] ?? d.tipoNota ?? "";
          const sub  = SUBTIPO_MAP[d.subtipo ?? ""]  ?? d.subtipo  ?? "";
          setMeta([tipo, sub].filter(Boolean).join(" · "));
          setBody(d.conteudo ?? "");
        }
      } else if (g === "FLASHCARD") {
        const d = await graphHttp.getNodeDetails("FLASHCARD", node.id);
        if (ok && d) { setTitle(node.label); setBody(d.pergunta ?? ""); setBody2(d.resposta ?? ""); }
      } else if (g === "TEXTO_BRUTO") {
        const d = await graphHttp.getNodeDetails("TEXTO_BRUTO", node.id);
        if (ok && d) { setTitle(d.titulo ?? node.label); setBody(d.texto ?? ""); }
      }
    })().catch(() => { if (ok) setError("Erro ao carregar"); }).finally(() => { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [node.id, node.group, node.label]);

  const bg    = isDark ? "#18181b" : "#f9f9f9";
  const text  = isDark ? "#f4f4f5" : "#18181b";
  const muted = isDark ? "#a1a1aa" : "#71717a";
  const track = isDark ? "#3f3f46" : "#d4d4d8";
  const accent = "#6366f1";
  const barW  = W - PX * 2;

  // ── BARALHO layout ──────────────────────────────────
  if (!loading && !error && node.group === "BARALHO") {
    const H = 0.50;
    let cur = H / 2 - 0.026;
    const yHdr = cur; cur -= 0.032;
    const ySp1 = cur; cur -= 0.013;
    cur -= 0.006;
    const yCount = cur; cur -= 0.020;
    cur -= 0.004;
    const yListTop = cur;

    const ROW_H = 0.036;
    const pageCards = cards.slice(cardPage * CARDS_PER_PAGE, (cardPage + 1) * CARDS_PER_PAGE);
    const totalPages = Math.max(1, Math.ceil(cards.length / CARDS_PER_PAGE));
    const yNavRow = yListTop - Math.max(1, pageCards.length) * ROW_H - 0.012;

    return (
      <group ref={groupRef} position={PANEL_POS}>
        <mesh position={[0, 0, 0]}><planeGeometry args={[W+0.006, H+0.006]} /><meshBasicMaterial color={accent} /></mesh>
        <mesh position={[0, 0, 0.001]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={bg} /></mesh>

        <Text position={[-W/2+PX, yHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">BARALHO</Text>
        <Text position={[0, yHdr, 0.002]} fontSize={0.015} color={text} anchorX="center" anchorY="middle" maxWidth={W-0.14}>{node.label}</Text>
        <group onClick={onClose}>
          <mesh position={[W/2-0.028, yHdr, 0.003]}><planeGeometry args={[0.038, 0.026]} /><meshBasicMaterial color={track} /></mesh>
          <Text position={[W/2-0.028, yHdr, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
        </group>
        <mesh position={[0, ySp1, 0.002]}><planeGeometry args={[barW, 0.0015]} /><meshBasicMaterial color={track} /></mesh>

        <Text position={[-W/2+PX, yCount, 0.002]} fontSize={0.013} color={muted} anchorX="left" anchorY="middle">
          {`${cards.length} flashcard${cards.length !== 1 ? "s" : ""}`}
        </Text>

        {cards.length === 0 && (
          <Text position={[0, yListTop-0.040, 0.002]} fontSize={0.013} color={muted} anchorX="center" anchorY="middle">
            Baralho sem flashcards.
          </Text>
        )}

        {pageCards.map((c, i) => {
          const ry = yListTop - i * ROW_H - ROW_H / 2;
          const num = cardPage * CARDS_PER_PAGE + i + 1;
          const truncated = c.pergunta.replace(/[#*_`>]/g, "").trim().slice(0, 65);
          return (
            <group key={c.id}>
              <mesh position={[0, ry, 0.002]}>
                <planeGeometry args={[barW, ROW_H - 0.004]} />
                <meshBasicMaterial color={isDark ? "#27272a" : "#f4f4f5"} />
              </mesh>
              <Text position={[-W/2+PX+0.006, ry, 0.003]} fontSize={0.012} color={muted} anchorX="left" anchorY="middle">
                {`${num}.`}
              </Text>
              <Text position={[-W/2+PX+0.026, ry, 0.003]} fontSize={0.012} color={text} anchorX="left" anchorY="middle" maxWidth={barW-0.034}>
                {truncated.length < c.pergunta.trim().length ? truncated + "…" : truncated}
              </Text>
            </group>
          );
        })}

        {totalPages > 1 && (
          <>
            {cardPage > 0 && <Btn3D x={-barW/4} y={yNavRow} w={barW/2-0.004} label="◀ Anterior" bg={track} color={text} onClick={() => setCardPage(p => p-1)} />}
            {cardPage < totalPages-1 && <Btn3D x={barW/4} y={yNavRow} w={barW/2-0.004} label="Próxima ▶" bg={track} color={text} onClick={() => setCardPage(p => p+1)} />}
          </>
        )}
      </group>
    );
  }

  // ── FLASHCARD layout ─────────────────────────────────
  if (!loading && !error && node.group === "FLASHCARD") {
    const SH = BH; // single box height
    const H  = 0.026 + 0.032 + 0.013 + 0.006 + SH + 0.008 + 0.013 + 0.006 + SH + 0.026 + 0.010;
    let cur  = H / 2 - 0.026;
    const yHdr = cur; cur -= 0.032;
    const ySp1 = cur; cur -= 0.013;
    cur -= 0.006;
    const yPLbl = cur; cur -= 0.016;
    const yPBox = cur - SH / 2; cur -= SH;
    cur -= 0.008;
    const ySp2 = cur; cur -= 0.013;
    cur -= 0.006;
    const yRLbl = cur; cur -= 0.016;
    const yRBox = cur - SH / 2; cur -= SH;

    const pLines = splitText(body);
    const rLines = splitText(body2);
    const pPages = Math.max(1, Math.ceil(pLines.length / LINES));
    const rPages = Math.max(1, Math.ceil(rLines.length / LINES));
    const [pp, setPageP] = [page, (n: number) => setPage(n)];

    return (
      <group ref={groupRef} position={PANEL_POS}>
        <mesh position={[0, 0, 0]}><planeGeometry args={[W+0.006, H+0.006]} /><meshBasicMaterial color={accent} /></mesh>
        <mesh position={[0, 0, 0.001]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={bg} /></mesh>

        <Text position={[-W/2+PX, yHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">FLASHCARD</Text>
        <Text position={[0, yHdr, 0.002]} fontSize={0.015} color={text} anchorX="center" anchorY="middle" maxWidth={W-0.14}>{title}</Text>
        <group onClick={onClose}>
          <mesh position={[W/2-0.028, yHdr, 0.003]}><planeGeometry args={[0.038, 0.026]} /><meshBasicMaterial color={track} /></mesh>
          <Text position={[W/2-0.028, yHdr, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
        </group>
        <mesh position={[0, ySp1, 0.002]}><planeGeometry args={[barW, 0.0015]} /><meshBasicMaterial color={track} /></mesh>

        <Text position={[-W/2+PX, yPLbl, 0.002]} fontSize={0.011} color={muted} anchorX="left" anchorY="middle">PERGUNTA</Text>
        <mesh position={[0, yPBox, 0.002]}><planeGeometry args={[barW, SH]} /><meshBasicMaterial color={isDark ? "#27272a" : "#f0f0f0"} /></mesh>
        <Text position={[-W/2+PX+0.006, yPBox+SH/2-0.006, 0.003]} fontSize={0.013} color={text} anchorX="left" anchorY="top" maxWidth={barW-0.012} lineHeight={1.35}>
          {pLines.slice(0, LINES).join("\n")}
        </Text>
        {pPages > 1 && <Text position={[W/2-PX, yPLbl, 0.002]} fontSize={0.010} color={muted} anchorX="right" anchorY="middle">{`(+${pLines.length - LINES} linhas)`}</Text>}

        <mesh position={[0, ySp2, 0.002]}><planeGeometry args={[barW, 0.0015]} /><meshBasicMaterial color={track} /></mesh>

        <Text position={[-W/2+PX, yRLbl, 0.002]} fontSize={0.011} color="#818cf8" anchorX="left" anchorY="middle">RESPOSTA</Text>
        <mesh position={[0, yRBox, 0.002]}><planeGeometry args={[barW, SH]} /><meshBasicMaterial color={isDark ? "#1e1b4b" : "#eef2ff"} /></mesh>
        <Text position={[-W/2+PX+0.006, yRBox+SH/2-0.006, 0.003]} fontSize={0.013} color={isDark ? "#c7d2fe" : "#312e81"} anchorX="left" anchorY="top" maxWidth={barW-0.012} lineHeight={1.35}>
          {rLines.slice(0, LINES).join("\n")}
        </Text>
        {rPages > 1 && <Text position={[W/2-PX, yRLbl, 0.002]} fontSize={0.010} color={muted} anchorX="right" anchorY="middle">{`(+${rLines.length - LINES} linhas)`}</Text>}
      </group>
    );
  }

  // ── NOTA / TEXTO_BRUTO layout (paginated text) ──────
  const bodyLines = splitText(body);
  const totalPages = Math.max(1, Math.ceil(bodyLines.length / LINES));
  const chunk = bodyLines.slice(page * LINES, (page + 1) * LINES).join("\n");

  const H = 0.46;
  let cur = H / 2 - 0.026;
  const yHdr = cur; cur -= 0.032;
  const ySp1 = cur; cur -= 0.013;
  cur -= 0.006;
  const yMeta = metaBadge ? cur : 0; if (metaBadge) cur -= 0.018;
  cur -= 0.004;
  const yBodyBox = cur - BH / 2; cur -= BH;
  cur -= 0.010;
  const yNav = cur;

  return (
    <group ref={groupRef} position={PANEL_POS}>
      <mesh position={[0, 0, 0]}><planeGeometry args={[W+0.006, H+0.006]} /><meshBasicMaterial color={accent} /></mesh>
      <mesh position={[0, 0, 0.001]}><planeGeometry args={[W, H]} /><meshBasicMaterial color={bg} /></mesh>

      <Text position={[-W/2+PX, yHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">
        {node.group === "NOTA" ? "NOTA" : "TEXTO BRUTO"}
      </Text>
      <Text position={[0, yHdr, 0.002]} fontSize={0.015} color={text} anchorX="center" anchorY="middle" maxWidth={W-0.14}>
        {title || node.label}
      </Text>
      <group onClick={onClose}>
        <mesh position={[W/2-0.028, yHdr, 0.003]}><planeGeometry args={[0.038, 0.026]} /><meshBasicMaterial color={track} /></mesh>
        <Text position={[W/2-0.028, yHdr, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
      </group>
      <mesh position={[0, ySp1, 0.002]}><planeGeometry args={[barW, 0.0015]} /><meshBasicMaterial color={track} /></mesh>

      {loading && <Text position={[0, 0, 0.002]} fontSize={0.016} color={muted} anchorX="center" anchorY="middle">Carregando…</Text>}
      {!loading && error && <Text position={[0, 0, 0.002]} fontSize={0.014} color="#ef4444" anchorX="center" anchorY="middle">{error}</Text>}

      {!loading && !error && (
        <>
          {metaBadge && (
            <Text position={[0, yMeta, 0.002]} fontSize={0.012} color={muted} anchorX="center" anchorY="middle">{metaBadge}</Text>
          )}

          <mesh position={[0, yBodyBox, 0.002]}><planeGeometry args={[barW, BH]} /><meshBasicMaterial color={isDark ? "#27272a" : "#f0f0f0"} /></mesh>
          <Text
            position={[-W/2+PX+0.006, yBodyBox+BH/2-0.006, 0.003]}
            fontSize={0.013} color={text} anchorX="left" anchorY="top"
            maxWidth={barW-0.012} lineHeight={1.35}
          >
            {chunk || "(sem conteúdo)"}
          </Text>

          {totalPages > 1 && (
            <>
              <Text position={[0, yNav, 0.002]} fontSize={0.011} color={muted} anchorX="center" anchorY="middle">{`${page+1} / ${totalPages}`}</Text>
              {page > 0 && <Btn3D x={-barW/4} y={yNav-0.020} w={barW/2-0.006} label="◀ Anterior" bg={track} color={text} onClick={() => setPage(p => p-1)} />}
              {page < totalPages-1 && <Btn3D x={barW/4} y={yNav-0.020} w={barW/2-0.006} label="Próxima ▶" bg={track} color={text} onClick={() => setPage(p => p+1)} />}
            </>
          )}
        </>
      )}
    </group>
  );
}
