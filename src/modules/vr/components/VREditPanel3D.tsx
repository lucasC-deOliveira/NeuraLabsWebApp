"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { graphHttp } from "@/modules/graph/infra/http";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

// ── Constantes de layout ───────────────────────────────────────────────
const W    = 0.60;
const PX   = 0.022;
const PANEL_POS: [number, number, number] = [0.32, 1.50, -0.88];
const KW   = 0.048;
const KH   = 0.032;
const KG   = 0.004;
const RS   = KH + KG;

// Constantes de display (CHAR_W/LINE_H: usados só para click-to-position)
const DISP_FS = 0.013;
const CHAR_W  = 0.0078;
const LINE_H  = DISP_FS * 1.38;

// ── Teclado QWERTY + acentos PT-BR ────────────────────────────────────
const KB_ROWS = [
  ["q","w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","x","c","v","b","n","m"],
  ["ã","ç","á","é","í","ó","ú","â","ê"],
];

// ── Campos editáveis ───────────────────────────────────────────────────
const TIPO_NOTA_OPTS = ["LITERATURA","PERMANENTE","ESTRUTURA"] as const;
const TIPO_NOTA_LBL: Record<string,string> = {
  LITERATURA:"Ref. Literatura", PERMANENTE:"Nota permanente", ESTRUTURA:"Nota de estrutura",
};
const SUBTIPO_OPTS = ["DEFINICAO","EXPLICACAO","EXEMPLO","COMPARACAO","SINTESE","PREREQUISITO","ERRO_COMUM","APLICACAO"] as const;
const SUBTIPO_LBL: Record<string,string> = {
  DEFINICAO:"Definição", EXPLICACAO:"Explicação", EXEMPLO:"Exemplo",
  COMPARACAO:"Comparação", SINTESE:"Síntese", PREREQUISITO:"Pré-requisito",
  ERRO_COMUM:"Erro comum", APLICACAO:"Aplicação",
};

type FType = "text" | "cycle";
type Field = { key: string; label: string; type: FType; opts?: readonly string[]; lbls?: Record<string,string> };

function buildFields(tipo: string): Field[] {
  if (tipo === "FLASHCARD") return [
    { key:"pergunta", label:"Pergunta", type:"text" },
    { key:"resposta", label:"Resposta", type:"text" },
  ];
  if (tipo === "NOTA") return [
    { key:"titulo",   label:"Título",   type:"text" },
    { key:"tipoNota", label:"Tipo",     type:"cycle", opts:TIPO_NOTA_OPTS, lbls:TIPO_NOTA_LBL },
    { key:"subtipo",  label:"Subtipo",  type:"cycle", opts:SUBTIPO_OPTS,   lbls:SUBTIPO_LBL  },
    { key:"conteudo", label:"Conteúdo", type:"text" },
  ];
  if (tipo === "TEXTO_BRUTO") return [
    { key:"titulo", label:"Título", type:"text" },
    { key:"texto",  label:"Texto",  type:"text" },
  ];
  return [
    { key:"nome",     label:"Nome",     type:"text" },
    { key:"descricao",label:"Descrição",type:"text" },
  ];
}

function rowKeyX(row: string[], i: number): number {
  const total = row.length * KW + (row.length - 1) * KG;
  return -total / 2 + KW / 2 + i * (KW + KG);
}

function Btn3D({ x, y, w, h = 0.030, lbl, bg, fg, fs = 0.013, onClick }: {
  x:number; y:number; w:number; h?:number;
  lbl:string; bg:string; fg:string; fs?:number;
  onClick:()=>void;
}) {
  return (
    <group onClick={onClick}>
      <mesh position={[x, y, 0.003]}><planeGeometry args={[w, h]} /><meshBasicMaterial color={bg} /></mesh>
      <Text position={[x, y, 0.004]} fontSize={fs} color={fg} anchorX="center" anchorY="middle">{lbl}</Text>
    </group>
  );
}

