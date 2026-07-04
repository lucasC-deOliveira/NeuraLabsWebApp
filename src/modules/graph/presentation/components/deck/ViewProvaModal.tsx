import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { ProvaDetailView, ProvaQuestaoView } from "@/modules/graph/application/ports/graph-prova.port";

interface ViewProvaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provaId: string | null;
}

function VerdadeiroFalso({ gabarito }: { gabarito: string }) {
  const correta = gabarito === "V";
  return (
    <div className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-medium ${correta
      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
      : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"}`}>
      <CheckCircle2Icon className="size-3.5" />
      {correta ? "Verdadeiro" : "Falso"}
    </div>
  );
}

function Alternativas({ questao }: { questao: ProvaQuestaoView }) {
  return (
    <div className="space-y-1">
      {(questao.alternativas ?? []).map((alt) => {
        const correta = alt.letra === questao.gabarito;
        return (
          <div key={alt.letra} className={`flex items-start gap-2 rounded px-2.5 py-1.5 text-sm ${correta
            ? "bg-green-50 font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400"
            : "text-muted-foreground"}`}>
            {correta ? <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0" /> : <span className="w-3.5 shrink-0" />}
            <span className="font-mono text-xs opacity-70">{alt.letra}.</span>
            <span className="min-w-0 flex-1">{alt.texto}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProvaQuestaoCard({ questao, numero }: { questao: ProvaQuestaoView; numero: number }) {
  const isVF = questao.tipo === "VERDADEIRO_FALSO";
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start gap-2.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{numero}</span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">{isVF ? "V/F" : "Múltipla escolha"}</Badge>
            {questao.conceitoNome && <Badge variant="outline" className="text-[10px] text-zinc-500">{questao.conceitoNome}</Badge>}
          </div>
          <p className="text-sm font-medium leading-snug">{questao.enunciado}</p>
        </div>
      </div>
      <div className="ml-8">{isVF ? <VerdadeiroFalso gabarito={questao.gabarito} /> : <Alternativas questao={questao} />}</div>
      {questao.explicacao && (
        <p className="ml-8 rounded bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">{questao.explicacao}</p>
      )}
    </div>
  );
}

export function ViewProvaModal({ open, onOpenChange, provaId }: ViewProvaModalProps) {
  const [loading, setLoading] = useState(false);
  const [prova, setProva] = useState<ProvaDetailView | null>(null);
  const [prevKey, setPrevKey] = useState("");

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && provaId ? provaId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setProva(null); }
  }

  useEffect(() => {
    if (!open || !provaId) return;
    let ignore = false;
    graphHttp.getProva(provaId)
      .then((found): void => {
        if (ignore) return;
        if (found) { setProva(found); return; }
        toast.error("Prova não encontrada");
        onOpenChange(false);
      })
      .catch((): void => { if (!ignore) toast.error("Erro ao carregar a prova"); })
      .finally((): void => { if (!ignore) setLoading(false); });
    return (): void => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary">{prova?.titulo ?? "Carregando..."}</DialogTitle>
          {prova && (
            <DialogDescription>
              {prova.questoes.length} {prova.questoes.length === 1 ? "questão" : "questões"} · gabarito destacado em verde
            </DialogDescription>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2Icon className="size-5 animate-spin" /></div>
        ) : (
          prova && (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {prova.questoes.map((q, i) => <ProvaQuestaoCard key={q.id} questao={q} numero={i + 1} />)}
            </div>
          )
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
