import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CoinsIcon, Loader2Icon, SearchIcon } from "lucide-react";
import type { AvailableItem } from "@/modules/graph/application/ports/graph-data.port";
import type { ParsedQuestao, ParsedImagemView } from "@/modules/graph/application/ports/graph-prova.port";
import type { ConceitoPickerEntry } from "@/modules/graph/domain/services/prova-conceitos";
import type { ProvaAiConfig } from "@/modules/graph/presentation/hooks/useProvaAiConfig";
import { useLiveTokenDelta } from "@/modules/graph/presentation/hooks/useLiveTokenDelta";
import { formatTokens } from "../format-tokens";
import { ProvaConceitosPicker } from "./ProvaConceitosPicker";

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
  editalFile: File | null;
  onEditalFile: (f: File | null) => void;
  parsedTitulo: string;
  onParsedTitulo: (t: string) => void;
  parsedQuestoes: ParsedQuestao[];
  onSetGabarito: (index: number, value: string) => void;
  conceitosByQuestao: Record<number, ConceitoPickerEntry[]>;
  conceitosLoading: boolean;
  formatandoQuestoes: boolean;
  onToggleConceito: (numero: number, nome: string) => void;
  onAddConceito: (numero: number, nome: string) => void;
  aiConfig: ProvaAiConfig;
  onToggleAi: (key: keyof ProvaAiConfig) => void;
}

const TAB_CLASS = "flex-1 py-1.5 transition-colors";
const ACTIVE = "bg-primary text-primary-foreground";
const INACTIVE = "hover:bg-zinc-100 dark:hover:bg-zinc-800";
const FILE_CLASS =
  "block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm dark:file:bg-zinc-800";

export function ProvaForm(props: ProvaFormProps) {
  const isUpload = props.subMode === "upload";
  // Uma IA está trabalhando enquanto extrai, formata em lote ou sugere conceitos.
  const aiActive = props.uploadStep === "reviewing" || props.formatandoQuestoes || props.conceitosLoading;
  const liveTokens = useLiveTokenDelta(aiActive);
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
      {isUpload && props.uploadStep === "reviewing" && <ProvaReviewing liveTokens={liveTokens} />}
      {isUpload && props.uploadStep === "review" && <ProvaReview {...props} liveTokens={liveTokens} />}
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

function ProvaUploadFiles({ provaFile, onProvaFile, gabaritoFile, onGabaritoFile, editalFile, onEditalFile, aiConfig, onToggleAi }: ProvaFormProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Selecione o arquivo da prova. O gabarito é opcional — sem ele, você informa a
        alternativa correta de cada questão na revisão.
      </p>
      <ProvaFileInput label="Arquivo da prova (PDF, DOCX ou TXT)" file={provaFile} onFile={onProvaFile} />
      <ProvaFileInput label="Gabarito (opcional)" file={gabaritoFile} onFile={onGabaritoFile} />
      <ProvaFileInput label="Edital (opcional)" file={editalFile} onFile={onEditalFile} />
      <p className="text-[11px] text-muted-foreground">
        Com o edital, o grafo é completado pelos objetos de avaliação e o edital fica vinculado a esta prova.
      </p>
      <ProvaAiConfigPanel config={aiConfig} onToggle={onToggleAi} hasEdital={!!editalFile} />
    </div>
  );
}

const AI_TOGGLES: { key: keyof ProvaAiConfig; label: string; desc: string; editalOnly?: boolean }[] = [
  { key: "aiExtraction", label: "Extração com IA quando necessário", desc: "Fallback do LLM em formatos que o extrator não reconhece. Desligado = só determinístico (0 token)." },
  { key: "melhorarFormatacao", label: "Melhorar formatação das questões", desc: "Reescreve enunciado/alternativas em bom padrão markdown (preserva o gabarito)." },
  { key: "sugerirConceitos", label: "Sugerir conceitos com IA", desc: "Sugere, por questão, os conceitos do grafo que ela avalia." },
  { key: "completarEdital", label: "Completar o grafo pelo edital", desc: "Ao anexar o edital, a IA lê e completa o grafo.", editalOnly: true },
];

function ProvaAiConfigPanel({ config, onToggle, hasEdital }: {
  config: ProvaAiConfig;
  onToggle: (key: keyof ProvaAiConfig) => void;
  hasEdital: boolean;
}) {
  return (
    <div className="rounded-md border border-violet-500/25 bg-violet-500/5 p-2.5 space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
        IA nesta importação
      </p>
      <p className="text-[11px] text-muted-foreground">Você controla o gasto de API. Os tokens usados entram no medidor do grafo.</p>
      {AI_TOGGLES.filter((t) => !t.editalOnly || hasEdital).map((t) => (
        <AiToggleRow key={t.key} label={t.label} desc={t.desc} on={config[t.key]} onToggle={() => onToggle(t.key)} />
      ))}
    </div>
  );
}

