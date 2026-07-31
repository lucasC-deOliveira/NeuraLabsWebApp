"use client";

import type { ReactNode } from "react";
import { BrainIcon } from "lucide-react";

// Casca imersiva das telas de auth: a imagem escolhida ocupa a tela inteira
// (sem fundo cosmos) e o formulário flutua num card de vidro. Login e cadastro
// compartilham a casca, cada um com a sua imagem — sem duplicar o layout.
export const FIELD_CLASS = "border-white/15 bg-white/5 text-white placeholder:text-white/40";

export function AuthShell({ image, title, subtitle, children }: {
  image: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <img src={image} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-zinc-950/90 via-zinc-950/70 to-zinc-950/90" />

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/30">
            <BrainIcon className="size-5 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="text-sm text-white/60">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
