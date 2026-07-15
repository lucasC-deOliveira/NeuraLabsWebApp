"use client";

import { PageContainer, NarrowColumn } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { questionsHttp } from "../infra/http";
import type { AlternativaMultipla, TipoQuestao } from "../domain/questao.types";
import { LETRAS, reindexAlternativas, validateQuestao } from "../domain/services/questao-form";

function TipoSelector({ tipo, onSelect }: { tipo: TipoQuestao; onSelect: (t: TipoQuestao) => void }) {
  return (
    <div className="space-y-2">
      <Label>Tipo</Label>
      <div className="grid grid-cols-2 gap-3">
        {(["MULTIPLA_ESCOLHA", "VERDADEIRO_FALSO"] as TipoQuestao[]).map((t) => (
          <button
            key={t}
            onClick={() => onSelect(t)}
            className={`rounded-lg border-2 p-3 text-left transition-colors ${tipo === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
          >
            <div className="font-medium text-sm">{t === "MULTIPLA_ESCOLHA" ? "Múltipla escolha" : "Verdadeiro ou Falso"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t === "MULTIPLA_ESCOLHA" ? "Alternativas A / B / C / D com uma correta" : "Afirmação que é verdadeira ou falsa"}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function AlternativaEditorRow({
  alt,
  isGabarito,
  canRemove,
  onSetGabarito,
  onUpdate,
  onRemove,
}: {
  alt: AlternativaMultipla;
  isGabarito: boolean;
  canRemove: boolean;
  onSetGabarito: () => void;
  onUpdate: (texto: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSetGabarito}
        title="Marcar como gabarito"
        className={`flex-shrink-0 rounded-full size-7 flex items-center justify-center border-2 transition-colors ${isGabarito ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-600" : "border-border text-muted-foreground hover:border-primary/60"}`}
      >
        {isGabarito ? <CheckCircle2Icon className="size-3.5" /> : <span className="text-xs font-mono">{alt.letra}</span>}
      </button>
      <Input value={alt.texto} onChange={(e) => onUpdate(e.target.value)} placeholder={`Alternativa ${alt.letra}`} className="flex-1" />
      {canRemove && (
        <button onClick={onRemove} className="text-zinc-400 hover:text-red-500 flex-shrink-0">
          <Trash2Icon className="size-4" />
        </button>
      )}
    </div>
  );
}

function AlternativasEditor({
  alternativas,
  gabarito,
  onSetGabarito,
  onUpdate,
  onAdd,
  onRemove,
}: {
  alternativas: AlternativaMultipla[];
  gabarito: string;
  onSetGabarito: (letra: string) => void;
  onUpdate: (idx: number, texto: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Alternativas</Label>
      <div className="space-y-2">
        {alternativas.map((alt, idx) => (
          <AlternativaEditorRow
            key={alt.letra}
            alt={alt}
            isGabarito={gabarito === alt.letra}
            canRemove={alternativas.length > 2}
            onSetGabarito={() => onSetGabarito(alt.letra)}
            onUpdate={(texto) => onUpdate(idx, texto)}
            onRemove={() => onRemove(idx)}
          />
        ))}
      </div>
      {alternativas.length < 5 && (
        <Button variant="ghost" size="sm" className="gap-1.5 mt-1" onClick={onAdd}>
          <PlusIcon className="size-3.5" /> Adicionar alternativa
        </Button>
      )}
      <p className="text-xs text-muted-foreground">Clique no círculo ao lado de uma alternativa para marcá-la como correta.</p>
    </div>
  );
}

function GabaritoVF({ gabarito, onSelect }: { gabarito: "V" | "F"; onSelect: (v: "V" | "F") => void }) {
  const style = (val: "V" | "F"): string => {
    if (gabarito !== val) return "border-border hover:border-primary/40";
    return val === "V"
      ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
      : "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400";
  };
  return (
    <div className="space-y-2">
      <Label>Gabarito</Label>
      <div className="flex gap-3">
        {(["V", "F"] as const).map((val) => (
          <button key={val} onClick={() => onSelect(val)} className={`flex-1 rounded-lg border-2 py-3 font-medium transition-colors ${style(val)}`}>
            {val === "V" ? "Verdadeiro" : "Falso"}
          </button>
        ))}
      </div>
    </div>
  );
}

const INITIAL_ALTS: AlternativaMultipla[] = [
  { letra: "A", texto: "" },
  { letra: "B", texto: "" },
  { letra: "C", texto: "" },
  { letra: "D", texto: "" },
];

export function NewQuestaoPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoQuestao>("MULTIPLA_ESCOLHA");
  const [enunciado, setEnunciado] = useState("");
  const [explicacao, setExplicacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [alternativas, setAlternativas] = useState<AlternativaMultipla[]>(INITIAL_ALTS);
  const [gabaritoMultipla, setGabaritoMultipla] = useState("A");
  const [gabaritoVF, setGabaritoVF] = useState<"V" | "F">("V");

  const addAlternativa = (): void => {
    const next = LETRAS[alternativas.length];
    if (!next) return;
    setAlternativas((prev) => [...prev, { letra: next, texto: "" }]);
  };

  const removeAlternativa = (idx: number): void => {
    if (alternativas.length <= 2) return;
    const next = reindexAlternativas(alternativas.filter((_, i) => i !== idx));
    setAlternativas(next);
    if (!next.find((a) => a.letra === gabaritoMultipla)) setGabaritoMultipla(next[0].letra);
  };

  const updateAlternativa = (idx: number, texto: string): void => {
    setAlternativas((prev) => prev.map((a, i) => (i === idx ? { ...a, texto } : a)));
  };

  const handleSave = async (): Promise<void> => {
    const err = validateQuestao(tipo, enunciado, alternativas);
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      await questionsHttp.createQuestao({
        tipo,
        enunciado: enunciado.trim(),
        alternativas: tipo === "MULTIPLA_ESCOLHA" ? alternativas : undefined,
        gabarito: tipo === "MULTIPLA_ESCOLHA" ? gabaritoMultipla : gabaritoVF,
        explicacao: explicacao.trim() || undefined,
      });
      toast.success("Questão criada!");
      router.push("/questions");
    } catch {
      toast.error("Erro ao salvar questão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Nova questão" />

      {/* Formulário: o quadro da página é o padrão, os campos não. */}
      <NarrowColumn className="space-y-6">
        <TipoSelector tipo={tipo} onSelect={setTipo} />

        <div className="space-y-2">
          <Label htmlFor="enunciado">{tipo === "VERDADEIRO_FALSO" ? "Afirmação" : "Enunciado"}</Label>
          <Textarea
            id="enunciado"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            placeholder={tipo === "VERDADEIRO_FALSO" ? "Ex: A água ferve a 100°C ao nível do mar." : "Ex: Qual é a derivada de f(x) = x²?"}
            rows={3}
            className="resize-none"
          />
        </div>

        {tipo === "MULTIPLA_ESCOLHA" && (
          <AlternativasEditor
            alternativas={alternativas}
            gabarito={gabaritoMultipla}
            onSetGabarito={setGabaritoMultipla}
            onUpdate={updateAlternativa}
            onAdd={addAlternativa}
            onRemove={removeAlternativa}
          />
        )}

        {tipo === "VERDADEIRO_FALSO" && <GabaritoVF gabarito={gabaritoVF} onSelect={setGabaritoVF} />}

        <div className="space-y-2">
          <Label htmlFor="explicacao">
            Explicação <span className="text-zinc-400 text-xs">(opcional)</span>
          </Label>
          <Textarea id="explicacao" value={explicacao} onChange={(e) => setExplicacao(e.target.value)} placeholder="Por que esta é a resposta correta..." rows={2} className="resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/questions")}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !enunciado.trim()}>
            {saving ? "Salvando..." : "Salvar questão"}
          </Button>
        </div>
      </NarrowColumn>
    </PageContainer>
  );
}
