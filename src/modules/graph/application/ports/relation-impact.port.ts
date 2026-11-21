export interface RelationImpactGraph {
  id: string;
  name: string;
}

export interface RelationEndpoints {
  source: string;
  target: string;
}

export type LoadRelationImpact = (endpoints: RelationEndpoints) => Promise<RelationImpactGraph[]>;
