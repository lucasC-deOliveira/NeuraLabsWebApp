// Graph domain errors with context — the interface layer maps them to HTTP
// responses with user-facing (Portuguese) messages.

export class GraphNodesNotFoundError extends Error {
  constructor() {
    super('One or both nodes were not found in the graph.');
    this.name = 'GraphNodesNotFoundError';
  }
}

export class EdgeNotFoundError extends Error {
  constructor(edgeId: string) {
    super(`Edge not found: "${edgeId}".`);
    this.name = 'EdgeNotFoundError';
  }
}

export class DuplicateEdgeError extends Error {
  constructor() {
    super('An edge with this relation already exists between these nodes.');
    this.name = 'DuplicateEdgeError';
  }
}

export class RelationNotAllowedError extends Error {
  constructor(
    readonly sourceType: string,
    readonly targetType: string,
    readonly relation: string,
    readonly allowed: string[],
  ) {
    super(`Relation "${relation}" not allowed between ${sourceType} and ${targetType}.`);
    this.name = 'RelationNotAllowedError';
  }
}

export class InvalidEdgeWeightError extends Error {
  constructor(readonly value: number) {
    super(`Invalid edge weight: "${value}". Expected a number in (0, 2].`);
    this.name = 'InvalidEdgeWeightError';
  }
}

export class GraphNotFoundError extends Error {
  constructor() {
    super('Graph not found.');
    this.name = 'GraphNotFoundError';
  }
}

export class NodeNotInGraphError extends Error {
  constructor() {
    super('Node not found in the graph.');
    this.name = 'NodeNotInGraphError';
  }
}

export class RootNodeError extends Error {
  constructor() {
    super('The graph root subject cannot be removed; it is deleted with the graph.');
    this.name = 'RootNodeError';
  }
}
