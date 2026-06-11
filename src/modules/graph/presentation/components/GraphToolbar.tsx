"use client";

import {
  EyeIcon,
  EyeOffIcon,
  OrbitIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  legendVisible: boolean;
  onToggleLegend: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  physicsEnabled: boolean;
  onTogglePhysics: () => void;
};

export function GraphToolbar({
  legendVisible,
  onToggleLegend,
  onZoomIn,
  onZoomOut,
  physicsEnabled,
  onTogglePhysics,
}: Props) {
  return (
    <div className="graph-toolbar absolute bottom-3 right-3 z-10 flex flex-row items-center gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-primary"
        onClick={onZoomIn}
        title="Aumentar zoom"
      >
        <ZoomInIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-primary"
        onClick={onZoomOut}
        title="Diminuir zoom"
      >
        <ZoomOutIcon className="size-4" />
      </Button>

      <div className="w-px h-5 bg-border" />

      <Button
        variant={physicsEnabled ? "secondary" : "ghost"}
        size="icon"
        className={`size-8 text-primary ${physicsEnabled ? "ring-1 ring-primary/50" : ""}`}
        onClick={onTogglePhysics}
        title={physicsEnabled ? "Desligar física" : "Ligar física (órbita lenta)"}
      >
        <OrbitIcon className="size-4" />
      </Button>

      <div className="w-px h-5 bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-primary"
        onClick={onToggleLegend}
        title={legendVisible ? "Ocultar legenda" : "Mostrar legenda"}
      >
        {legendVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </Button>
    </div>
  );
}
