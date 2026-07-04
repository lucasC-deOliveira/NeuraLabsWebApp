"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ManualCardType } from "../../../domain/manual-card";
import { MANUAL_TYPES } from "../../constants/manual-types";

export function ManualTypeSelector({ tipo, onSelect }: { tipo: ManualCardType; onSelect: (t: ManualCardType) => void }) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">2</div>
          <div>
            <CardTitle className="text-sm">Tipo de flashcard</CardTitle>
            <CardDescription className="text-[10px]">Escolha o formato do card.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {MANUAL_TYPES.map((t) => {
            const isSel = tipo === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onSelect(t.value)}
                title={t.description}
                className={`flex flex-col items-center rounded-md border px-2 py-2 text-center transition-colors ${isSel ? "border-primary bg-primary/[0.05]" : "border-zinc-200 dark:border-zinc-700 hover:border-primary/40"}`}
              >
                <div className="text-sm">{t.icon}</div>
                <div className={`text-[10px] font-medium mt-0.5 leading-tight ${isSel ? "text-foreground" : "text-zinc-500"}`}>{t.label}</div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
