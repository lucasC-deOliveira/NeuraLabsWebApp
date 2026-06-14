"use client";

import { useEffect, useRef } from "react";
import {
  physicsStep,
  DEFAULT_PHYSICS_OPTIONS,
  type PhysicsEdge,
  type PhysicsOptions,
} from "../services/graph-physics.service";

type Props<T extends { id: string; x: number; y: number }> = {
  enabled: boolean;
  setLayout: React.Dispatch<React.SetStateAction<T[]>>;
  edges: PhysicsEdge[];
  options?: PhysicsOptions;
};

// Loop de animação da física ambiente.
// Para automaticamente quando o grafo estabiliza (physicsStep devolve a mesma
// referência) e volta ao rodar quando o usuário arrasta um nó (pointerup).
export function useGraphPhysics<T extends { id: string; x: number; y: number }>({
  enabled,
  setLayout,
  edges,
  options = DEFAULT_PHYSICS_OPTIONS,
}: Props<T>) {
  const pointerDown = useRef(false);
  const edgesRef = useRef(edges);
  const optionsRef = useRef(options);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { optionsRef.current = options; }, [options]);

  useEffect(() => {
    const down = () => { pointerDown.current = true; };
    const up = () => { pointerDown.current = false; };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // settled.current: true quando physicsStep devolveu a mesma referência
    // (nenhum nó se moveu) — o RAF para e aguarda um pointerup para reiniciar.
    const settled = { current: false };
    let raf = 0;

    const schedule = () => { raf = requestAnimationFrame(tick); };

    const tick = () => {
      raf = 0;
      if (!pointerDown.current) {
        setLayout((prev) => {
          const next = physicsStep(prev, edgesRef.current, optionsRef.current);
          // physicsStep devolve `prev` (mesma ref) quando nada se moveu
          settled.current = next === prev;
          return next;
        });
      }
      if (!settled.current) {
        schedule();
      }
      // se estabilizou: RAF para; reiniciado pelo pointerup abaixo
    };

    // reinicia a física depois que o usuário solta um nó arrastado
    const onPointerUp = () => {
      settled.current = false;
      if (raf === 0) schedule();
    };

    window.addEventListener("pointerup", onPointerUp);
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [enabled, setLayout]);
}
