// Read port: the set of concept referenciaIds covered by editais (COBRE edges) of a
// graph. When editalId is given, only that edital's coverage; otherwise every edital's
// (aggregated) — since a graph may hold more than one edital.
export interface EditalCoverageSource {
  load(userId: string, grafoId: string, editalId?: string): Promise<Set<string>>;
}

export const EDITAL_COVERAGE_SOURCE = Symbol('EDITAL_COVERAGE_SOURCE');
