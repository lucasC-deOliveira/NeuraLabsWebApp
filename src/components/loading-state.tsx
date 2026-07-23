"use client";

import { Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Estado de carregamento que DIZ o que está fazendo (não só um spinner). O
// aria-live faz leitores de tela anunciarem a mensagem.
export function LoadingState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2Icon className="size-6 animate-spin text-primary" />
      <p className="font-medium text-foreground">{message}</p>
      {hint && <p className="max-w-xs text-center text-xs">{hint}</p>}
    </div>
  );
}

// Estado de erro com mensagem clara e ação de recuperação.
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground"
      role="alert"
    >
      <AlertTriangleIcon className="size-6 text-destructive" />
      <p className="max-w-sm text-center text-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
