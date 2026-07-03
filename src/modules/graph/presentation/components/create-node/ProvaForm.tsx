import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, SearchIcon } from "lucide-react";
import type { AvailableItem } from "@/modules/graph/application/ports/graph-data.port";
import type { ParsedQuestao } from "@/modules/graph/application/ports/graph-prova.port";

export type ProvaSubMode = "existing" | "upload";
export type ProvaUploadStep = "files" | "reviewing" | "review";

interface ProvaFormProps {
  provas: AvailableItem[];
  subMode: ProvaSubMode;
  onSubModeChange: (mode: ProvaSubMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedProvaId: string;
  onSelectProva: (id: string) => void;
  uploadStep: ProvaUploadStep;
  provaFile: File | null;
  onProvaFile: (f: File | null) => void;
  gabaritoFile: File | null;
  onGabaritoFile: (f: File | null) => void;
  parsedTitulo: string;
  onParsedTitulo: (t: string) => void;
  parsedQuestoes: ParsedQuestao[];
}

const TAB_CLASS = "flex-1 py-1.5 transition-colors";
const ACTIVE = "bg-primary text-primary-foreground";
const INACTIVE = "hover:bg-zinc-100 dark:hover:bg-zinc-800";
const FILE_CLASS =
  "block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm dark:file:bg-zinc-800";

export function ProvaForm(props: ProvaFormProps) {
  const isUpload = props.subMode === "upload";
  return (
    <div className="space-y-3">
      <div className="flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700 text-sm">
        <button
          type="button"
          className={`${TAB_CLASS} ${props.subMode === "existing" ? ACTIVE : INACTIVE}`}
          onClick={() => props.onSubModeChange("existing")}
        >
          Vincular existente
        </button>
        <button
          type="button"
          className={`${TAB_CLASS} ${isUpload ? ACTIVE : INACTIVE}`}
          onClick={() => props.onSubModeChange("upload")}
        >
          Importar arquivos
        </button>
      </div>

      {props.subMode === "existing" && <ProvaExistingPicker {...props} />}
      {isUpload && props.uploadStep === "files" && <ProvaUploadFiles {...props} />}
      {isUpload && props.uploadStep === "reviewing" && <ProvaReviewing />}
      {isUpload && props.uploadStep === "review" && <ProvaReview {...props} />}
    </div>
  );
}

function ProvaExistingPicker({ provas, searchQuery, onSearchChange, selectedProvaId, onSelectProva }: ProvaFormProps) {
  const visible = provas.filter((p) => !searchQuery || p.label.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="space-y-2">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar provas..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
        />
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border border-zinc-200 dark:border-zinc-800 p-1">
        {provas.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Nenhuma prova disponível. Crie provas em Provas primeiro.
          </p>
        ) : (
          visible.map((p) => (
            <ProvaOption key={p.id} prova={p} selected={selectedProvaId === p.id} onSelect={onSelectProva} />
          ))
        )}
      </div>
    </div>
  );
}

function ProvaOption({ prova, selected, onSelect }: { prova: AvailableItem; selected: boolean; onSelect: (id: string) => void }) {
  const cls = selected
    ? "bg-primary/10 border border-primary"
    : "border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800";
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded p-2 text-sm transition-colors ${cls}`}>
      <input type="radio" className="mt-0.5" checked={selected} onChange={() => onSelect(prova.id)} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{prova.label}</div>
        <div className="truncate text-xs text-muted-foreground">{prova.hierarquia}</div>
      </div>
    </label>
  );
}

function ProvaUploadFiles({ provaFile, onProvaFile, gabaritoFile, onGabaritoFile }: ProvaFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Selecione o arquivo da prova e o gabarito. A IA irá extrair e cruzar as questões automaticamente.
      </p>
      <ProvaFileInput label="Arquivo da prova (PDF, DOCX ou TXT)" file={provaFile} onFile={onProvaFile} />
      <ProvaFileInput label="Gabarito (PDF, DOCX ou TXT)" file={gabaritoFile} onFile={onGabaritoFile} />
    </div>
  );
}

function ProvaFileInput({ label, file, onFile }: { label: string; file: File | null; onFile: (f: File | null) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <input
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        className={FILE_CLASS}
      />
      {file && <p className="text-xs text-muted-foreground">{file.name}</p>}
    </div>
  );
}

function ProvaReviewing() {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Extraindo e cruzando questões com a IA...</p>
    </div>
  );
}

function ProvaReview({ parsedTitulo, onParsedTitulo, parsedQuestoes }: ProvaFormProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título da prova</Label>
        <Input value={parsedTitulo} onChange={(e) => onParsedTitulo(e.target.value)} placeholder="Título da prova" />
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 p-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">{parsedQuestoes.length} questão(ões) encontrada(s)</p>
        {parsedQuestoes.map((q, i) => (
          <ProvaQuestaoRow key={i} questao={q} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Verifique as questões acima. Clique em "Criar prova e adicionar ao grafo" para salvar.
      </p>
    </div>
  );
}

function ProvaQuestaoRow({ questao }: { questao: ParsedQuestao }) {
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs font-mono text-muted-foreground w-6">{questao.numero}.</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs line-clamp-2">{questao.enunciado}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">
              {questao.tipo === "VERDADEIRO_FALSO" ? "V/F" : "MC"}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Gabarito: <strong>{questao.gabarito}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
