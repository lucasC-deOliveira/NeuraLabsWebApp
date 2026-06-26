import { describe, it, expect } from 'vitest';
import { EdgeWeight } from './edge-weight';
import { InvalidEdgeWeightError } from '../errors';

describe('EdgeWeight', () => {
  it('creates a weight within (0, 2]', () => {
    expect(EdgeWeight.create(0.5).value).toBe(0.5);
    expect(EdgeWeight.create(2).value).toBe(2);
  });

  it('defaults to 1', () => {
    expect(EdgeWeight.default().value).toBe(1);
  });

  it('rejects values outside (0, 2]', () => {
    expect(() => EdgeWeight.create(0)).toThrowError(InvalidEdgeWeightError);
    expect(() => EdgeWeight.create(-1)).toThrowError(InvalidEdgeWeightError);
    expect(() => EdgeWeight.create(2.1)).toThrowError(InvalidEdgeWeightError);
    expect(() => EdgeWeight.create(Number.NaN)).toThrowError(InvalidEdgeWeightError);
  });
});
