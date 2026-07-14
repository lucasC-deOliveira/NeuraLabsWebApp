"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  physicsStep,
  DEFAULT_CLUSTER_OPTIONS,
  type PhysicsEdge,
  type PhysicsOptions,
} from "../services/graph-physics.service";

type PhysicsNode = { id: string; x: number; y: number };

type Props<T extends PhysicsNode> = {
  enabled: boolean;
  setLayout: Dispatch<SetStateAction<T[]>>;
  edges: PhysicsEdge[];
  options?: PhysicsOptions;
  /** Incrementar para reiniciar a física (ex.: vault-watch trouxe novos nós) */
  restartKey?: number;
  /** ids de nós ocultos nas camadas: ficam parados e não exercem/recebem força */
  hiddenIds?: Set<string>;
};

const EMPTY_IDS: Set<string> = new Set();

// Marca pointerDown enquanto o usuário mantém o ponteiro pressionado (arrastando um nó).
function trackPointerDown(pointerDown: MutableRefObject<boolean>): () => void {
  const down = (): void => { pointerDown.current = true; };
  const up = (): void => { pointerDown.current = false; };
  window.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  return (): void => {
    window.removeEventListener("pointerdown", down);
    window.removeEventListener("pointerup", up);
  };
}

/**
 * Um passo da física considerando só os nós visíveis: os ocultos (camadas) ficam
 * parados e não exercem/recebem força. Devolve a MESMA referência quando nada se
 * move (para o loop detectar `settled`). Pura — testável sem o loop de animação.
 * @example stepVisible(nodes, edges, opts, new Set(["hiddenId"]))
 */
export function stepVisible<T extends PhysicsNode>(
  prev: T[],
  edges: PhysicsEdge[],
  options: PhysicsOptions,
  hidden: Set<string>,
): T[] {
  if (hidden.size === 0) return physicsStep(prev, edges, options);
  const visible = prev.filter((n) => !hidden.has(n.id));
  const stepped = physicsStep(visible, edges, options);
  if (stepped === visible) return prev;
  const byId = new Map<string, T>(stepped.map((n): [string, T] => [n.id, n]));
  return prev.map((n) => byId.get(n.id) ?? n);
}

// Um passo no loop; marca `settled` quando nada se move (mesma ref devolvida).
function stepInto<T extends PhysicsNode>(
  prev: T[],
  edgesRef: MutableRefObject<PhysicsEdge[]>,
  optionsRef: MutableRefObject<PhysicsOptions>,
  settled: { current: boolean },
  hiddenRef: MutableRefObject<Set<string>>,
): T[] {
  const next = stepVisible(prev, edgesRef.current, optionsRef.current, hiddenRef.current);
  settled.current = next === prev;
  return next;
}

// Loop de animação da física ambiente. Para quando o grafo estabiliza e reinicia
// num pointerup (usuário soltou um nó arrastado).
function runPhysicsLoop<T extends PhysicsNode>(setLayout: Dispatch<SetStateAction<T[]>>, edgesRef: MutableRefObject<PhysicsEdge[]>, optionsRef: MutableRefObject<PhysicsOptions>, pointerDown: MutableRefObject<boolean>, hiddenRef: MutableRefObject<Set<string>>): () => void {
  const settled = { current: false };
  let raf = 0;
  const schedule = (): void => { raf = requestAnimationFrame(tick); };
  const tick = (): void => {
    raf = 0;
    if (!pointerDown.current) setLayout((prev) => stepInto(prev, edgesRef, optionsRef, settled, hiddenRef));
    if (!settled.current) schedule();
  };
  const onPointerUp = (): void => { settled.current = false; if (raf === 0) schedule(); };
  window.addEventListener("pointerup", onPointerUp);
  schedule();
  return (): void => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointerup", onPointerUp);
  };
}

export function useGraphPhysics<T extends PhysicsNode>(props: Props<T>): void {
  const { enabled, setLayout, edges, restartKey = 0, hiddenIds = EMPTY_IDS } = props;
  const options = props.options ?? DEFAULT_CLUSTER_OPTIONS;
  const pointerDown = useRef(false);
  const edgesRef = useRef(edges);
  const optionsRef = useRef(options);
  const hiddenRef = useRef(hiddenIds);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => { hiddenRef.current = hiddenIds; }, [hiddenIds]);
  useEffect(() => trackPointerDown(pointerDown), []);
  useEffect(() => {
    if (!enabled) return;
    return runPhysicsLoop(setLayout, edgesRef, optionsRef, pointerDown, hiddenRef);
  }, [enabled, setLayout, restartKey]);
}
