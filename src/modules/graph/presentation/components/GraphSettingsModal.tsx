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
  DEFAULT_CLUSTER_OPTIONS,
  type PhysicsOptions,
  type PhysicsMode,
} from "../services/graph-physics.service";

export const DEFAULT_FOCUS_DEPTH = 1;
export const MAX_FOCUS_DEPTH = 6;

interface GraphSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: PhysicsOptions;
  onChange: (options: PhysicsOptions) => void;
  physicsMode: PhysicsMode;
  onPhysicsModeChange: (mode: PhysicsMode) => void;
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

function PhysicsModeButton({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors text-left ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-xs opacity-70">{subtitle}</div>
    </button>
  );
}

export function GraphSettingsModal({
  open,
  onOpenChange,
  options,
  onChange,
  physicsMode,
  onPhysicsModeChange,
  focusDepth,
  onFocusDepthChange,
}: GraphSettingsModalProps) {
  const set = (patch: Partial<PhysicsOptions>) => onChange({ ...options, ...patch });

  const switchMode = (mode: PhysicsMode) => {
    onPhysicsModeChange(mode);
    onChange(mode === "cluster" ? DEFAULT_CLUSTER_OPTIONS : DEFAULT_PHYSICS_OPTIONS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] max-w-md flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Configurações do gráfico</DialogTitle>
          <DialogDescription>
            Física inspirada no vis-network. As mudanças valem na hora, com a
            física ligada.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-4">
          <div className="space-y-2">
            <Label>Modo de física</Label>
            <div className="grid grid-cols-2 gap-2">
              <PhysicsModeButton
                active={physicsMode === "default"}
                onClick={() => switchMode("default")}
                title="Padrão"
                subtitle="Hierárquico · assunto no centro"
              />
              <PhysicsModeButton
                active={physicsMode === "cluster"}
                onClick={() => switchMode("cluster")}
                title="Clusters"
                subtitle="Agrupa por tipo de nó"
              />
            </div>
          </div>

          <PhysicsSlider
            id="gravitational-constant"
            label="Repulsão entre nós"
            description="Quão forte os nós se afastam uns dos outros. Maior = grafo mais espalhado."
            value={options.gravitationalConstant}
            min={0}
            max={8000}
            step={100}
            onChange={(v) => set({ gravitationalConstant: v })}
          />

          <PhysicsSlider
            id="central-gravity"
            label="Gravidade central"
            description="Atração de todos os nós para o centro. Maior = grafo mais compacto e coeso."
            value={options.centralGravity}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set({ centralGravity: v })}
          />

<PhysicsSlider
            id="spring-constant"
            label="Rigidez das arestas"
            description="Quão forte as relações puxam os nós para o comprimento ideal."
            value={options.springConstant}
            min={0}
            max={0.2}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(v) => set({ springConstant: v })}
          />

          <PhysicsSlider
            id="damping"
            label="Atrito"
            description="Quão rápido o movimento desacelera. Maior = estabiliza mais rápido."
            value={options.damping}
            min={0.05}
            max={0.95}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set({ damping: v })}
          />

          <PhysicsSlider
            id="avoid-overlap"
            label="Evitar sobreposição"
            description="Quanto o tamanho dos nós empurra a repulsão para que não se sobreponham."
            value={options.avoidOverlap}
            min={0}
            max={1}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => set({ avoidOverlap: v })}
          />

          <PhysicsSlider
            id="cluster-repulsion"
            label="Repulsão de clusters"
            description="Empurra grupos inteiros uns dos outros, agindo nos centróides. 0 = desativado."
            value={options.clusterRepulsion ?? 0}
            min={0}
            max={60000}
            step={1000}
            format={(v) => v === 0 ? "off" : `${(v/1000).toFixed(0)}k`}
            onChange={(v) => set({ clusterRepulsion: v })}
          />

          <PhysicsSlider
            id="min-gap"
            label="Distância mínima entre nós"
            description="Folga mínima obrigatória entre bordas de nós. A física nunca viola este valor — é uma restrição rígida pós-integração."
            value={options.minGap ?? 10}
            min={0}
            max={80}
            step={2}
            format={(v) => `${v}px`}
            onChange={(v) => set({ minGap: v })}
          />

          {physicsMode === "default" && (
            <PhysicsSlider
              id="orbital-strength"
              label="Força orbital"
              description="Mantém nós filhos em órbita ao redor do pai, formando anéis concêntricos."
              value={options.orbitalStrength ?? 0.08}
              min={0}
              max={0.25}
              step={0.01}
              format={(v) => v.toFixed(2)}
              onChange={(v) => set({ orbitalStrength: v })}
            />
          )}

          {physicsMode === "cluster" && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="avoid-cluster-overlap">Evitar sobreposição de clusters</Label>
                  <p className="text-xs text-muted-foreground">Impede que os bounding circles dos clusters se sobreponham.</p>
                </div>
                <button
                  id="avoid-cluster-overlap"
                  role="switch"
                  aria-checked={options.avoidClusterOverlap ?? false}
                  onClick={() => set({ avoidClusterOverlap: !(options.avoidClusterOverlap ?? false) })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${options.avoidClusterOverlap ? "bg-primary" : "bg-input"}`}
                >
                  <span className={`pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform ${options.avoidClusterOverlap ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <PhysicsSlider
                id="cluster-strength"
                label="Atração de cluster"
                description="Força com que cada nó é atraído para o centro do seu grupo. Maior = clusters mais compactos."
                value={options.clusterStrength ?? 0.14}
                min={0}
                max={0.4}
                step={0.01}
                format={(v) => v.toFixed(2)}
                onChange={(v) => set({ clusterStrength: v })}
              />
              <PhysicsSlider
                id="inter-group-repulsion"
                label="Repulsão entre grupos"
                description="Multiplicador da repulsão entre nós de tipos diferentes. Maior = clusters mais separados."
                value={options.interGroupRepulsion ?? 4}
                min={1}
                max={10}
                step={0.5}
                format={(v) => v.toFixed(1) + "×"}
                onChange={(v) => set({ interGroupRepulsion: v })}
              />
            </>
          )}

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
          <Button
            variant="outline"
            onClick={() => onChange(physicsMode === "cluster" ? { ...DEFAULT_CLUSTER_OPTIONS } : { ...DEFAULT_PHYSICS_OPTIONS })}
          >
            Restaurar padrão
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
