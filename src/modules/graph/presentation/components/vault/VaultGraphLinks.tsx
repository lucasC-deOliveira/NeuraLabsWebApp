import { useEffect, useState } from "react";
import { FolderIcon } from "lucide-react";
import { Link } from "@/components/link";
import { listLocalGraphs } from "../../../infra/vault/graph-vault-reader";
import type { GrafoInfo } from "../../../domain/types/graph.types";

export function VaultGraphLinks({ query, reloadKey, showEmpty }: {
  query?: string; reloadKey: number; showEmpty: boolean;
}) {
  const [graphs, setGraphs] = useState<GrafoInfo[] | null>(null);

  useEffect(() => {
    let active = true;
    listLocalGraphs()
      .then((folders) => { if (active) setGraphs(folders); })
      .catch(() => { if (active) setGraphs([]); });
    return () => { active = false; };
  }, [reloadKey]);

  const search = query?.trim().toLocaleLowerCase() ?? "";
  const matching = graphs?.filter((graph) => graph.nome.toLocaleLowerCase().includes(search)) ?? [];
  if (!matching.length && !showEmpty) return null;
  return (
    <section aria-label="Grafos no vault" className="mb-6 space-y-3">
      <h2 className="text-base font-semibold">Grafos no vault</h2>
      {!graphs && <p role="status" className="text-sm text-muted-foreground">Carregando grafos do vault…</p>}
      {graphs && !matching.length && (
        <p className="text-sm text-muted-foreground">
          Nenhum grafo baixado. Confira a pasta em <Link href="/settings/desktop" className="text-primary underline">Configurações</Link>.
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matching.map((graph) => (
          <li key={graph.id} className="min-w-0">
            <Link href={`/graph/${graph.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/50">
              <FolderIcon className="size-5 shrink-0 text-primary" />
              <span className="truncate text-sm font-medium">{graph.nome}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
