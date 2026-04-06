"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, ArrowLeftIcon, BrainIcon, ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { getNotaById, generateFlashcardsFromNota } from "@/actions/notes";

interface NotaDetail {
  id: string;
  textoBruto: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; tipoRelacao: string }[];
}

export default function NotaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nota, setNota] = useState<NotaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    try {
      const data = await getNotaById(params.id as string);
      setNota(data);
    } catch (err) {
      console.error("Failed to load nota:", err);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerateFlashcards = async () => {
    if (!nota) return;
    setGenerating(true);
    try {
      const result = await generateFlashcardsFromNota(nota.id);
      if (result.flashcards.length > 0) {
        toast.success(`${result.flashcards.length} flashcard(s) gerado(s)!`);
      } else {
        toast.info("Nenhum flashcard pôde ser gerado. Verifique se a nota contém definições ou conceitos vinculados.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar flashcards.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-8 animate-spin text-zinc-400" />
        </div>
      </div>
    );
  }

  if (!nota) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-lg text-zinc-400">Nota não encontrada.</p>
        <Link href="/notes">
          <Button variant="link" className="mt-2">Voltar para notas</Button>
        </Link>
      </div>
    );
  }

  function renderContent(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, i) => {
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="text-xl sm:text-2xl font-bold mt-6 mb-3">
            {line.replace("# ", "")}
          </h1>,
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="text-lg sm:text-xl font-semibold mt-4 mb-2">
            {line.replace("## ", "")}
          </h2>,
        );
      } else if (line.startsWith("- **") || line.startsWith("- ")) {
        const boldMatch = line.match(/^- \*\*(.+?)\*\*:\s?(.*)$/);
        if (boldMatch) {
          elements.push(
            <div key={i} className="text-sm py-1 pl-2 border-l-2 border-zinc-200 dark:border-zinc-700 ml-1">
              <strong>{boldMatch[1]}</strong>: {boldMatch[2]}
            </div>,
          );
        } else {
          elements.push(
            <li key={i} className="text-sm text-zinc-600 dark:text-zinc-300 list-disc ml-4">
              {line.replace(/^-\s*/, "")}
            </li>,
          );
        }
      } else if (line.startsWith("---")) {
        elements.push(<Separator key={i} className="my-4" />);
      } else if (line.trim() === "") {
        // skip
      } else {
        elements.push(
          <p key={i} className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed break-words">
            {line}
          </p>,
        );
      }
    });

    return elements;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-4 sm:space-y-6">
      {/* Nav */}
      <Link href="/notes" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
        <ArrowLeftIcon className="size-4" />
        <span>Voltar para notas</span>
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Detalhes da nota</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Criada em {new Date(nota.dataCriacao).toLocaleString("pt-BR")}
          </p>
        </div>
        <Button
          onClick={handleGenerateFlashcards}
          disabled={generating}
          className="w-full sm:w-auto flex-shrink-0"
        >
          {generating ? (
            <Loader2Icon className="size-4 mr-1 animate-spin" />
          ) : (
            <BrainIcon className="size-4 mr-1" />
          )}
          {generating ? "Gerando..." : "Gerar flashcards"}
        </Button>
      </div>

      <Separator />

      {/* Related concepts */}
      {nota.conceitosRelacionados.length > 0 && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base">Conceitos vinculados</CardTitle>
            <CardDescription className="text-xs">
              Conexões semânticas automáticas encontradas no texto.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="flex flex-wrap gap-2">
              {nota.conceitosRelacionados.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs">{c.nome}</Badge>
                  <span className="text-xs text-zinc-400">{c.tipoRelacao}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base">Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-1 px-3 sm:px-6">
          {renderContent(nota.textoBruto)}
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.push("/flashcards")}
          className="gap-1.5"
        >
          Ver flashcards
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
