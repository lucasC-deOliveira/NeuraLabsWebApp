import { useEffect, useState } from "react";
import { graphHttp } from "../../infra/http";
import type { PropertiesNode } from "../components/properties/properties-panel.types";

export type NotaMeta = Record<string, string | null>;

// Loads the Zettelkasten metadata (slug + dates + subtype) of the selected NOTA
// node via the GraphNodesPort. The result is DERIVED against the current node id
// so the effect never sets state synchronously (react-hooks/set-state-in-effect).
export function useNotaMeta(node: PropertiesNode | null): NotaMeta | null {
  const [loaded, setLoaded] = useState<{ id: string; meta: NotaMeta | null }>({ id: "", meta: null });
  const isNota = node?.tipoReal === "NOTA";
  const nodeId = node?.id ?? null;

  useEffect(() => {
    if (!isNota || !nodeId) return;
    let ignore = false;
    graphHttp
      .getNodeDetails("NOTA", nodeId)
      .then((d): void => { if (!ignore) setLoaded({ id: nodeId, meta: d }); })
      .catch((): void => { if (!ignore) setLoaded({ id: nodeId, meta: null }); });
    return (): void => { ignore = true; };
  }, [isNota, nodeId]);

  return loaded.id === nodeId ? loaded.meta : null;
}
