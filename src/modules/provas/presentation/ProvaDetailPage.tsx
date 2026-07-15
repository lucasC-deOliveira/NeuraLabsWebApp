"use client";

import { PageHeader } from "@/components/page-header/PageHeader";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EyeIcon, EyeOffIcon, ListIcon, KeyIcon } from "lucide-react";
import { toast } from "sonner";
import { provasHttp } from "../infra/http";
import type { ProvaDetail } from "../domain/prova.types";
import { ProvaQuestaoCard, GabaritoCompacto } from "./components/ProvaQuestaoCard";

type Tab = "questoes" | "gabarito";

export function ProvaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [prova, setProva] = useState<ProvaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("questoes");
  const [showGabarito, setShowGabarito] = useState(false);

  useEffect(() => {
    if (!id) return;
    provasHttp
      .getProva(id)
      .then(setProva)
      .catch(() => { toast.error("Prova não encontrada"); router.push("/provas"); })
      .finally(() => setLoading(false));
    // Load once per id; useRouter returns a fresh object each render (unstable dep).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!prova) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PageHeader
        title={prova.titulo}
        subtitle={
          <span className="flex flex-col gap-2">
            {prova.descricao && <span>{prova.descricao}</span>}
            <span>
              <Badge variant="outline" className="text-xs">
                {prova.questoes.length} {prova.questoes.length === 1 ? "questão" : "questões"}
              </Badge>
            </span>
          </span>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
        <button
          onClick={() => setTab("questoes")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "questoes"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ListIcon className="size-4" /> Questões
        </button>
        <button
          onClick={() => setTab("gabarito")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            tab === "gabarito"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyIcon className="size-4" /> Gabarito
        </button>
      </div>

      {tab === "questoes" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
              onClick={() => setShowGabarito((v) => !v)}
            >
              {showGabarito ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              {showGabarito ? "Ocultar gabarito" : "Ver gabarito"}
            </Button>
          </div>
          {prova.questoes.map((pq, i) => (
            <ProvaQuestaoCard key={pq.id} pq={pq} numero={i + 1} showGabarito={showGabarito} />
          ))}
        </div>
      )}

      {tab === "gabarito" && (
        <div className="space-y-4">
          <GabaritoCompacto questoes={prova.questoes} />

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Gabarito detalhado</p>
            {prova.questoes.map((pq, i) => (
              <ProvaQuestaoCard key={pq.id} pq={pq} numero={i + 1} showGabarito={true} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
