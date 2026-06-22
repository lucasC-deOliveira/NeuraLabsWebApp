// Port para acesso ao "agora" — injetado para tornar use-cases determináveis em teste.
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');
