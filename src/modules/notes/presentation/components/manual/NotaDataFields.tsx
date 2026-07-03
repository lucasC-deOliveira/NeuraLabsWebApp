"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function FormField({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-sm font-medium ${error ? "text-red-500" : ""}`}>
        {label} {error && <span className="text-[10px] text-red-400">(obrigatorio)</span>}
      </Label>
      {children}
    </div>
  );
}

interface NotaDataFieldsProps {
  titulo: string;
  conteudo: string;
  titleError: boolean;
  contentError: boolean;
  onTitulo: (v: string) => void;
  onConteudo: (v: string) => void;
}

export function NotaDataFields({ titulo, conteudo, titleError, contentError, onTitulo, onConteudo }: NotaDataFieldsProps) {
  const wordCount = useMemo(() => conteudo.trim().split(/\s+/).filter(Boolean).length, [conteudo]);
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">2</div>
          <div>
            <CardTitle className="text-sm">Dados da nota</CardTitle>
            <CardDescription className="text-[10px]">Titulo e conteudo da nota.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 space-y-3">
        <FormField label="Titulo" error={titleError}>
          <Input value={titulo} onChange={(e) => onTitulo(e.target.value)} placeholder="Ex: Aula de Direito - Soberania" className="h-9" />
        </FormField>
        <div className="space-y-1">
          <FormField label="Conteudo" error={contentError}>
            <Textarea value={conteudo} onChange={(e) => onConteudo(e.target.value)} placeholder="Conteudo da nota..." className="min-h-[150px] font-mono text-xs sm:text-sm" rows={8} />
          </FormField>
          {wordCount > 0 && <p className="text-[10px] text-zinc-400">{wordCount} palavras</p>}
        </div>
      </CardContent>
    </Card>
  );
}
