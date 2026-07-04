"use client";

import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubjectSummary } from "../../domain/dashboard.types";

export function SubjectsGrid({ loading, subjects }: { loading: boolean; subjects: SubjectSummary[] }) {
  return (
    <section className="mb-6 sm:mb-8">
      <h2 className="mb-3 text-base sm:text-lg font-semibold">Matérias</h2>
      {loading ? (
        <p className="text-xs sm:text-sm text-zinc-400">Carregando matérias...</p>
      ) : subjects.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700">
          <CardContent className="py-6 sm:py-8 text-center">
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">Nenhuma matéria cadastrada ainda.</p>
            <Link href="/flashcards/new">
              <Button variant="link" className="mt-1">Criar o primeira</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <Link key={subject.id} href={`/subjects/${subject.id}`}>
              <Card className="cursor-pointer transition-colors hover:border-zinc-300 dark:hover:border-zinc-600 border-zinc-200 dark:border-zinc-800 h-full">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <CardTitle className="text-sm sm:text-base">{subject.nome}</CardTitle>
                  {subject.descricao && <CardDescription className="text-xs">{subject.descricao}</CardDescription>}
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <Badge variant="secondary" className="text-xs">
                    {subject.topicoCount} {subject.topicoCount === 1 ? "tópico" : "tópicos"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
