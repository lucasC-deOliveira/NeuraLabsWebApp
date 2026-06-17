"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, FileTextIcon, CopyIcon, AlertCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { generateCommunitySummary } from "@/lib/ai-api";

interface CommunitySummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  communityLabel: string;
  nodeIds: string[];
}

type Step = "loading" | "done" | "error";

export function CommunitySummaryModal({
  open,
  onOpenChange,
  grafoId,
  communityLabel,
  nodeIds,
}: CommunitySummaryModalProps) {
  const [step, setStep] = useState<Step>("loading");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = async () => {
    if (nodeIds.length === 0) return;
    setStep("loading");
    try {
      const res = await generateCommunitySummary(grafoId, nodeIds);
      setTitulo(res.titulo);
      setResumo(res.resumo);
      setStep("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao gerar resumo.");
      setStep("error");
    }
  };

  useEffect(() => {
    if (open && nodeIds.length > 0) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`# ${titulo}\n\n${resumo}`).then(() => {
      toast.success("Copiado!");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-4 text-primary" />
            Resumo de estudo — {communityLabel}
          </DialogTitle>
          <DialogDescription>
            Resumo gerado pela IA a partir dos {nodeIds.length} nós deste cluster.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin text-primary" />
              <p className="font-medium">Gerando resumo de estudo...</p>
              <p className="text-xs text-center max-w-xs">
                A IA está conectando os conceitos do cluster para criar um resumo coerente.
              </p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <AlertCircleIcon className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" size="sm" onClick={load}>Tentar novamente</Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              {titulo && (
                <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
              )}
              <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed font-sans bg-muted/30 rounded-lg p-3">
                {resumo}
              </pre>
            </div>
          )}
        </div>

        <Separator className="my-3 shrink-0" />
        <div className="shrink-0 flex gap-2">
          {step === "done" && (
            <Button variant="outline" className="gap-2" onClick={handleCopy}>
              <CopyIcon className="size-4" />
              Copiar
            </Button>
          )}
          <Button className="flex-1" variant={step === "done" ? "secondary" : "default"} onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
