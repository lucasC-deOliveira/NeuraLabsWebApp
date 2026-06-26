import { InvalidEdgeWeightError } from '../errors';

// EdgeWeight — relation strength in (0, 2]. Value Object: validates on creation.
export class EdgeWeight {
  static readonly DEFAULT = 1;

  private constructor(readonly value: number) {}

  static create(value: number): EdgeWeight {
    if (!Number.isFinite(value) || value <= 0 || value > 2) {
      throw new InvalidEdgeWeightError(value);
    }
    return new EdgeWeight(value);
  }

  static default(): EdgeWeight {
    return new EdgeWeight(EdgeWeight.DEFAULT);
  }
}
