import { useCallback, useReducer } from "react";

// Undo/redo stacks. Each operation pushes an entry that knows how to reverse
// itself (`invert`); operations that can be re-applied deterministically also
// provide `redo`. Entries WITHOUT `redo` (e.g. AI writes, whose undo deletes
// entities that can't be recreated with the same ids) are undoable but never
// enter the redo stack. A brand-new action clears the redo stack.

export interface UndoEntry {
  label: string;
  invert: () => void | Promise<void>;
  redo?: () => void | Promise<void>;
}

export interface UndoStack {
  push: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  nextUndoLabel: string | null;
  nextRedoLabel: string | null;
}

const MAX_DEPTH = 50;

interface Stacks {
  undo: UndoEntry[];
  redo: UndoEntry[];
}

type StackAction = { type: "push"; entry: UndoEntry } | { type: "undo" } | { type: "redo" };

function reduce(s: Stacks, a: StackAction): Stacks {
  if (a.type === "push") return { undo: [...s.undo, a.entry].slice(-MAX_DEPTH), redo: [] };
  if (a.type === "undo") {
    const e = s.undo.at(-1);
    if (!e) return s;
    return { undo: s.undo.slice(0, -1), redo: e.redo ? [...s.redo, e].slice(-MAX_DEPTH) : s.redo };
  }
  const e = s.redo.at(-1);
  if (!e) return s;
  return { undo: [...s.undo, e].slice(-MAX_DEPTH), redo: s.redo.slice(0, -1) };
}

function derive(s: Stacks): Omit<UndoStack, "push" | "undo" | "redo"> {
  return {
    canUndo: s.undo.length > 0,
    canRedo: s.redo.length > 0,
    nextUndoLabel: s.undo.at(-1)?.label ?? null,
    nextRedoLabel: s.redo.at(-1)?.label ?? null,
  };
}

export function useUndoStack(): UndoStack {
  const [stacks, dispatch] = useReducer(reduce, { undo: [], redo: [] });
  const push = useCallback((entry: UndoEntry): void => dispatch({ type: "push", entry }), []);
  const undo = useCallback(async (): Promise<void> => {
    const entry = stacks.undo.at(-1);
    dispatch({ type: "undo" });
    await entry?.invert();
  }, [stacks.undo]);
  const redo = useCallback(async (): Promise<void> => {
    const entry = stacks.redo.at(-1);
    if (!entry?.redo) return;
    dispatch({ type: "redo" });
    await entry.redo();
  }, [stacks.redo]);
  return { push, undo, redo, ...derive(stacks) };
}
