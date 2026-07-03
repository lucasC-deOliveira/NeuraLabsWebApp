// Port (application boundary) for importing a graph payload over the HTTP edge.
// Only infra/ implements it (ACL over @/lib/graph-api). No React, no @/lib here.
import type { ImportGraphPayload } from "../../domain/types/graph-import.types";

export interface GraphImportPort {
  importGraph(
    grafoId: string,
    payload: ImportGraphPayload,
  ): Promise<{ nodes: number; edges: number; reused: number }>;
}
