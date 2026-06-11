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
  DEFAULT_PHYSICS_OPTIONS,
  type PhysicsOptions,
} from "../services/graph-physics.service";

interface GraphSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: PhysicsOptions;
  onChange: (options: PhysicsOptions) => void;
}

function GapSlider({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-sm font-mono text-primary">{value}px</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={400}
        step={10}
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
}: GraphSettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurações do gráfico</DialogTitle>
          <DialogDescription>
            Ajustes da física. As mudanças valem na hora, com a física ligada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <GapSlider
            id="repulsion-gap"
            label="Repulsão entre nós"
            description="Folga mínima entre as bordas de dois nós — nenhum nó invade esse espaço."
            value={options.repulsionGap}
            onChange={(v) => onChange({ ...options, repulsionGap: v })}
          />

          <GapSlider
            id="cluster-gap"
            label="Distância mínima dos aglomerados"
            description="Quão perto os nós relacionados tentam ficar das suas origens."
            value={options.clusterGap}
            onChange={(v) => onChange({ ...options, clusterGap: v })}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onChange({ ...DEFAULT_PHYSICS_OPTIONS })}
          >
            Restaurar padrão
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
