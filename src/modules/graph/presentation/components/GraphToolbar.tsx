"use client";

import {
  ContrastIcon,
  EyeIcon,
  EyeOffIcon,
  OrbitIcon,
  SettingsIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  legendVisible: boolean;
  onToggleLegend: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  physicsEnabled: boolean;
  onTogglePhysics: () => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  onOpenSettings: () => void;
};

function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon"
            className={`size-8 text-primary ${active ? "ring-1 ring-primary/50" : ""}`}
            onClick={onClick}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function GraphToolbar({
  legendVisible,
  onToggleLegend,
  onZoomIn,
  onZoomOut,
  physicsEnabled,
  onTogglePhysics,
  highContrast,
  onToggleHighContrast,
  onOpenSettings,
}: Props) {
  return (
    <TooltipProvider delay={200}>
      <div className="graph-toolbar absolute bottom-3 right-3 z-10 flex flex-row items-center gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-sm">
        <ToolbarButton label="Aumentar zoom" onClick={onZoomIn}>
          <ZoomInIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Diminuir zoom" onClick={onZoomOut}>
          <ZoomOutIcon className="size-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border" />

        <ToolbarButton
          label={physicsEnabled ? "Desligar física" : "Ligar física (órbita lenta)"}
          active={physicsEnabled}
          onClick={onTogglePhysics}
        >
          <OrbitIcon className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          label={highContrast ? "Desligar alto contraste" : "Alto contraste (tudo na cor do tema)"}
          active={highContrast}
          onClick={onToggleHighContrast}
        >
          <ContrastIcon className="size-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-border" />

        <ToolbarButton
          label={legendVisible ? "Ocultar legenda" : "Mostrar legenda"}
          onClick={onToggleLegend}
        >
          {legendVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </ToolbarButton>

        <div className="w-px h-5 bg-border" />

        <ToolbarButton label="Configurações do gráfico" onClick={onOpenSettings}>
          <SettingsIcon className="size-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}
