"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { VerNoGrafo } from "@/components/graph/VerNoGrafo";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSpeech } from "@/components/speech/useSpeech";
import { SpeakButton } from "@/components/speech/SpeakButton";
import { SpokenText } from "@/components/speech/SpokenText";
import { Loader2Icon, BrainIcon, ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";
import { notesHttp } from "../infra/http";
import type { NotaDetail } from "../domain/nota.types";
import { formatSubtipoLabel } from "../domain/services/nota-format";

function NotaLoading() {
  return (
    <PageContainer>
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-8 animate-spin text-zinc-400" />
      </div>
    </PageContainer>
  );
}

function NotaNotFound() {
  return (
    <PageContainer className="py-20 text-center">
      <p className="text-lg text-zinc-400">Nota não encontrada.</p>
      <Link href="/notes">
        <Button variant="link" className="mt-2">Voltar para notas</Button>
      </Link>
    </PageContainer>
  );
}

export function NotaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [nota, setNota] = useState<NotaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const speech = useSpeech();

  useEffect(() => {
    if (!params.id) return;
    notesHttp
      .getNotaById(params.id as string)
      .then(setNota)
      .catch((err) => console.error("Failed to load nota:", err))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleGenerateFlashcards = async (): Promise<void> => {
    if (!nota) return;
    setGenerating(true);
    try {
      const result = await notesHttp.generateFlashcards(nota.id);
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

  if (loading) return <NotaLoading />;
  if (!nota) return <NotaNotFound />;

  return (
    <PageContainer className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Detalhes da nota"
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {nota.subtipo && (
              <Badge variant="outline" className="text-xs text-violet-600 border-violet-300 dark:border-violet-700 dark:text-violet-400">
                {formatSubtipoLabel(nota.subtipo)}
              </Badge>
            )}
            <span>Criada em {new Date(nota.dataCriacao).toLocaleString("pt-BR")}</span>
          </span>
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <VerNoGrafo tipo="NOTA" refId={nota.id} />
            <Button onClick={handleGenerateFlashcards} disabled={generating} className="flex-shrink-0">
              {generating ? <Loader2Icon className="size-4 mr-1 animate-spin" /> : <BrainIcon className="size-4 mr-1" />}
              {generating ? "Gerando flashcards…" : "Gerar flashcards"}
            </Button>
          </span>
        }
      />

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

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm sm:text-base">Conteúdo</CardTitle>
            <SpeakButton speech={speech} id="nota" text={nota.conteudo} label="a nota" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pt-1 px-3 sm:px-6">
          <SpokenText speech={speech} id="nota" text={nota.conteudo} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.push("/flashcards")} className="gap-1.5">
          Ver flashcards
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </PageContainer>
  );
}
