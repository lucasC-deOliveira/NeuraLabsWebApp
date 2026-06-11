"use client";

import { useEffect, useRef } from "react";
import {
  physicsStep,
  type PhysicsEdge,
} from "../services/graph-physics.service";

type Props<T extends { id: string; x: number; y: number }> = {
  enabled: boolean;
  setLayout: React.Dispatch<React.SetStateAction<T[]>>;
  edges: PhysicsEdge[];
};

// Loop de animação da física ambiente. Pausa enquanto qualquer ponteiro
// está pressionado para não brigar com drag/pan/marquee.
export function useGraphPhysics<T extends { id: string; x: number; y: number }>({
  enabled,
  setLayout,
  edges,
}: Props<T>) {
  const pointerDown = useRef(false);
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

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

    let raf = 0;

    const tick = () => {
      if (!pointerDown.current) {
        setLayout((prev) => physicsStep(prev, edgesRef.current));
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, setLayout]);
}
