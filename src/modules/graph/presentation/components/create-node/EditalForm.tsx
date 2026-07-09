import { Label } from "@/components/ui/label";

const FILE_CLASS =
  "block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm dark:file:bg-zinc-800";

interface EditalFormProps {
  file: File | null;
  onFile: (f: File | null) => void;
  // PROVA nodes in the graph, to link the edital 1:1 (optional).
  provas: { id: string; label: string }[];
  provaId: string;
  onProvaId: (id: string) => void;
}

// Import an edital PDF as an EDITAL node: the AI completes the graph from the notice's
// evaluation objects, and (optionally) the node is linked 1:1 to a prova (REGE edge).
export function EditalForm({ file, onFile, provas, provaId, onProvaId }: EditalFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Suba o PDF do edital: a IA cria os assuntos, tópicos e conceitos que faltam, seguindo
        o programa. Só o programa (objetos de avaliação) é enviado à IA.
      </p>
      <div className="space-y-1.5">
        <Label>Arquivo do edital (PDF ou TXT)</Label>
        <input
          type="file"
          accept=".pdf,.txt"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          className={FILE_CLASS}
        />
        {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
      </div>
      <EditalProvaSelect provas={provas} provaId={provaId} onProvaId={onProvaId} />
    </div>
  );
}

function EditalProvaSelect({ provas, provaId, onProvaId }: Pick<EditalFormProps, "provas" | "provaId" | "onProvaId">) {
  if (provas.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label>Vincular a uma prova (opcional)</Label>
      <select
        value={provaId}
        onChange={(e) => onProvaId(e.target.value)}
        className="block w-full rounded-md border bg-background text-foreground px-2 py-1.5 text-sm"
      >
        <option value="">Não vincular</option>
        {provas.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}
