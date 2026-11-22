import type { ReactElement } from "react";
import { Link } from "@/components/link";

/** Displays the citations embedded in a book analysis node's vault description. */
export function BookNodeSources({ description, source }: { description: string; source?: string | null }): ReactElement | null {
  if (source?.startsWith("#/biblioteca?")) return <Link className="text-sm underline"
    href={source.slice(1)}>Abrir trecho na transcrição</Link>;
  if (!/^(?:Tese|Conceito) do livro\r?\n/u.test(description)) return null;
  const role = /^Papel no argumento: (.+)$/mu.exec(description)?.[1];
  const links = [...description.matchAll(/^(?:\*\*(.+)\*\*\r?\n\r?\n)?(?:Motivo da relação: (.+)\r?\n\r?\n)?> (.+)\r?\n\r?\n\[Fonte no livro\]\(#(\/biblioteca\?[^()\s]+)\)$/gmu)];
  if (!links.length) return null;
  return (
    <section className="space-y-2 text-sm">
      <h3 className="font-medium">Trechos do livro</h3>
      {role && <p className="text-muted-foreground">{role}</p>}
      {links.map(([, relation, rationale, quotation, href], index) => (
        <div key={index} className="space-y-1 border-l pl-2">
          {relation && <p className="font-medium">{relation}</p>}
          {rationale && <p>{rationale}</p>}
          <blockquote className="text-muted-foreground">{quotation}</blockquote>
          <Link className="underline" href={href}>Abrir trecho na transcrição</Link>
        </div>
      ))}
    </section>
  );
}
