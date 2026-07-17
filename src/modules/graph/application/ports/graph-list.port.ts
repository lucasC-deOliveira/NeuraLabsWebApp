// Port for the "my graphs" list page: list/create/delete grafos over the HTTP
// edge. Only infra/ implements it (ACL over @/lib/graph-api).
import type { GraphListParams, GraphListResult, GraphAssunto } from "../../domain/types/graph.types";

export interface GraphListPort {
  listUserGraphs(params?: GraphListParams): Promise<GraphListResult>;
  listGraphAssuntos(): Promise<GraphAssunto[]>;
  createGrafo(nome: string, descricao?: string): Promise<{ id: string }>;
  deleteGrafo(grafoId: string): Promise<void>;
}
