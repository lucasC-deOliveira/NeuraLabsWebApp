"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2Icon } from "lucide-react";
import { useCardStyle } from "@/components/flashcard/CardStyleProvider";
import { CARD_FRAMES, isFrameImageUrl } from "@/components/flashcard/card-frames";

// A URL só vira CSS se for uma fonte de imagem aceitável; sem aviso, uma URL
// recusada simplesmente não faria nada e pareceria um bug.
function isRejectedUrl(url: string): boolean {
  return url.trim() !== "" && !isFrameImageUrl(url);
}

export function CardFramePicker() {
  const { frameId, setFrameId, frameImageUrl, setFrameImageUrl } = useCardStyle();

  return (
    <div className="space-y-1.5">
      <Label>Moldura</Label>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {CARD_FRAMES.map((frame) => {
          const active = frameId === frame.id;
          return (
            <button
              key={frame.id}
              type="button"
              onClick={() => setFrameId(frame.id)}
              title={frame.name}
              className={`relative rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "border-primary shadow-lg scale-[1.03]" : "border-transparent hover:border-border"
              }`}
            >
              <div className="aspect-[4/3] p-1.5" style={{ background: frame.swatch }}>
                <div className="h-full w-full rounded-md bg-card" />
              </div>
              <div className="px-2 py-1 text-[11px] font-medium text-center truncate bg-card">
                {frame.name}
              </div>
              {active && (
                <div className="absolute top-1.5 right-1.5">
                  <CheckCircle2Icon className="size-3.5 text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {frameId === "image" && (
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="frame-url">Imagem da moldura</Label>
          <Input
            id="frame-url"
            value={frameImageUrl}
            onChange={(e) => setFrameImageUrl(e.target.value)}
            placeholder="https://... ou file:///C:/molduras/dourada.png"
            spellCheck={false}
          />
          <p className="text-[11px] text-muted-foreground">
            Aceita http(s), file:// (imagem local, no app desktop) e data:image. O card assume
            a forma da moldura, então a arte não deforma — e o conteúdo fica por dentro.
          </p>
          {isRejectedUrl(frameImageUrl) && (
            <p className="text-[11px] text-red-500">
              Endereço não aceito. Use http(s), file:// ou data:image, sem aspas nem parênteses.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
