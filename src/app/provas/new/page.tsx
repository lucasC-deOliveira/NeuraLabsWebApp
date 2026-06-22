"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftIcon, SearchIcon, XIcon, PlusIcon,
  UploadCloudIcon, FileTextIcon, CheckCircle2Icon,
  Loader2Icon, AlertCircleIcon, Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  createProva, createProvaFromParsed, parseProvaUpload,
  type ParsedQuestaoPreview,
} from "@/lib/provas-api";
import { listQuestoes, type QuestaoListItem } from "@/lib/questions-api";

const TIPO_LABEL: Record<string, string> = {
  VERDADEIRO_FALSO: "V/F",
  MULTIPLA_ESCOLHA: "MC",
};

type Mode = "manual" | "import";

// ─── Componente de upload de arquivo ────────────────────────────────────────
function FileDropzone({
  label,
  accept,
  file,
  onFile,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-5 text-center transition-colors cursor-pointer ${
        dragging
          ? "border-primary bg-primary/5"
          : file
          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2Icon className="size-5 text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
            className="text-zinc-400 hover:text-red-500"
            title="Remover"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <UploadCloudIcon className="size-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">PDF, DOCX ou TXT · até 10 MB</p>
          <p className="text-xs text-muted-foreground">Clique ou arraste o arquivo aqui</p>
        </div>
      )}
    </div>
  );
}

// ─── Preview de questão parseada ────────────────────────────────────────────
function ParsedQuestaoRow({
  q,
  onRemove,
}: {
  q: ParsedQuestaoPreview;
  onRemove: () => void;
}) {
  const gabaritoOk = q.gabarito !== "?";
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="text-xs text-muted-foreground font-mono w-6 pt-0.5 shrink-0">{q.numero}.</span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{TIPO_LABEL[q.tipo]}</Badge>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                gabaritoOk
                  ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                  : "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400"
              }`}
            >
              {gabaritoOk ? <CheckCircle2Icon className="size-3" /> : <AlertCircleIcon className="size-3" />}
              {q.gabarito}
            </span>
          </div>
          <p className="text-sm leading-snug">{q.enunciado}</p>
          {q.alternativas && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
              {q.alternativas.map((a) => (
                <p key={a.letra} className={`text-xs truncate ${a.letra === q.gabarito ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  <span className="font-mono">{a.letra}.</span> {a.texto}
                </p>
              ))}
            </div>
          )}
        </div>
        <button onClick={onRemove} className="text-zinc-400 hover:text-red-500 shrink-0 mt-0.5" title="Remover">
          <Trash2Icon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Aba Manual ────────────────────────────────────────────────────────────
