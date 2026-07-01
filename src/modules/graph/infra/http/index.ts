// Default composition of the graph HTTP adapter. Presentation injects this
// singleton (or a fake port in tests) into hooks/use-cases.
import { HttpGraphAdapter } from "./graph-http.adapter";
import type { GraphDataPort } from "../../application/ports/graph-data.port";
import type { GraphAiPort } from "../../application/ports/graph-ai.port";
import type { GraphNodesPort } from "../../application/ports/graph-nodes.port";

export { HttpGraphAdapter } from "./graph-http.adapter";

export const graphHttp: GraphDataPort & GraphAiPort & GraphNodesPort = new HttpGraphAdapter();
