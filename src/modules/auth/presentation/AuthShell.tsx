"use client";

import type { ReactNode } from "react";
import { BrainIcon } from "lucide-react";

// Casca das telas de auth: fundo PRETO e um modal dividido — a imagem escolhida
// de um lado, o formulário do outro. Login e cadastro compartilham a casca, cada
// um com a sua imagem, sem duplicar o layout.
export const FIELD_CLASS = "border-white/15 bg-white/5 text-white placeholder:text-white/40";

// Mensagem de erro de um campo (validação do react-hook-form/zod).
export function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-red-300">{message}</p> : null;
}

export function AuthShell({ image, title, subtitle, children }: {
  image: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-black p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl md:min-h-[520px] md:grid-cols-2">
        <div className="relative hidden md:block">
          <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/30">
                <BrainIcon className="size-5 text-red-400" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">NeuraLabs</span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-white">{title}</h1>
            <p className="text-sm text-white/60">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