// ── Componente principal ───────────────────────────────────────────────
export function VREditPanel3D({
  node, isDark, grafoId, onSuccess, onClose,
}: { node:SimNode; isDark:boolean; grafoId:string; onSuccess:()=>void; onClose:()=>void }) {
  const groupRef      = useRef<THREE.Group>(null);
  const sysInputRef   = useRef<HTMLInputElement | null>(null);
  const kbFieldRef    = useRef<string | null>(null);
  const textRef       = useRef<any>(null);
  const cursorMeshRef = useRef<THREE.Mesh>(null);
  const kbOpenRef     = useRef(false);
  const { camera }    = useThree();

  const tipo   = node.group;
  const fields = buildFields(tipo);

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string|null>(null);
  const [savedOk,      setSavedOk]      = useState(false);
  const [vals,         setVals]         = useState<Record<string,string>>({});
  const [kbField,      setKbField]      = useState<string|null>(null);
  const [cursorPos,    setCursorPos]    = useState(0);
  const [useSystemKb,  setUseSystemKb]  = useState(false);

  kbFieldRef.current = kbField;

  const kbOpen    = kbField !== null;
  kbOpenRef.current = kbOpen;

  // ── Input oculto para teclado do sistema ──────────────────────────
  useEffect(() => {
    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("autocomplete", "off");
    input.style.cssText =
      "position:fixed;opacity:0;pointer-events:none;left:-9999px;top:0;width:1px;height:1px;";
    document.body.appendChild(input);
    sysInputRef.current = input;

    const onSysInput = () => {
      const key = kbFieldRef.current;
      if (!key || !sysInputRef.current) return;
      const newVal = sysInputRef.current.value;
      setVals(prev => ({ ...prev, [key]: newVal }));
      setCursorPos(sysInputRef.current.selectionStart ?? newVal.length);
    };
    input.addEventListener("input", onSysInput);

    return () => {
      input.removeEventListener("input", onSysInput);
      if (document.body.contains(input)) document.body.removeChild(input);
    };
  }, []); // cria uma única vez

  // Reset ao fechar teclado
  useEffect(() => {
    if (!kbOpen) {
      setUseSystemKb(false);
      sysInputRef.current?.blur();
    }
  }, [kbOpen]);

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.quaternion.copy(camera.quaternion);
    if (cursorMeshRef.current) {
      cursorMeshRef.current.visible =
        kbOpenRef.current && Math.floor(clock.getElapsedTime() * 2) % 2 === 0;
    }
  });

  // ── Carrega dados do nó ────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null); setSavedOk(false); setKbField(null);
    graphHttp.getNodeDetails(tipo, node.id)
      .then(d => {
        if (!alive) return;
        if (!d) { setError("Nó não encontrado"); return; }
        const v: Record<string,string> = {};
        for (const f of fields) v[f.key] = String(d[f.key as keyof typeof d] ?? "");
        setVals(v);
      })
      .catch(() => { if (alive) setError("Erro ao carregar"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, tipo]);

  const kbActiveField = fields.find(f => f.key === kbField) ?? null;
  const kbVal         = kbField ? (vals[kbField] ?? "") : "";

  // Abre teclado para um campo
  const openKb = (key: string) => {
    setKbField(key);
    setCursorPos((vals[key] ?? "").length);
    setUseSystemKb(false);
  };

  // Ativa o teclado do sistema (foca input oculto → Meta Quest mostra teclado nativo)
  const activateSysKb = () => {
    setUseSystemKb(true);
    if (!sysInputRef.current || !kbField) return;
    sysInputRef.current.value = kbVal;
    requestAnimationFrame(() => {
      if (!sysInputRef.current) return;
      sysInputRef.current.setSelectionRange(cursorPos, cursorPos);
      sysInputRef.current.focus();
    });
  };

  const deactivateSysKb = () => {
    setUseSystemKb(false);
    sysInputRef.current?.blur();
  };

  // ── Edição de texto ────────────────────────────────────────────────
  const appendChar = (ch: string) => {
    if (!kbField) return;
    const pos = cursorPos;
    setVals(v => {
      const cur = v[kbField] ?? "";
      return { ...v, [kbField]: cur.slice(0, pos) + ch + cur.slice(pos) };
    });
    setCursorPos(pos + 1);
  };

  const backspace = () => {
    if (!kbField || cursorPos === 0) return;
    const pos = cursorPos;
    setVals(v => {
      const cur = v[kbField] ?? "";
      return { ...v, [kbField]: cur.slice(0, pos - 1) + cur.slice(pos) };
    });
    setCursorPos(pos - 1);
  };

  const cycleOpt = (key: string, dir: 1|-1) => {
    const f = fields.find(f2 => f2.key === key);
    if (!f?.opts) return;
    const arr = [...f.opts];
    const cur = vals[key] ?? arr[0];
    const i   = arr.indexOf(cur);
    setVals(v => ({ ...v, [key]: arr[(i + dir + arr.length) % arr.length] }));
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const v = vals;
      if (tipo === "FLASHCARD") {
        await graphHttp.updateGraphNode("FLASHCARD", node.id, { pergunta: v.pergunta?.trim(), resposta: v.resposta?.trim() }, grafoId);
      } else if (tipo === "NOTA") {
        await graphHttp.updateGraphNode("NOTA", node.id, { titulo: v.titulo?.trim(), tipoNota: v.tipoNota, subtipo: v.subtipo || undefined, conteudo: v.conteudo?.trim() }, grafoId);
      } else if (tipo === "TEXTO_BRUTO") {
        await graphHttp.updateGraphNode("TEXTO_BRUTO", node.id, { titulo: v.titulo?.trim(), texto: v.texto?.trim() }, grafoId);
      } else {
        await graphHttp.updateGraphNode(tipo, node.id, { nome: v.nome?.trim(), descricao: v.descricao?.trim() || null }, grafoId);
      }
      setKbField(null);
      setSavedOk(true);
      setTimeout(onSuccess, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // ── Paleta de cores ────────────────────────────────────────────────
  const bg    = isDark ? "#18181b" : "#f9f9f9";
  const text  = isDark ? "#f4f4f5" : "#18181b";
  const muted = isDark ? "#a1a1aa" : "#71717a";
  const track = isDark ? "#3f3f46" : "#d4d4d8";
  const accent = "#6366f1";
  const barW   = W - PX * 2;

  // ── Layout top-down ────────────────────────────────────────────────
  const H = 0.50; // aumentado para acomodar toggle VR/Sistema
  let cur = H / 2 - 0.026;

  const yHdr = cur; cur -= 0.032;
  const ySp1 = cur; cur -= 0.013;
  cur -= 0.006;
  const contentTop = cur; // 0.173

  // Lista de campos (modo sem teclado aberto)
  const FH = 0.052;
  const FG = 0.005;
  const fieldYs: number[] = [];
  let fCur = contentTop;
  for (let i = 0; i < fields.length; i++) {
    fieldYs.push(fCur - FH / 2);
    fCur -= FH;
    if (i < fields.length - 1) fCur -= FG;
  }
  const listSaveY = fCur - 0.010 - 0.016;

  // Modo teclado: toggle → display → sep → teclado/hint
  const TGL_H = 0.028;
  const yToggle = contentTop - TGL_H / 2;
  const tglW    = (barW - KG) / 2;   // largura de cada botão do toggle
  const tglLX   = -barW / 2 + tglW / 2;
  const tglRX   =  barW / 2 - tglW / 2;

  const DISP_H  = 0.052;
  let kbCur     = contentTop - TGL_H - 0.004; // após toggle
  const yKbDisp = kbCur - DISP_H / 2; kbCur -= DISP_H;
  kbCur -= 0.006;
  const ySp2    = kbCur; kbCur -= 0.013;
  kbCur -= 0.006;
  const kbTop   = kbCur;
  // Posição do save: abaixo de todo o teclado VR (usado em ambos os modos de teclado)
  const kbSaveY = kbTop - (KB_ROWS.length + 1) * RS - KH / 2 - 0.008 - 0.016;

  const ySave = kbOpen ? kbSaveY : listSaveY;

  const TX = -barW / 2 + PX + 0.004;
  const TY = yKbDisp + DISP_H / 2 - 0.008;

  const MAX_LINE_CHARS = Math.floor((barW - PX * 2) / CHAR_W);
  const WIN_SIZE       = MAX_LINE_CHARS * 3;
  const winStart       = Math.max(0, cursorPos - WIN_SIZE + 20);
  const winText        = kbVal.slice(winStart, winStart + WIN_SIZE);
  const adjCursor      = cursorPos - winStart;

  const dispText = winText || " ";

  // Sincroniza posição da mesh do cursor com os caretPositions do troika.
  // Formato real (de selectionUtils.js): [leftX, rightX, bottomY, topY] por caractere.
  // Caret na posição adj: adj < n → leftX de chars[adj]; adj == n → rightX de chars[n-1].
  useEffect(() => {
    let raf: number;
    const trySync = () => {
      const carets = textRef.current?.textRenderInfo?.caretPositions as Float32Array | null | undefined;
      if (!cursorMeshRef.current) return;
      if (!carets || carets.length === 0) { raf = requestAnimationFrame(trySync); return; }
      const n   = Math.floor(carets.length / 4);
      const adj = Math.max(0, adjCursor);
      let cx: number, cy: number;
      if (n === 0) {
        cx = 0; cy = -DISP_FS / 2;
      } else if (adj >= n) {
        // cursor após o último char
        cx = carets[(n - 1) * 4 + 1];
        cy = (carets[(n - 1) * 4 + 2] + carets[(n - 1) * 4 + 3]) / 2;
      } else {
        // cursor antes do char adj (leftX = posição do caret entre adj-1 e adj)
        cx = carets[adj * 4];
        cy = (carets[adj * 4 + 2] + carets[adj * 4 + 3]) / 2;
      }
      cursorMeshRef.current.position.x = TX + cx;
      cursorMeshRef.current.position.y = TY + cy;
      cursorMeshRef.current.position.z = 0.005;
    };
    raf = requestAnimationFrame(trySync);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursorPos, kbVal, kbOpen]);

  // Click no display → reposiciona cursor
  const onDisplayClick = (evt: { stopPropagation?: () => void; point: THREE.Vector3 }) => {
    evt.stopPropagation?.();
    if (!groupRef.current || !kbField) return;
    const lp   = groupRef.current.worldToLocal(evt.point.clone());
    const relX = Math.max(0, lp.x - TX);
    const relY = Math.max(0, TY - lp.y);
    const line = Math.floor(relY / LINE_H);
    const col  = Math.round(relX / CHAR_W);
    setCursorPos(Math.min(kbVal.length, winStart + line * MAX_LINE_CHARS + col));
    // Se estava em modo sistema, volta para VR ao clicar no display
    if (useSystemKb) deactivateSysKb();
  };

  // Linha especial do teclado: ◀  ⌫  ESPAÇO  ▶  ✓
  const SW = [0.060, 0.060, barW - 4 * 0.060 - 4 * KG, 0.060, 0.060] as const;
  let sxAcc = -barW / 2;
  const SX = SW.map(w => { const x = sxAcc + w / 2; sxAcc += w + KG; return x; });

  return (
    <group ref={groupRef} position={PANEL_POS}>
      {/* Border + fundo */}
      <mesh position={[0,0,0]}><planeGeometry args={[W+0.006,H+0.006]} /><meshBasicMaterial color={accent} /></mesh>
      <mesh position={[0,0,0.001]}><planeGeometry args={[W,H]} /><meshBasicMaterial color={bg} /></mesh>

      {/* ── Header ─────────────────────────────────────────────── */}
      {!kbOpen ? (
        <>
          <Text position={[-W/2+PX, yHdr, 0.002]} fontSize={0.012} color={accent} anchorX="left" anchorY="middle">EDITAR</Text>
          <Text position={[0, yHdr, 0.002]} fontSize={0.014} color={text} anchorX="center" anchorY="middle" maxWidth={W-0.14}>{node.label}</Text>
        </>
      ) : (
        <>
          <group onClick={() => setKbField(null)}>
            <mesh position={[-W/2+0.040, yHdr, 0.003]}><planeGeometry args={[0.066,0.026]} /><meshBasicMaterial color={track} /></mesh>
            <Text position={[-W/2+0.040, yHdr, 0.004]} fontSize={0.013} color={text} anchorX="center" anchorY="middle">← lista</Text>
          </group>
          <Text position={[0.012, yHdr, 0.002]} fontSize={0.013} color={accent} anchorX="center" anchorY="middle">{kbActiveField?.label.toUpperCase()}</Text>
        </>
      )}
      <group onClick={onClose}>
        <mesh position={[W/2-0.028, yHdr, 0.003]}><planeGeometry args={[0.038,0.026]} /><meshBasicMaterial color={track} /></mesh>
        <Text position={[W/2-0.028, yHdr, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">✕</Text>
      </group>
      <mesh position={[0, ySp1, 0.002]}><planeGeometry args={[barW,0.0015]} /><meshBasicMaterial color={track} /></mesh>

      {loading && <Text position={[0,0,0.002]} fontSize={0.016} color={muted} anchorX="center" anchorY="middle">Carregando…</Text>}
      {!loading && error && <Text position={[0,0.010,0.002]} fontSize={0.013} color="#ef4444" anchorX="center" anchorY="middle">{error}</Text>}

      {!loading && !error && (
        <>
          {!kbOpen ? (
            /* ── Modo lista: todos os campos ────────────────────── */
            <>
              {fields.map((f, i) => {
                const fy  = fieldYs[i];
                const val = vals[f.key] ?? "";

                if (f.type === "text") {
                  const preview = val.length > 34 ? val.slice(0, 33) + "…" : val;
                  return (
                    <group key={f.key} onClick={() => openKb(f.key)}>
                      <mesh position={[0, fy, 0.002]}><planeGeometry args={[barW, FH]} /><meshBasicMaterial color={isDark ? "#27272a" : "#f0f0f0"} /></mesh>
                      <Text position={[-barW/2+PX, fy+FH/2-0.010, 0.003]} fontSize={0.010} color={muted} anchorX="left" anchorY="middle">{f.label}</Text>
                      <Text position={[-barW/2+PX, fy-FH/2+0.012, 0.003]} fontSize={0.013} color={val ? text : muted} anchorX="left" anchorY="middle" maxWidth={barW-PX*2-0.030}>
                        {preview || "(vazio — clique para editar)"}
                      </Text>
                      <Text position={[barW/2-0.018, fy, 0.003]} fontSize={0.019} color={accent} anchorX="center" anchorY="middle">✎</Text>
                    </group>
                  );
                }

                const curVal = val || (f.opts?.[0] ?? "");
                const lbl    = f.lbls?.[curVal] ?? curVal;
                return (
                  <group key={f.key}>
                    <mesh position={[0, fy, 0.002]}><planeGeometry args={[barW, FH]} /><meshBasicMaterial color={isDark ? "#27272a" : "#f0f0f0"} /></mesh>
                    <Text position={[-barW/2+PX, fy+FH/2-0.010, 0.003]} fontSize={0.010} color={muted} anchorX="left" anchorY="middle">{f.label}</Text>
                    <group onClick={() => cycleOpt(f.key, -1)}>
                      <mesh position={[-barW/2+PX+0.020, fy-0.002, 0.003]}><planeGeometry args={[0.036, FH-0.014]} /><meshBasicMaterial color={accent} /></mesh>
                      <Text position={[-barW/2+PX+0.020, fy-0.002, 0.004]} fontSize={0.018} color="#fff" anchorX="center" anchorY="middle">◀</Text>
                    </group>
                    <Text position={[0, fy-0.002, 0.003]} fontSize={0.013} color={text} anchorX="center" anchorY="middle" maxWidth={barW-0.130}>{lbl}</Text>
                    <group onClick={() => cycleOpt(f.key, 1)}>
                      <mesh position={[barW/2-PX-0.020, fy-0.002, 0.003]}><planeGeometry args={[0.036, FH-0.014]} /><meshBasicMaterial color={accent} /></mesh>
                      <Text position={[barW/2-PX-0.020, fy-0.002, 0.004]} fontSize={0.018} color="#fff" anchorX="center" anchorY="middle">▶</Text>
                    </group>
                  </group>
                );
              })}
            </>
          ) : (
            /* ── Modo teclado ────────────────────────────────────── */
            <>
              {/* Toggle VR / Sistema */}
              <group onClick={deactivateSysKb}>
                <mesh position={[tglLX, yToggle, 0.002]}><planeGeometry args={[tglW, TGL_H]} /><meshBasicMaterial color={useSystemKb ? track : accent} /></mesh>
                <Text position={[tglLX, yToggle, 0.003]} fontSize={0.012} color={useSystemKb ? muted : "#fff"} anchorX="center" anchorY="middle">Teclado VR</Text>
              </group>
              <group onClick={activateSysKb}>
                <mesh position={[tglRX, yToggle, 0.002]}><planeGeometry args={[tglW, TGL_H]} /><meshBasicMaterial color={useSystemKb ? accent : track} /></mesh>
                <Text position={[tglRX, yToggle, 0.003]} fontSize={0.012} color={useSystemKb ? "#fff" : muted} anchorX="center" anchorY="middle">Teclado Sistema</Text>
              </group>

              {/* Display clicável */}
              <mesh position={[0, yKbDisp, 0.002]} onClick={onDisplayClick}>
                <planeGeometry args={[barW, DISP_H]} />
                <meshBasicMaterial color={isDark ? "#27272a" : "#f0f0f0"} />
              </mesh>
              <Text
                ref={textRef}
                position={[TX, TY, 0.003]}
                fontSize={DISP_FS} color={text}
                anchorX="left" anchorY="top"
                maxWidth={barW - PX * 2} lineHeight={1.38}
              >
                {dispText}
              </Text>
              {/* Cursor piscante — posicionado pelos caretPositions do troika */}
              <mesh ref={cursorMeshRef} visible={false} position={[TX, TY, 0.005]}>
                <planeGeometry args={[0.0018, DISP_FS * 1.15]} />
                <meshBasicMaterial color={accent} />
              </mesh>

              <mesh position={[0, ySp2, 0.002]}><planeGeometry args={[barW,0.0015]} /><meshBasicMaterial color={track} /></mesh>

              {useSystemKb ? (
                /* ── Modo Sistema: instruções + cursor pelo sistema ── */
                <Text
                  position={[0, kbTop - 0.040, 0.003]}
                  fontSize={0.014} color={muted} anchorX="center" anchorY="middle"
                >
                  {"Teclado Meta Quest ativo\nDigite no controlador ou aponte"}
                </Text>
              ) : (
                /* ── Modo VR: teclado QWERTY desenhado ─────────────── */
                <>
                  {KB_ROWS.map((row, ri) => {
                    const ry = kbTop - ri * RS - KH / 2;
                    return row.map((ch, ci) => (
                      <group key={ch} onClick={() => appendChar(ch)}>
                        <mesh position={[rowKeyX(row, ci), ry, 0.003]}><planeGeometry args={[KW, KH]} /><meshBasicMaterial color={track} /></mesh>
                        <Text position={[rowKeyX(row, ci), ry, 0.004]} fontSize={0.017} color={text} anchorX="center" anchorY="middle">{ch}</Text>
                      </group>
                    ));
                  })}
                  {/* Linha especial: ◀  ⌫  ESPAÇO  ▶  ✓ */}
                  {(() => {
                    const ry = kbTop - KB_ROWS.length * RS - KH / 2;
                    const specs = [
                      { lbl:"◀",     bg:track,     fg:text,   fs:0.016, fn:() => setCursorPos(p => Math.max(0, p-1)) },
                      { lbl:"⌫",     bg:"#ef4444", fg:"#fff", fs:0.016, fn:backspace },
                      { lbl:"ESPAÇO",bg:track,     fg:text,   fs:0.011, fn:() => appendChar(" ") },
                      { lbl:"▶",     bg:track,     fg:text,   fs:0.016, fn:() => setCursorPos(p => Math.min(kbVal.length, p+1)) },
                      { lbl:"✓",     bg:"#22c55e", fg:"#fff", fs:0.018, fn:() => setKbField(null) },
                    ];
                    return specs.map((s, i) => (
                      <Btn3D key={s.lbl} x={SX[i]} y={ry} w={SW[i]} h={KH} lbl={s.lbl} bg={s.bg} fg={s.fg} fs={s.fs} onClick={s.fn} />
                    ));
                  })()}
                </>
              )}
            </>
          )}

          {/* ── Botão Salvar — sempre ao fundo ──────────────────── */}
          {savedOk ? (
            <Text position={[0, ySave, 0.003]} fontSize={0.018} color="#22c55e" anchorX="center" anchorY="middle">✓ Salvo!</Text>
          ) : (
            <Btn3D x={0} y={ySave} w={barW} h={0.032}
              lbl={saving ? "Salvando…" : "Salvar tudo"}
              bg={saving ? track : "#22c55e"} fg="#fff" fs={0.014}
              onClick={saving ? () => {} : handleSave} />
          )}
        </>
      )}
    </group>
  );
}
