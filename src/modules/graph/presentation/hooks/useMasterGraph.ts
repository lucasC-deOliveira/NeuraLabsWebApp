// O grafo master do usuário — o único raiz, que contém tudo. Carregado à parte da
// listagem para ficar SEMPRE fixo no topo, fora da paginação e da ordenação: o app
// tem um grafo só, e ele é o ponto de entrada. `null` até carregar (ou se o usuário
// ainda não criou nenhum grafo).
import { useEffect, useState } from "react";
import { graphHttp } from "../../infra/http";
import type { GrafoInfo } from "../../domain/types/graph.types";

export function useMasterGraph(reloadKey: number): GrafoInfo | null {
  const [master, setMaster] = useState<GrafoInfo | null>(null);

  useEffect(() => {
    let alive = true;
    // tipo=raiz devolve só o master (há exatamente um por usuário).
    graphHttp
      .listUserGraphs({ tipo: "raiz", pageSize: 1 })
      .then((r): void => { if (alive) setMaster(r.items[0] ?? null); })
      .catch((): void => { if (alive) setMaster(null); });
    return (): void => { alive = false; };
  }, [reloadKey]);

  return master;
}
