import { describe, it, expect } from 'vitest';
import { assertValidSubgraphRelation, isSubgraphRelation } from './subgraph';
import { InvalidSubgraphRelationError } from '../errors';

describe('subgraph relations', () => {
  it('recognizes a valid relation', () => {
    expect(isSubgraphRelation('PREREQUISITO')).toBe(true);
  });

  it('rejects an unknown relation', () => {
    expect(isSubgraphRelation('CONTEM')).toBe(false);
  });

  it('asserts and throws on an invalid relation', () => {
    expect(() => assertValidSubgraphRelation('NOPE')).toThrow(InvalidSubgraphRelationError);
  });

  it('asserts without throwing on a valid relation', () => {
    expect(() => assertValidSubgraphRelation('APROFUNDA')).not.toThrow();
  });
});
