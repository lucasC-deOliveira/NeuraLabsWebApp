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
  worker: Worker,
  nodes: SimNode[],
  edges: PhysicsEdge[],
  options: PhysicsOptions,
  maxIters: number,
): Promise<SimNode[]> {
  return new Promise((resolve) => {
    const fallback = (): void => {
      worker.terminate();
      resolve(presettleLayout(nodes, edges, options, maxIters));
    };
    worker.onmessage = (event: MessageEvent<SimNode[]>): void => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = fallback; // worker quebrou (ex.: file:// bloqueou o módulo)
    worker.postMessage({ nodes, edges, options, maxIters });
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
): Promise<SimNode[]> {
  const worker = typeof Worker === "undefined" ? null : spawnWorker();
  if (!worker) return Promise.resolve(presettleLayout(nodes, edges, options, maxIters));
  return inWorker(worker, nodes, edges, options, maxIters);
}
