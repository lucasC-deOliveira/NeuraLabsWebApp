import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { countErrors, type VaultIssue } from "@/lib/vault-validate";

// Teto de itens exibidos. Um vault mal formado produz dezenas de avisos; a lista
// serve para o usuário achar o primeiro problema, não para ser exaustiva.
const VISIVEIS = 10;

interface VaultIssuesProps {
  issues: VaultIssue[];
  pushBloqueado: boolean;
}

/**
 * Mostra o que a validação encontrou nos `.md`, erros primeiro.
 *
 * `erro` = o Push vai recusar ou gravar coisa errada. `aviso` = o Push passa mas
 * descarta algo em silêncio (aresta inválida, alvo inexistente, peso coagido) —
 * que é justamente o que ninguém percebe sem uma lista assim.
 */
export function VaultIssues({ issues, pushBloqueado }: VaultIssuesProps) {
  if (issues.length === 0) return null;

  const erros = countErrors(issues);
  const restantes = issues.length - VISIVEIS;

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {erros > 0 ? (
          <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
        ) : (
          <InfoIcon className="size-4 shrink-0 text-muted-foreground" />
        )}
        {erros > 0
          ? `${erros} erro(s) e ${issues.length - erros} aviso(s) no vault`
          : `${issues.length} aviso(s) no vault`}
      </div>

      {pushBloqueado && (
        <p className="text-[11px] text-destructive">
          O Push foi interrompido. Corrija os erros, ou clique em Push de novo para enviar assim mesmo.
        </p>
      )}

      <ul className="space-y-1 max-h-44 overflow-y-auto">
        {issues.slice(0, VISIVEIS).map((issue, i) => (
          <li key={`${issue.relPath}-${i}`} className="text-[11px] min-w-0">
            <span
              className={
                issue.severity === "erro"
                  ? "text-destructive font-medium"
                  : "text-amber-600 dark:text-amber-400"
              }
            >
              {issue.severity === "erro" ? "erro" : "aviso"}
            </span>{" "}
            <span className="font-mono text-muted-foreground">{issue.relPath}</span>
            <span className="block text-muted-foreground">{issue.message}</span>
          </li>
        ))}
      </ul>
      {restantes > 0 && (
        <p className="text-[11px] text-muted-foreground">e mais {restantes} problema(s).</p>
      )}
    </div>
  );
}
