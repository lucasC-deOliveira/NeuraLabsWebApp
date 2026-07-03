"use client";

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import {
  physicsStep,
  DEFAULT_PHYSICS_OPTIONS,
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
};

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

// Um passo da física; marca `settled` quando physicsStep devolve a mesma ref (nada se moveu).
function stepInto<T extends PhysicsNode>(
  prev: T[],
  edgesRef: MutableRefObject<PhysicsEdge[]>,
  optionsRef: MutableRefObject<PhysicsOptions>,
  settled: { current: boolean },
): T[] {
  const next = physicsStep(prev, edgesRef.current, optionsRef.current);
  settled.current = next === prev;
  return next;
}

// Loop de animação da física ambiente. Para quando o grafo estabiliza e reinicia
// num pointerup (usuário soltou um nó arrastado).
function runPhysicsLoop<T extends PhysicsNode>(setLayout: Dispatch<SetStateAction<T[]>>, edgesRef: MutableRefObject<PhysicsEdge[]>, optionsRef: MutableRefObject<PhysicsOptions>, pointerDown: MutableRefObject<boolean>): () => void {
  const settled = { current: false };
  let raf = 0;
  const schedule = (): void => { raf = requestAnimationFrame(tick); };
  const tick = (): void => {
    raf = 0;
    if (!pointerDown.current) setLayout((prev) => stepInto(prev, edgesRef, optionsRef, settled));
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

export function useGraphPhysics<T extends PhysicsNode>({
  enabled,
  setLayout,
  edges,
  options = DEFAULT_PHYSICS_OPTIONS,
  restartKey = 0,
}: Props<T>): void {
  const pointerDown = useRef(false);
  const edgesRef = useRef(edges);
  const optionsRef = useRef(options);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => trackPointerDown(pointerDown), []);
  useEffect(() => {
    if (!enabled) return;
    return runPhysicsLoop(setLayout, edgesRef, optionsRef, pointerDown);
  }, [enabled, setLayout, restartKey]);
}
