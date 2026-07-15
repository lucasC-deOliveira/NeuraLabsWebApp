"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2Icon, ListOrderedIcon } from "lucide-react";
import { STUDY_ORDERS, type StudyOrder } from "@/lib/study-order";
import { loadStudyOrder, saveStudyOrder } from "@/lib/study-order-preference";

export function StudyOrderSection() {
  const [order, setOrder] = useState<StudyOrder>(loadStudyOrder);

  const escolher = (id: StudyOrder): void => {
    setOrder(id);
    saveStudyOrder(id);
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <ListOrderedIcon className="size-5" />
          Ordem da sessão
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Em que ordem os cards vencidos aparecem ao estudar um baralho. Não muda quando cada
          card volta — só qual deles você vê primeiro.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 space-y-2">
        {STUDY_ORDERS.map((opcao) => {
          const ativo = order === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              onClick={() => escolher(opcao.id)}
              aria-pressed={ativo}
              className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                ativo ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <CheckCircle2Icon
                className={`size-4 shrink-0 mt-0.5 ${ativo ? "text-primary" : "text-muted-foreground/30"}`}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{opcao.titulo}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{opcao.descricao}</span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
