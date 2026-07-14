"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_CLUSTER_OPTIONS,
  type PhysicsOptions,
} from "../services/graph-physics.service";

export const DEFAULT_FOCUS_DEPTH = 1;
export const MAX_FOCUS_DEPTH = 6;

interface GraphSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: PhysicsOptions;
  onChange: (options: PhysicsOptions) => void;
  focusDepth: number;
  onFocusDepthChange: (depth: number) => void;
}

function PhysicsSlider({
  id,
  label,
  description,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-mono text-primary">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function GraphSettingsModal({
  open,
  onOpenChange,
  options,
  onChange,
  focusDepth,
  onFocusDepthChange,
}: GraphSettingsModalProps) {
  const set = (patch: Partial<PhysicsOptions>) => onChange({ ...options, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] max-w-md flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Configurações do gráfico</DialogTitle>
          <DialogDescription>
            As mudanças valem na hora e ficam salvas para as próximas sessões.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
          <PhysicsSlider
            id="gravitational-constant"
            label="Espalhamento"
            description="Quão forte os nós se afastam uns dos outros. Maior = grafo mais espalhado."
            value={options.gravitationalConstant}
            min={0}
            max={8000}
            step={100}
            onChange={(v) => set({ gravitationalConstant: v })}
          />

          <PhysicsSlider
            id="central-gravity"
            label="Coesão"
            description="Atração de todos os nós para o centro. Maior = grafo mais compacto e coeso."
            value={options.centralGravity}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set({ centralGravity: v })}
          />

          <PhysicsSlider
            id="min-gap"
            label="Espaçamento entre nós"
            description="Folga mínima garantida entre os nós. Maior = mais respiro; a física nunca deixa os nós mais perto que isto."
            value={options.minGap ?? 10}
            min={0}
            max={80}
            step={2}
            format={(v) => `${v}px`}
            onChange={(v) => set({ minGap: v })}
          />

          <div className="space-y-1.5 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="focus-depth">Destaque de conexões — saltos</Label>
              <span className="text-sm font-mono text-primary">{focusDepth}</span>
            </div>
            <input
              id="focus-depth"
              type="range"
              min={1}
              max={MAX_FOCUS_DEPTH}
              step={1}
              value={focusDepth}
              onChange={(e) => onFocusDepthChange(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <p className="text-xs text-muted-foreground">
              Ao selecionar um nó com o destaque ativo, quantos níveis da cadeia de
              relações ficam visíveis (1 = só os vizinhos diretos).
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onChange({ ...DEFAULT_CLUSTER_OPTIONS })}>
            Restaurar padrão
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
