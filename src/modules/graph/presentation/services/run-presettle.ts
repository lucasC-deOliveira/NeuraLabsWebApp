// Pré-assenta o layout FORA da main thread quando há Web Worker; senão cai no
// cálculo síncrono. Assim a montagem de um grafo grande não congela a UI (o overlay
// "montando o layout" segue animando). Fallback cobre: ambiente sem Worker (testes),
// falha de construção e erro de carregamento do módulo (ex.: file:// no Electron).
import { presettleLayout } from "./presettle-layout";
import type { PhysicsEdge, PhysicsOptions } from "./graph-physics.service";
import type { SimNode } from "../../infra/layout/force-layout.engine";

function spawnWorker(): Worker | null {
  try {
    return new Worker(new URL("../workers/presettle.worker.ts", import.meta.url));
  } catch {
    return null; // ambiente sem bundler de worker ou protocolo que bloqueia o módulo
  }
}

function inWorker(
  worker: Worker, nodes: SimNode[], edges: PhysicsEdge[], options: PhysicsOptions, maxIters: number,
  execution?: PresettleExecution,
): Promise<SimNode[]> {
  return new Promise((resolve) => {
    const cleanup = (): void => {
      execution?.signal.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = (): void => { cleanup(); resolve(nodes); };
    const fallback = (): void => { cleanup(); resolve(runFallback(nodes, edges, options, maxIters, execution)); };
    worker.onmessage = (event: MessageEvent<SimNode[]>): void => { cleanup(); resolve(event.data); };
    worker.onerror = fallback; // worker quebrou (ex.: file:// bloqueou o módulo)
    execution?.signal.addEventListener("abort", abort, { once: true });
    try { worker.postMessage({ nodes, edges, options, maxIters }); }
    catch { fallback(); }
  });
}

interface PresettleExecution {
  signal: AbortSignal;
}

function runFallback(
  nodes: SimNode[], edges: PhysicsEdge[], options: PhysicsOptions, maxIters: number,
  execution?: PresettleExecution,
): Promise<SimNode[]> {
  if (!execution) return Promise.resolve(presettleLayout(nodes, edges, options, maxIters));
  return new Promise((resolve) => {
    let layout = nodes;
    let remaining = maxIters;
    const step = (): void => {
      if (execution.signal.aborted || remaining <= 0) return resolve(layout);
      const next = presettleLayout(layout, edges, options, 1);
      if (next === layout) return resolve(layout);
      layout = next;
      remaining -= 1;
      setTimeout(step, 0);
    };
    setTimeout(step, 0);
  });
}

/**
 * Assenta o layout em background (worker) com fallback síncrono transparente.
 * @example const targets = await runPresettle(nodes, edges, options, 1200);
 */
export function runPresettle(
  nodes: SimNode[],
  edges: PhysicsEdge[],
  options: PhysicsOptions,
  maxIters: number,
  execution?: PresettleExecution,
): Promise<SimNode[]> {
  if (execution?.signal.aborted) return Promise.resolve(nodes);
  const worker = typeof Worker === "undefined" ? null : spawnWorker();
  if (!worker) return runFallback(nodes, edges, options, maxIters, execution);
  return inWorker(worker, nodes, edges, options, maxIters, execution);
}
