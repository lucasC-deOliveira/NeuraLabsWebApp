// Web worker: roda o pre-settle da física FORA da main thread para a UI não
// congelar enquanto o layout de um grafo novo/que cresceu é montado. Recebe os
// nós/arestas, devolve o layout assentado. A lógica é a mesma função pura usada no
// caminho síncrono de fallback (run-presettle) — aqui só entra o protocolo de mensagem.
import { presettleLayout } from "../services/presettle-layout";
import type { PhysicsEdge, PhysicsOptions } from "../services/graph-physics.service";
import type { SimNode } from "../../infra/layout/force-layout.engine";

interface PresettleRequest {
  nodes: SimNode[];
  edges: PhysicsEdge[];
  options: PhysicsOptions;
  maxIters: number;
}

const ctx = self as unknown as Worker;

ctx.onmessage = (event: MessageEvent<PresettleRequest>): void => {
  const { nodes, edges, options, maxIters } = event.data;
  ctx.postMessage(presettleLayout(nodes, edges, options, maxIters));
};
