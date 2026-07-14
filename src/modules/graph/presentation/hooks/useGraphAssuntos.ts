// Carrega, uma vez, os assuntos disponíveis para o filtro da listagem de grafos.
// Lista vazia enquanto carrega ou em caso de erro (o filtro simplesmente não aparece).
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { graphHttp } from "../../infra/http";
import type { GraphAssunto } from "../../domain/types/graph.types";

function fetchAssuntos(setAssuntos: Dispatch<SetStateAction<GraphAssunto[]>>): () => void {
  let alive = true;
  void (async (): Promise<void> => {
    try {
      const list = await graphHttp.listGraphAssuntos();
      if (alive) setAssuntos(list);
    } catch {
      // silencia — sem assuntos o filtro apenas não aparece
    }
  })();
  return () => { alive = false; };
}

export function useGraphAssuntos(): GraphAssunto[] {
  const [assuntos, setAssuntos] = useState<GraphAssunto[]>([]);
  useEffect(() => fetchAssuntos(setAssuntos), []);
  return assuntos;
}
