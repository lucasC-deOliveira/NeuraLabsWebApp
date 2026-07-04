"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubtipoNota } from "../../../domain/nota.types";
import { SUBTIPO_CONFIG, type SubtipoConfigEntry } from "../../constants/subtipo-config";

export function SubtipoSelector({ subtipo, onToggle }: {
  subtipo: SubtipoNota | null;
  onToggle: (cfg: SubtipoConfigEntry, selected: boolean) => void;
}) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="px-3 sm:px-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">1</div>
          <div>
            <CardTitle className="text-sm">Tipo de conteúdo</CardTitle>
            <CardDescription className="text-[10px]">O que esta nota representa? Isso guia o template.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUBTIPO_CONFIG.map((cfg) => {
            const Icon = cfg.icon;
            const sel = subtipo === cfg.value;
            return (
              <button
                key={cfg.value}
                type="button"
                onClick={() => onToggle(cfg, sel)}
                className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors ${sel ? "border-primary bg-primary/[0.05]" : "border-zinc-200 dark:border-zinc-700 hover:border-primary/40"}`}
              >
                <Icon className={`size-4 ${sel ? "text-primary" : "text-zinc-400"}`} />
                <span className={`text-xs font-medium leading-tight ${sel ? "text-primary" : ""}`}>{cfg.label}</span>
                <span className="text-[10px] text-zinc-400 leading-tight">{cfg.desc}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
