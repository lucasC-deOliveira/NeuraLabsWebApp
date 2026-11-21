import { useEffect, useRef, useState } from "react";
import type { RelationImpactGraph } from "../../application/ports/relation-impact.port";

interface ConfirmationRequest {
  title: string;
  description?: string;
  action: string;
  destructive?: boolean;
  affectedGraphs?: RelationImpactGraph[];
}

export interface GraphConfirmationState {
  request: ConfirmationRequest | null;
  ask: (request: ConfirmationRequest) => Promise<boolean>;
  finish: (accepted: boolean) => void;
}

/** Prompts inside the graph window so Electron keeps keyboard focus.
 * @example if (await confirmation.ask({ title: "Excluir relação?", action: "Excluir" })) await remove()
 */
export function useGraphConfirmation(): GraphConfirmationState {
  const [request, setRequest] = useState<ConfirmationRequest | null>(null);
  const pending = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => (): void => pending.current?.(false), []);
  const finish = (accepted: boolean): void => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    resolve?.(accepted);
  };
  const ask = (next: ConfirmationRequest): Promise<boolean> => new Promise((resolve) => {
    pending.current?.(false);
    pending.current = resolve;
    setRequest(next);
  });
  return { request, ask, finish };
}
