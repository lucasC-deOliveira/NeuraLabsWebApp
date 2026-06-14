"use client";

import {
  BoxIcon,
  ContrastIcon,
  EyeIcon,
  EyeOffIcon,
  FocusIcon,
  OrbitIcon,
  SettingsIcon,
  SquareIcon,
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
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenSettings: () => void;
  is3D: boolean;
  onToggle3D: () => void;
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
  focusMode,
  onToggleFocus,
  onOpenSettings,
  is3D,
  onToggle3D,
}: Props) {
  return (
    <TooltipProvider delay={200}>
      <div className="graph-toolbar absolute bottom-3 right-3 z-10 flex flex-row items-center gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-sm">
        {!is3D && (
          <>
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
          </>
        )}

        <ToolbarButton
          label={highContrast ? "Desligar alto contraste" : "Alto contraste (tudo na cor do tema)"}
          active={highContrast}
          onClick={onToggleHighContrast}
        >
          <ContrastIcon className="size-4" />
        </ToolbarButton>

        {!is3D && (
          <ToolbarButton
            label={focusMode ? "Desligar destaque de conexões" : "Destacar conexões (ofusca o resto ao selecionar)"}
            active={focusMode}
            onClick={onToggleFocus}
          >
            <FocusIcon className="size-4" />
          </ToolbarButton>
        )}

        <div className="w-px h-5 bg-border" />

        <ToolbarButton
          label={legendVisible ? "Ocultar legenda" : "Mostrar legenda"}
          onClick={onToggleLegend}
        >
          {legendVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </ToolbarButton>

        <ToolbarButton
          label={is3D ? "Voltar para 2D" : "Visualização 3D"}
          active={is3D}
          onClick={onToggle3D}
        >
          {is3D ? <SquareIcon className="size-4" /> : <BoxIcon className="size-4" />}
        </ToolbarButton>

        <div className="w-px h-5 bg-border" />

        <ToolbarButton label="Configurações do gráfico" onClick={onOpenSettings}>
          <SettingsIcon className="size-4" />
        </ToolbarButton>
      </div>
    </TooltipProvider>
  );
}
