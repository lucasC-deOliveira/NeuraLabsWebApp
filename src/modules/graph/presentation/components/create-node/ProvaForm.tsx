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
  onSetGabarito: (index: number, value: string) => void;
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
        Selecione o arquivo da prova. O gabarito é opcional — sem ele, você informa a
        alternativa correta de cada questão na revisão.
      </p>
      <ProvaFileInput label="Arquivo da prova (PDF, DOCX ou TXT)" file={provaFile} onFile={onProvaFile} />
      <ProvaFileInput label="Gabarito (opcional)" file={gabaritoFile} onFile={onGabaritoFile} />
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

function ProvaReview({ parsedTitulo, onParsedTitulo, parsedQuestoes, onSetGabarito }: ProvaFormProps) {
  const pendentes = parsedQuestoes.filter((q) => isGabaritoPendente(q.gabarito)).length;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título da prova</Label>
        <Input value={parsedTitulo} onChange={(e) => onParsedTitulo(e.target.value)} placeholder="Título da prova" />
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 p-2">
        <p className="text-xs font-medium text-muted-foreground">{parsedQuestoes.length} questão(ões) encontrada(s)</p>
        {parsedQuestoes.map((q, i) => (
          <ProvaQuestaoRow key={i} questao={q} onSetGabarito={(v) => onSetGabarito(i, v)} />
        ))}
      </div>
      {pendentes > 0 ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Informe a alternativa correta de {pendentes} questão(ões) pendente(s) antes de criar.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Confira o gabarito de cada questão e clique em "Criar prova e adicionar ao grafo".
        </p>
      )}
    </div>
  );
}

function isGabaritoPendente(gabarito: string): boolean {
  return !gabarito || gabarito === "?";
}

function ProvaQuestaoRow({ questao, onSetGabarito }: { questao: ParsedQuestao; onSetGabarito: (value: string) => void }) {
  const isVF = questao.tipo === "VERDADEIRO_FALSO";
  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-2 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs font-mono text-muted-foreground w-6">{questao.numero}.</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs">{questao.enunciado}</p>
          {questao.imagens && questao.imagens.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {questao.imagens.map((img, k) => (
                <img
                  key={k}
                  src={`data:${img.mimetype};base64,${img.base64}`}
                  alt="Figura da questão"
                  className="max-h-32 max-w-full rounded border bg-white object-contain"
                />
              ))}
            </div>
          )}
          <Badge variant="outline" className="text-[10px]">{isVF ? "V/F" : "Múltipla escolha"}</Badge>
          {isVF ? (
            <VerdadeiroFalsoPicker value={questao.gabarito} onPick={onSetGabarito} />
          ) : (
            <MultiplaEscolhaPicker alternativas={questao.alternativas} value={questao.gabarito} onPick={onSetGabarito} />
          )}
        </div>
      </div>
    </div>
  );
}

const PICK_BTN = "rounded border px-2 py-1 text-[11px] transition-colors";
const PICK_ON = "border-primary bg-primary/10 text-primary font-medium";
const PICK_OFF = "border-zinc-200 dark:border-zinc-700 hover:border-primary/40";

function VerdadeiroFalsoPicker({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {(["V", "F"] as const).map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)} className={`${PICK_BTN} flex-1 ${value === v ? PICK_ON : PICK_OFF}`}>
          {v === "V" ? "Verdadeiro" : "Falso"}
        </button>
      ))}
    </div>
  );
}

function MultiplaEscolhaPicker({ alternativas, value, onPick }: {
  alternativas: { letra: string; texto: string }[] | null;
  value: string;
  onPick: (v: string) => void;
}) {
  if (!alternativas || alternativas.length === 0) {
    return <p className="text-[10px] text-amber-600 dark:text-amber-400">Sem alternativas extraídas.</p>;
  }
  return (
    <div className="space-y-1">
      {alternativas.map((alt) => (
        <button
          key={alt.letra}
          type="button"
          onClick={() => onPick(alt.letra)}
          className={`${PICK_BTN} flex w-full items-start gap-1.5 text-left ${value === alt.letra ? PICK_ON : PICK_OFF}`}
        >
          <span className="font-mono font-semibold">{alt.letra}.</span>
          <span className="min-w-0 flex-1">{alt.texto}</span>
        </button>
      ))}
    </div>
  );
}
