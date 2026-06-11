"use client";

import { EyeIcon, EyeOffIcon, ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  legendVisible: boolean;
  onToggleLegend: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function GraphToolbar({
  legendVisible,
  onToggleLegend,
  onZoomIn,
  onZoomOut,
}: Props) {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-1 rounded-md border bg-background/90 backdrop-blur-sm p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onZoomIn}
        title="Aumentar zoom"
      >
        <ZoomInIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onZoomOut}
        title="Diminuir zoom"
      >
        <ZoomOutIcon className="size-4" />
      </Button>
      <div className="h-px w-5 bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onToggleLegend}
        title={legendVisible ? "Ocultar legenda" : "Mostrar legenda"}
      >
        {legendVisible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </Button>
    </div>
  );
}
