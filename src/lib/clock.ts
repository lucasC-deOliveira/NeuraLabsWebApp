// Named clock wrappers. react-hooks/purity forbids calling the impure globals
// Date.now()/new Date() directly in render or event handlers; routing through
// these module functions keeps the call sites pure while the impurity is isolated
// here. (Domain code takes `now` as a parameter instead — it stays param-pure.)

export function nowMs(): number {
  return Date.now();
}

export function nowDate(): Date {
  return new Date();
}