function AiToggleRow({ label, desc, on, onToggle }: { label: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-start gap-2 rounded p-1 text-left hover:bg-violet-500/5">
      <span className={`mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full border transition-colors ${on ? "border-violet-500 bg-violet-500 justify-end" : "border-muted-foreground/40 justify-start"}`}>
        <span className="mx-0.5 size-3 rounded-full bg-white shadow" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{desc}</span>
      </span>
    </button>
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

function ProvaReviewing({ liveTokens }: { liveTokens: number }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Loader2Icon className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Extraindo e cruzando questões com a IA...</p>
      <TokenDeltaBadge tokens={liveTokens} />
    </div>
  );
}

// Tokens de IA gastos até agora nesta importação (extração + formatação + conceitos).
function TokenDeltaBadge({ tokens }: { tokens: number }) {
  if (tokens <= 0) return null;
  return (
    <span
      className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"
      title={`${tokens} tokens de IA usados nesta importação (também somados ao medidor do grafo)`}
    >
      <CoinsIcon className="size-3" />
      {formatTokens(tokens)} tokens
    </span>
  );
}

function ProvaReview(props: ProvaFormProps & { liveTokens: number }) {
  const { parsedTitulo, onParsedTitulo, parsedQuestoes, onSetGabarito } = props;
  const pendentes = parsedQuestoes.filter((q) => isGabaritoPendente(q.gabarito)).length;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Título da prova</Label>
        <Input value={parsedTitulo} onChange={(e) => onParsedTitulo(e.target.value)} placeholder="Título da prova" />
      </div>
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-muted-foreground">{parsedQuestoes.length} questão(ões) encontrada(s)</p>
        {props.formatandoQuestoes && (
          <span className="flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400">
            <Loader2Icon className="size-3 animate-spin" />
            Melhorando formatação com IA...
          </span>
        )}
        <TokenDeltaBadge tokens={props.liveTokens} />
      </div>
      <div className="grid max-h-[58vh] grid-cols-1 items-start gap-2 overflow-y-auto rounded-md border border-zinc-200 p-2 md:grid-cols-2 xl:grid-cols-3 dark:border-zinc-800">
        {parsedQuestoes.map((q, i) => (
          <ProvaQuestaoRow
            key={i}
            questao={q}
            onSetGabarito={(v) => onSetGabarito(i, v)}
            conceitos={props.conceitosByQuestao[q.numero] ?? []}
            conceitosLoading={props.conceitosLoading}
            onToggleConceito={(nome) => props.onToggleConceito(q.numero, nome)}
            onAddConceito={(nome) => props.onAddConceito(q.numero, nome)}
          />
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

interface ProvaQuestaoRowProps {
  questao: ParsedQuestao;
  onSetGabarito: (value: string) => void;
  conceitos: ConceitoPickerEntry[];
  conceitosLoading: boolean;
  onToggleConceito: (nome: string) => void;
  onAddConceito: (nome: string) => void;
}

const GABARITO_ANULADA = "ANULADA";

function ProvaQuestaoRow({ questao, onSetGabarito, conceitos, conceitosLoading, onToggleConceito, onAddConceito }: ProvaQuestaoRowProps) {
  const isVF = questao.tipo === "VERDADEIRO_FALSO";
  const anulada = questao.gabarito === GABARITO_ANULADA;
  return (
    <div className="rounded-lg border border-zinc-200 bg-card p-2.5 dark:border-zinc-800">
      <div className="flex items-start gap-2">
        <span className="shrink-0 text-xs font-mono text-muted-foreground w-6">{questao.numero}.</span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="max-h-28 overflow-y-auto text-xs leading-snug">{questao.enunciado}</p>
          <FiguraPreviewList imagens={(questao.imagens ?? []).filter((i) => i.alternativa === null)} />
          <Badge variant="outline" className="text-[10px]">{isVF ? "V/F" : "Múltipla escolha"}</Badge>
          {anulada ? (
            <span className="inline-block rounded bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Questão anulada — sem gabarito
            </span>
          ) : isVF ? (
            <VerdadeiroFalsoPicker value={questao.gabarito} onPick={onSetGabarito} />
          ) : (
            <MultiplaEscolhaPicker
              alternativas={questao.alternativas}
              imagens={questao.imagens ?? []}
              value={questao.gabarito}
              onPick={onSetGabarito}
            />
          )}
          <ProvaConceitosPicker
            entries={conceitos}
            loading={conceitosLoading}
            onToggle={onToggleConceito}
            onAdd={onAddConceito}
          />
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

function FiguraPreviewList({ imagens }: { imagens: ParsedImagemView[] }) {
  if (imagens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {imagens.map((img, k) => (
        <img
          key={k}
          src={`data:${img.mimetype};base64,${img.base64}`}
          alt="Figura da questão"
          className="max-h-32 max-w-full rounded border bg-white object-contain"
        />
      ))}
    </div>
  );
}

function MultiplaEscolhaPicker({ alternativas, imagens, value, onPick }: {
  alternativas: { letra: string; texto: string }[] | null;
  imagens: ParsedImagemView[];
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
          <div className="min-w-0 flex-1 space-y-1">
            {alt.texto && <span>{alt.texto}</span>}
            <FiguraPreviewList imagens={imagens.filter((i) => i.alternativa === alt.letra)} />
          </div>
        </button>
      ))}
    </div>
  );
}
