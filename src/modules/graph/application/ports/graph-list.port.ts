// Port for the "my graphs" list page: list/create/delete grafos over the HTTP
// edge. Only infra/ implements it (ACL over @/lib/graph-api).
import type { GrafoInfo } from "../../domain/types/graph.types";

export interface GraphListPort {
  listUserGraphs(): Promise<GrafoInfo[]>;
  createGrafo(nome: string, descricao?: string): Promise<{ id: string }>;
  deleteGrafo(grafoId: string, options?: { keepTypes?: string[] }): Promise<void>;
}