function ManualTab({ onCreated }: { onCreated: (id: string) => void }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [allQuestoes, setAllQuestoes] = useState<QuestaoListItem[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<QuestaoListItem[]>([]);

  useEffect(() => {
    listQuestoes()
      .then(setAllQuestoes)
      .catch(() => toast.error("Erro ao carregar questões"))
      .finally(() => setLoadingQ(false));
  }, []);

  const selectedIds = new Set(selected.map((q) => q.id));
  const filtered = allQuestoes.filter(
    (q) => !selectedIds.has(q.id) && q.enunciado.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (q: QuestaoListItem) => {
    setSelected((prev) =>
      selectedIds.has(q.id) ? prev.filter((x) => x.id !== q.id) : [...prev, q],
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    setSelected((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error("Informe o título da prova."); return; }
    if (selected.length === 0) { toast.error("Adicione ao menos uma questão."); return; }
    setSaving(true);
    try {
      const { provaId } = await createProva({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        questaoIds: selected.map((q) => q.id),
      });
      toast.success("Prova criada!");
      onCreated(provaId);
    } catch {
      toast.error("Erro ao criar prova.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Prova de Biologia — 1º Bimestre" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descricao">Descrição <span className="text-zinc-400 text-xs">(opcional)</span></Label>
          <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Tópicos cobertos, instruções..." rows={2} className="resize-none" />
        </div>
      </div>

      {/* Questões selecionadas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Questões da prova</Label>
          {selected.length > 0 && <Badge variant="outline" className="text-xs">{selected.length} selecionada{selected.length !== 1 ? "s" : ""}</Badge>}
        </div>
        {selected.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhuma questão adicionada. Use o painel abaixo para selecionar.</div>
        ) : (
          <div className="space-y-1.5">
            {selected.map((q, idx) => (
              <div key={q.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5">
                <div className="flex flex-col gap-0.5 text-zinc-400 shrink-0">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} className="hover:text-primary disabled:opacity-20 leading-none text-[10px]">▲</button>
                  <button onClick={() => move(idx, 1)} disabled={idx === selected.length - 1} className="hover:text-primary disabled:opacity-20 leading-none text-[10px]">▼</button>
                </div>
                <span className="text-xs font-mono text-muted-foreground w-5 text-right shrink-0">{idx + 1}.</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{TIPO_LABEL[q.tipo]}</Badge>
                <p className="text-sm flex-1 min-w-0 truncate">{q.enunciado}</p>
                <button onClick={() => toggleSelect(q)} className="text-zinc-400 hover:text-red-500 shrink-0"><XIcon className="size-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seletor */}
      <div className="space-y-2">
        <Label>Adicionar questões</Label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar questões..." className="pl-8" />
        </div>
        {loadingQ ? (
          <p className="text-sm text-muted-foreground py-3 text-center">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3 text-center">
            {allQuestoes.length === 0 ? "Nenhuma questão cadastrada." : "Sem resultados."}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {filtered.map((q) => (
              <button key={q.id} onClick={() => toggleSelect(q)} className="w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <PlusIcon className="size-3.5 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{TIPO_LABEL[q.tipo]}</Badge>
                <span className="text-sm flex-1 min-w-0 truncate">{q.enunciado}</span>
                {q.conceitoNome && <span className="text-[11px] text-muted-foreground shrink-0">{q.conceitoNome}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saving || !titulo.trim() || selected.length === 0}>
          {saving ? "Criando..." : `Criar prova com ${selected.length} questão${selected.length !== 1 ? "ões" : ""}`}
        </Button>
      </div>
    </div>
  );
}

// ─── Aba Importar ──────────────────────────────────────────────────────────
function ImportTab({ onCreated }: { onCreated: (id: string) => void }) {
  const [provaFile, setProvaFile] = useState<File | null>(null);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestaoPreview[] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const handleParse = async () => {
    if (!provaFile || !gabaritoFile) { toast.error("Selecione os dois arquivos."); return; }
    setParsing(true);
    setParsed(null);
    try {
      const result = await parseProvaUpload(provaFile, gabaritoFile);
      if (result.questoes.length === 0) { toast.error("Nenhuma questão encontrada nos arquivos."); return; }
      setParsed(result.questoes);
      if (result.tituloSugerido) setTitulo(result.tituloSugerido);
      toast.success(`${result.questoes.length} questões extraídas!`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao processar arquivos.");
    } finally {
      setParsing(false);
    }
  };

  const removeQuestao = (idx: number) => {
    setParsed((prev) => prev?.filter((_, i) => i !== idx) ?? null);
  };

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error("Informe o título da prova."); return; }
    if (!parsed || parsed.length === 0) { toast.error("Sem questões para salvar."); return; }
    setSaving(true);
    try {
      const { provaId } = await createProvaFromParsed({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        questoes: parsed,
      });
      toast.success("Prova importada com sucesso!");
      onCreated(provaId);
    } catch {
      toast.error("Erro ao salvar prova.");
    } finally {
      setSaving(false);
    }
  };

  const semGabarito = parsed?.filter((q) => q.gabarito === "?").length ?? 0;

  return (
    <div className="space-y-5">
      {/* Upload dos arquivos */}
      {!parsed && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Faça upload do arquivo da prova e do gabarito. A IA irá extrair as questões e cruzar com o gabarito automaticamente.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileTextIcon className="size-3.5" /> Arquivo da prova
              </Label>
              <FileDropzone
                label="Prova (PDF, DOCX ou TXT)"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                file={provaFile}
                onFile={setProvaFile}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileTextIcon className="size-3.5" /> Arquivo do gabarito
              </Label>
              <FileDropzone
                label="Gabarito (PDF, DOCX ou TXT)"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                file={gabaritoFile}
                onFile={setGabaritoFile}
              />
            </div>
          </div>
          <Button
            className="w-full gap-2"
            onClick={handleParse}
            disabled={parsing || !provaFile || !gabaritoFile}
          >
            {parsing ? (
              <><Loader2Icon className="size-4 animate-spin" /> Analisando com IA...</>
            ) : (
              <><UploadCloudIcon className="size-4" /> Analisar arquivos</>
            )}
          </Button>
        </div>
      )}

      {/* Review das questões parseadas */}
      {parsed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{parsed.length} questões extraídas</p>
              {semGabarito > 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-0.5">
                  <AlertCircleIcon className="size-3" />
                  {semGabarito} questão{semGabarito !== 1 ? "ões" : ""} sem gabarito identificado
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => { setParsed(null); setTitulo(""); }}>
              Refazer upload
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Título da prova</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Prova de Biologia — 1º Bimestre" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição <span className="text-zinc-400 text-xs">(opcional)</span></Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Instruções, tópicos cobertos..." rows={2} className="resize-none" />
            </div>
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {parsed.map((q, i) => (
              <ParsedQuestaoRow key={i} q={q} onRemove={() => removeQuestao(i)} />
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || !titulo.trim() || parsed.length === 0}
              className="gap-2"
            >
              {saving ? (
                <><Loader2Icon className="size-4 animate-spin" /> Salvando...</>
              ) : (
                `Criar prova com ${parsed.length} questão${parsed.length !== 1 ? "ões" : ""}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────
export default function NewProvaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");

  const handleCreated = (id: string) => router.push(`/provas/${id}`);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/provas")}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">Nova prova</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Montar manualmente
        </button>
        <button
          onClick={() => setMode("import")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "import" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UploadCloudIcon className="size-3.5" /> Importar arquivo
        </button>
      </div>

      {mode === "manual" ? (
        <ManualTab onCreated={handleCreated} />
      ) : (
        <ImportTab onCreated={handleCreated} />
      )}
    </div>
  );
}
