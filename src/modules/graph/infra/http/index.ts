// Default composition of the graph HTTP adapter. Presentation injects this
// singleton (or a fake port in tests) into hooks/use-cases.
import { HttpGraphAdapter } from "./graph-http.adapter";
import type { GraphDataPort } from "../../application/ports/graph-data.port";
import type { GraphAiPort } from "../../application/ports/graph-ai.port";
import type { GraphNodesPort } from "../../application/ports/graph-nodes.port";
import type { GraphDeckPort } from "../../application/ports/graph-deck.port";
import type { StudyPort } from "../../application/ports/study.port";
import type { GraphSubgrafoPort } from "../../application/ports/graph-subgrafo.port";
import type { GraphImportPort } from "../../application/ports/graph-import.port";
import type { GraphEdgesPort } from "../../application/ports/graph-edges.port";
import type { GraphProvaPort } from "../../application/ports/graph-prova.port";
import type { GraphListPort } from "../../application/ports/graph-list.port";

export { HttpGraphAdapter } from "./graph-http.adapter";

export const graphHttp: GraphDataPort &
  GraphAiPort &
  GraphNodesPort &
  GraphDeckPort &
  StudyPort &
  GraphSubgrafoPort &
  GraphImportPort &
  GraphEdgesPort &
  GraphProvaPort &
  GraphListPort = new HttpGraphAdapter();
