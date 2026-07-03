"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileTextIcon, UploadCloudIcon, Loader2Icon, AlertCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { provasHttp } from "../../infra/http";
import type { ParsedQuestaoPreview } from "../../domain/prova.types";
import { validateProvaDraft } from "../../domain/services/prova-form";
import { FileDropzone } from "./FileDropzone";
import { ParsedQuestaoRow } from "./ParsedQuestaoRow";

const UPLOAD_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

function UploadStep({ provaFile, gabaritoFile, parsing, onProva, onGabarito, onParse }: {
  provaFile: File | null;
  gabaritoFile: File | null;
  parsing: boolean;
  onProva: (f: File | null) => void;
  onGabarito: (f: File | null) => void;
  onParse: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Faça upload do arquivo da prova e do gabarito. A IA irá extrair as questões e cruzar com o gabarito automaticamente.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <FileTextIcon className="size-3.5" /> Arquivo da prova
          </Label>
          <FileDropzone label="Prova (PDF, DOCX ou TXT)" accept={UPLOAD_ACCEPT} file={provaFile} onFile={onProva} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <FileTextIcon className="size-3.5" /> Arquivo do gabarito
          </Label>
          <FileDropzone label="Gabarito (PDF, DOCX ou TXT)" accept={UPLOAD_ACCEPT} file={gabaritoFile} onFile={onGabarito} />
        </div>
      </div>
      <Button className="w-full gap-2" onClick={onParse} disabled={parsing || !provaFile || !gabaritoFile}>
        {parsing ? (
          <><Loader2Icon className="size-4 animate-spin" /> Analisando com IA...</>
        ) : (
          <><UploadCloudIcon className="size-4" /> Analisar arquivos</>
        )}
      </Button>
    </div>
  );
}

interface ReviewStepProps {
  parsed: ParsedQuestaoPreview[];
  titulo: string;
  descricao: string;
  saving: boolean;
  onTitulo: (v: string) => void;
  onDescricao: (v: string) => void;
  onReset: () => void;
  onRemove: (idx: number) => void;
  onSave: () => void;
}

function ReviewStep({
  parsed, titulo, descricao, saving, onTitulo, onDescricao, onReset, onRemove, onSave,
}: ReviewStepProps) {
  const semGabarito = parsed.filter((q) => q.gabarito === "?").length;
  return (
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
        <Button variant="outline" size="sm" onClick={onReset}>
          Refazer upload
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Título da prova</Label>
          <Input value={titulo} onChange={(e) => onTitulo(e.target.value)} placeholder="Ex: Prova de Biologia — 1º Bimestre" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Descrição <span className="text-zinc-400 text-xs">(opcional)</span></Label>
          <Textarea value={descricao} onChange={(e) => onDescricao(e.target.value)} placeholder="Instruções, tópicos cobertos..." rows={2} className="resize-none" />
        </div>
      </div>

      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {parsed.map((q, i) => (
          <ParsedQuestaoRow key={i} q={q} onRemove={() => onRemove(i)} />
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button onClick={onSave} disabled={saving || !titulo.trim() || parsed.length === 0} className="gap-2">
          {saving ? (
            <><Loader2Icon className="size-4 animate-spin" /> Salvando...</>
          ) : (
            `Criar prova com ${parsed.length} questão${parsed.length !== 1 ? "ões" : ""}`
          )}
        </Button>
      </div>
    </div>
  );
}

export function ImportTab({ onCreated }: { onCreated: (id: string) => void }) {
  const [provaFile, setProvaFile] = useState<File | null>(null);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuestaoPreview[] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const handleParse = async (): Promise<void> => {
    if (!provaFile || !gabaritoFile) { toast.error("Selecione os dois arquivos."); return; }
    setParsing(true);
    setParsed(null);
    try {
      const result = await provasHttp.parseUpload(provaFile, gabaritoFile);
      if (result.questoes.length === 0) { toast.error("Nenhuma questão encontrada nos arquivos."); return; }
      setParsed(result.questoes);
      if (result.tituloSugerido) setTitulo(result.tituloSugerido);
      toast.success(`${result.questoes.length} questões extraídas!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar arquivos.");
    } finally {
      setParsing(false);
    }
  };

  const removeQuestao = (idx: number): void => {
    setParsed((prev) => prev?.filter((_, i) => i !== idx) ?? null);
  };

  const handleSave = async (): Promise<void> => {
    const err = validateProvaDraft(titulo, parsed?.length ?? 0);
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const { provaId } = await provasHttp.createFromParsed({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        questoes: parsed ?? [],
      });
      toast.success("Prova importada com sucesso!");
      onCreated(provaId);
    } catch {
      toast.error("Erro ao salvar prova.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {parsed ? (
        <ReviewStep
          parsed={parsed}
          titulo={titulo}
          descricao={descricao}
          saving={saving}
          onTitulo={setTitulo}
          onDescricao={setDescricao}
          onReset={() => { setParsed(null); setTitulo(""); }}
          onRemove={removeQuestao}
          onSave={handleSave}
        />
      ) : (
        <UploadStep
          provaFile={provaFile}
          gabaritoFile={gabaritoFile}
          parsing={parsing}
          onProva={setProvaFile}
          onGabarito={setGabaritoFile}
          onParse={handleParse}
        />
      )}
    </div>
  );
}
