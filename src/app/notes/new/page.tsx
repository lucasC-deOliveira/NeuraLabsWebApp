"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, FileTextIcon, ArrowRightIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { createNota } from "@/actions/notes";

export default function NewNotaPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [titulo, setTitulo] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");

  const handlePreview = () => {
    if (!rawText.trim()) {
      toast.error("Cole algum texto antes de visualizar.");
      return;
    }

    // Simple markdown-like preview
    const sections = rawText.split(/^## (.+)$/m).filter(Boolean);
    let rendered = "";

    if (sections.length > 1) {
      // Has markdown headings
      for (let i = 0; i < sections.length; i += 2) {
        const heading = sections[i + 1] || "";
        const content = sections[i + 2] || sections[i] || "";
        rendered += `<h2 class="text-xl font-semibold mt-4 mb-2">${heading}</h2>`;
        rendered += `<p class="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">${content.trim()}</p>`;
      }
    } else {
      rendered = `<p class="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">${rawText}</p>`;
    }

    setPreview(rendered);
    setStep("preview");
  };

  const handleSave = async () => {
    if (!rawText.trim()) return;

    setSubmitting(true);
    try {
      const result = await createNota(rawText, titulo || undefined);

      if (result.matchedConcepts.length > 0) {
        toast.success(
          `Nota criada e vinculada a ${result.matchedConcepts.length} conceito(s)!`,
        );
      } else {
        toast.success("Nota criada! Nenhum conceito correspondente encontrado.");
      }

      router.push(`/notes/${result.notaId}`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar nota. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold">Nova Nota</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Cole texto bruto e transforme em uma nota estruturada com vínculos semânticos.
        </p>
      </div>

      <Separator />

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`flex items-center gap-1.5 font-medium ${step === "input" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}`}>
          <FileTextIcon className="size-4" />
          <span>1. Texto bruto</span>
        </div>
        <ArrowRightIcon className="size-4 text-zinc-300" />
        <div className={`flex items-center gap-1.5 font-medium ${step === "preview" ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400"}`}>
          <SparklesIcon className="size-4" />
          <span>2. Preview</span>
        </div>
        <ArrowRightIcon className="size-4 text-zinc-300" />
        <span className="text-zinc-400">3. Salvar</span>
      </div>

      {step === "input" ? (
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">Texto da nota</CardTitle>
              <CardDescription>
                Cole o conteúdo da aula, artigo ou resumo. O sistema vai extrair seções,
                definições e conectar com conceitos existentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título (opcional)</Label>
                <Input
                  placeholder="Ex: Aula de Direito Constitucional - Soberania"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  placeholder={`Cole aqui o texto...\n\nExemplo:\n# Soberania\nSoberania é o poder supremo do Estado. Define-se como a capacidade de auto-organização e autodeterminação.\n\n# Federalismo\nFederalismo é a forma de organização do Estado onde o poder é dividido entre entes federados.\n\nPrincípios da Administração:\n- Legalidade: só fazer o que a lei permite\n- Impessoalidade: tratar todos sem distinção\n- Moralidade: agir conforme a ética`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  rows={16}
                />
              </div>

              <Button onClick={handlePreview} size="lg" className="w-full">
                <SparklesIcon className="size-4 mr-1" />
                Visualizar nota estruturada
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800">
            <CardHeader>
              <CardTitle>Preview da nota</CardTitle>
              <CardDescription>
                Confirme que a estrutura está correta antes de salvar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {titulo && (
                <h2 className="text-2xl font-semibold mb-4">{titulo}</h2>
              )}
              {preview && <div dangerouslySetInnerHTML={{ __html: preview }} />}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep("input")}>
              Voltar e editar
            </Button>
            <Button onClick={handleSave} disabled={submitting} size="lg">
              {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              Salvar nota
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
