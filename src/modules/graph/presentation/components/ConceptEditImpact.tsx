import type { ConceptEditImpact as Impact } from "../hooks/useConceptEditImpact";

export function ConceptEditImpact({ impact, currentGraphId, local }: {
  impact: Impact;
  currentGraphId: string;
  local: boolean;
}) {
  if (!impact) return null;
  if (impact === "loading") return <p role="status">Verificando quais grafos usam este conceito…</p>;
  if ("failed" in impact) return <p role="alert">Não foi possível verificar o impacto. Reabra a edição para tentar novamente.</p>;
  if (impact.graphs.length < 2) return null;

  return (
    <aside className="space-y-2 rounded-lg border border-border bg-muted/50 p-3" aria-label="Impacto da edição">
      <p className="font-medium">Este conceito é compartilhado por {impact.graphs.length} grafos.</p>
      <p>Ao salvar, as mudanças no nome e na descrição aparecerão nestes grafos {local ? "do vault" : "do servidor"}.</p>
      <ul className="max-h-28 list-disc overflow-y-auto pl-5">
        {impact.graphs.map(({ id, name }) => (
          <li key={id}>{name}{id === currentGraphId ? " (grafo atual)" : ""}</li>
        ))}
      </ul>
    </aside>
  );
}
