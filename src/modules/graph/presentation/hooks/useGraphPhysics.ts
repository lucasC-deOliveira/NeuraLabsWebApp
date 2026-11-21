"use client";

import { useCallback, useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { createGraphMotionBudget } from "../services/graph-motion-budget";
import { relaxGraphMotion } from "../services/relax-graph-motion";
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
  /** Minimum time between simulation steps when rendering large graphs. */
  frameIntervalMs?: number;
  settleSteps?: number;
  shouldWakeOnPointerUp?: () => boolean;
  onSettled?: () => void;
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
type PhysicsTick = (settled: { current: boolean }, gain: number) => void;
type PhysicsPacing = Pick<Props<PhysicsNode>, "frameIntervalMs" | "settleSteps" | "shouldWakeOnPointerUp" | "onSettled">;

// Loop de animação da física ambiente. Para quando o grafo estabiliza e reinicia
// num pointerup (usuário soltou um nó arrastado).
function runPhysicsLoop(step: PhysicsTick, pointerDown: MutableRefObject<boolean>, pacing: PhysicsPacing): () => void {
  const budget = createGraphMotionBudget(pacing.settleSteps);
  const settled = { current: false };
  let raf = 0;
  let lastStep = -Infinity;
  const tick = (now: number): void => {
    raf = 0;
    if (!pointerDown.current && now - lastStep >= (pacing.frameIntervalMs ?? 0)) {
      lastStep = now;
      const gain = budget.nextGain();
      if (gain === undefined) return pacing.onSettled?.();
      step(settled, gain);
    }
    if (settled.current) pacing.onSettled?.();
    else raf = requestAnimationFrame(tick);
  };
  const wake = (): void => { budget.reheat(); settled.current = false; lastStep = -Infinity; raf ||= requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return listenForPhysicsWake(() => cancelAnimationFrame(raf), wake, pacing.shouldWakeOnPointerUp);
}

function listenForPhysicsWake(cancel: () => void, wake: () => void, shouldWake?: () => boolean): () => void {
  const onPointerUp = (): void => { if (!shouldWake || shouldWake()) wake(); };
  window.addEventListener("pointerup", onPointerUp);
  return (): void => {
    cancel();
    window.removeEventListener("pointerup", onPointerUp);
  };
}

function usePhysicsTick<T extends PhysicsNode>(props: Props<T>): PhysicsTick {
  const { setLayout, edges, hiddenIds = EMPTY_IDS } = props;
  const options = props.options ?? DEFAULT_CLUSTER_OPTIONS;
  const edgesRef = useRef(edges);
  const optionsRef = useRef(options);
  const hiddenRef = useRef(hiddenIds);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { optionsRef.current = options; }, [options]);
  useEffect(() => { hiddenRef.current = hiddenIds; }, [hiddenIds]);
  return useCallback<PhysicsTick>((settled, gain): void => {
    setLayout((prev) => {
      const next = stepVisible(prev, edgesRef.current, optionsRef.current, hiddenRef.current);
      settled.current = next === prev;
      return relaxGraphMotion(prev, next, gain);
    });
  }, [setLayout]);
}

export function useGraphPhysics<T extends PhysicsNode>(props: Props<T>): void {
  const { enabled, options, restartKey, frameIntervalMs, settleSteps, shouldWakeOnPointerUp, onSettled } = props;
  const pointerDown = useRef(false);
  const step = usePhysicsTick(props);
  useEffect(() => trackPointerDown(pointerDown), []);
  useEffect(() => {
    if (!enabled) return;
    return runPhysicsLoop(step, pointerDown, { frameIntervalMs, settleSteps, shouldWakeOnPointerUp, onSettled });
  }, [enabled, step, restartKey, options, frameIntervalMs, settleSteps, shouldWakeOnPointerUp, onSettled]);
}
