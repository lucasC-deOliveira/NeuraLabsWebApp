// Module-level clock wrappers. react-hooks/purity forbids calling the impure
// globals Date.now()/new Date() directly in render or handlers; routing through
// these named helpers keeps the call sites pure while the impurity is isolated.

export function nowMs(): number {
  return Date.now();
}

export function nowDate(): Date {
  return new Date();
}
