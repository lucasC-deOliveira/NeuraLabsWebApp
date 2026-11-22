import { useState } from "react";
import { loadExpandedDecks, saveExpandedDecks } from "../services/expanded-decks-storage";

interface ExpandedDeckPreference {
  expanded: ReadonlySet<string>;
  toggle: (id: string) => void;
}

/** Restores and updates the expansion preference independently for each graph.
 * @example const { expanded, toggle } = useExpandedDecks(graphId)
 */
export function useExpandedDecks(graphId: string): ExpandedDeckPreference {
  const [stored, setStored] = useState(() => ({ graphId, expanded: loadExpandedDecks(graphId) }));
  const active = stored.graphId === graphId ? stored : { graphId, expanded: loadExpandedDecks(graphId) };
  if (active !== stored) setStored(active);
  const toggle = (id: string): void => {
    const expanded = new Set(active.expanded);
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    setStored({ graphId, expanded });
    saveExpandedDecks(graphId, expanded);
  };
  return { expanded: active.expanded, toggle };
}
