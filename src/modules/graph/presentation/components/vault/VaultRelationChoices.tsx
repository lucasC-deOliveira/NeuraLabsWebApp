import { Button } from "@/components/ui/button";
import type { SharedVaultRelationError } from "@/lib/vault-relation-conflicts";

export function VaultRelationChoices({ issue, resolving, onChoose, onCancel }: {
  issue: SharedVaultRelationError;
  resolving: boolean;
  onChoose: (directory: string) => void;
  onCancel: () => void;
}) {
  const { source, target, relation } = issue.conflict;
  return (
    <section aria-label="Resolver divergência de relação" className="space-y-3 text-sm">
      <div className="space-y-1">
        <h3 className="font-medium">Escolha qual versão manter</h3>
        <p>{source} → {target} ({relation})</p>
        <p className="text-muted-foreground">
          A escolha será aplicada aos {issue.copies.length} grafos abaixo no vault. O servidor só será atualizado quando você enviar.
        </p>
      </div>
      <ul className="space-y-2">
        {issue.copies.map(({ directory, name, weight }) => (
          <li key={directory} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
            <span>{name} · {weight === undefined ? "sem relação" : `peso ${weight}`}</span>
            <Button size="sm" variant="outline" disabled={resolving} onClick={() => onChoose(directory)}>
              {weight === undefined ? `Remover conforme ${name}` : `Manter versão de ${name}`}
            </Button>
          </li>
        ))}
      </ul>
      {resolving && <p role="status">Aplicando a escolha aos arquivos do vault…</p>}
      <Button size="sm" variant="ghost" disabled={resolving} onClick={onCancel}>Cancelar</Button>
    </section>
  );
}
