"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftIcon, CheckCircle2Icon, CircleIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { createQuestao, type TipoQuestao, type AlternativaMultipla } from "@/lib/questions-api";

const LETRAS = ["A", "B", "C", "D", "E"];

export default function NewQuestaoPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoQuestao>("MULTIPLA_ESCOLHA");
  const [enunciado, setEnunciado] = useState("");
  const [explicacao, setExplicacao] = useState("");
  const [saving, setSaving] = useState(false);

  // Múltipla escolha
  const [alternativas, setAlternativas] = useState<AlternativaMultipla[]>([
    { letra: "A", texto: "" },
    { letra: "B", texto: "" },
    { letra: "C", texto: "" },
    { letra: "D", texto: "" },
  ]);
  const [gabaritoMultipla, setGabaritoMultipla] = useState<string>("A");

  // Verdadeiro/Falso
  const [gabaritoVF, setGabaritoVF] = useState<"V" | "F">("V");

  const addAlternativa = () => {
    const next = LETRAS[alternativas.length];
    if (!next) return;
    setAlternativas((prev) => [...prev, { letra: next, texto: "" }]);
  };

  const removeAlternativa = (idx: number) => {
    if (alternativas.length <= 2) return;
    const next = alternativas.filter((_, i) => i !== idx).map((a, i) => ({ ...a, letra: LETRAS[i] }));
    setAlternativas(next);
    if (!next.find((a) => a.letra === gabaritoMultipla)) setGabaritoMultipla(next[0].letra);
  };

  const updateAlternativa = (idx: number, texto: string) => {
    setAlternativas((prev) => prev.map((a, i) => i === idx ? { ...a, texto } : a));
  };

  const handleSave = async () => {
    if (!enunciado.trim()) { toast.error("Informe o enunciado."); return; }
    if (tipo === "MULTIPLA_ESCOLHA" && alternativas.some((a) => !a.texto.trim())) {
      toast.error("Preencha todas as alternativas."); return;
    }
    setSaving(true);
    try {
      await createQuestao({
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
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => router.push("/questions")}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-xl font-bold">Nova questão</h1>
      </div>

      <div className="space-y-6">
        {/* Tipo */}
        <div className="space-y-2">
          <Label>Tipo</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["MULTIPLA_ESCOLHA", "VERDADEIRO_FALSO"] as TipoQuestao[]).map((t) => (
              <button
                key={t}
                onClick={() => setTipo(t)}
                className={`rounded-lg border-2 p-3 text-left transition-colors ${
                  tipo === t
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="font-medium text-sm">
                  {t === "MULTIPLA_ESCOLHA" ? "Múltipla escolha" : "Verdadeiro ou Falso"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t === "MULTIPLA_ESCOLHA"
                    ? "Alternativas A / B / C / D com uma correta"
                    : "Afirmação que é verdadeira ou falsa"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Enunciado */}
        <div className="space-y-2">
          <Label htmlFor="enunciado">
            {tipo === "VERDADEIRO_FALSO" ? "Afirmação" : "Enunciado"}
          </Label>
          <Textarea
            id="enunciado"
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            placeholder={
              tipo === "VERDADEIRO_FALSO"
                ? "Ex: A água ferve a 100°C ao nível do mar."
                : "Ex: Qual é a derivada de f(x) = x²?"
            }
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Alternativas (múltipla escolha) */}
        {tipo === "MULTIPLA_ESCOLHA" && (
          <div className="space-y-2">
            <Label>Alternativas</Label>
            <div className="space-y-2">
              {alternativas.map((alt, idx) => (
                <div key={alt.letra} className="flex items-center gap-2">
                  <button
                    onClick={() => setGabaritoMultipla(alt.letra)}
                    className={`flex-shrink-0 rounded-full size-7 flex items-center justify-center border-2 transition-colors ${
                      gabaritoMultipla === alt.letra
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-600"
                        : "border-border text-muted-foreground hover:border-primary/60"
                    }`}
                    title="Marcar como gabarito"
                  >
                    {gabaritoMultipla === alt.letra
                      ? <CheckCircle2Icon className="size-3.5" />
                      : <span className="text-xs font-mono">{alt.letra}</span>
                    }
                  </button>
                  <Input
                    value={alt.texto}
                    onChange={(e) => updateAlternativa(idx, e.target.value)}
                    placeholder={`Alternativa ${alt.letra}`}
                    className="flex-1"
                  />
                  {alternativas.length > 2 && (
                    <button
                      onClick={() => removeAlternativa(idx)}
                      className="text-zinc-400 hover:text-red-500 flex-shrink-0"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {alternativas.length < 5 && (
              <Button variant="ghost" size="sm" className="gap-1.5 mt-1" onClick={addAlternativa}>
                <PlusIcon className="size-3.5" /> Adicionar alternativa
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Clique no círculo ao lado de uma alternativa para marcá-la como correta.
            </p>
          </div>
        )}

        {/* Gabarito V/F */}
        {tipo === "VERDADEIRO_FALSO" && (
          <div className="space-y-2">
            <Label>Gabarito</Label>
            <div className="flex gap-3">
              {(["V", "F"] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setGabaritoVF(val)}
                  className={`flex-1 rounded-lg border-2 py-3 font-medium transition-colors ${
                    gabaritoVF === val
                      ? val === "V"
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                        : "border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {val === "V" ? "Verdadeiro" : "Falso"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Explicação */}
        <div className="space-y-2">
          <Label htmlFor="explicacao">
            Explicação <span className="text-zinc-400 text-xs">(opcional)</span>
          </Label>
          <Textarea
            id="explicacao"
            value={explicacao}
            onChange={(e) => setExplicacao(e.target.value)}
            placeholder="Por que esta é a resposta correta..."
            rows={2}
            className="resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => router.push("/questions")}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !enunciado.trim()}>
            {saving ? "Salvando..." : "Salvar questão"}
          </Button>
        </div>
      </div>
    </div>
  );
}
