// Port for accessing "now" — injected to make use-cases deterministic in tests.
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');
