"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "@/lib/navigation";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header/PageHeader";
import {
  PlusIcon, PlayIcon, Loader2Icon, LayersIcon, NetworkIcon, CheckIcon, PencilIcon,
} from "lucide-react";
import { toast } from "sonner";
import { baralhosHttp } from "../infra/http";
import { excludeCardsInDeck } from "../domain/services/filter-card-options";
import { AddCardsDialog } from "./components/AddCardsDialog";
import { BaralhoCardRow } from "./components/BaralhoCardRow";
import { StudyDeckModal } from "@/modules/graph/presentation/components/deck/StudyDeckModal";
import type { BaralhoCardOption, BaralhoDetail } from "../domain/baralho.types";

export function BaralhoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const baralhoId = id ?? "";
  const [baralho, setBaralho] = useState<BaralhoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<BaralhoCardOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [studying, setStudying] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [renaming, setRenaming] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const detail = await baralhosHttp.getBaralho(baralhoId);
    setBaralho(detail);
    setTitulo(detail.titulo);
    setLoading(false);
  }, [baralhoId]);

  useEffect(() => {
    let cancelled = false;
    baralhosHttp
      .getBaralho(baralhoId)
      .then((detail): void => {
        if (cancelled) return;
        setBaralho(detail);
        setTitulo(detail.titulo);
        setLoading(false);
      })
      .catch((): void => { if (!cancelled) setLoading(false); });
    return (): void => { cancelled = true; };
  }, [baralhoId]);

  // Só oferece cartões que ainda não estão no baralho.
  const available = useMemo(
    () => excludeCardsInDeck(options, baralho?.cards.map((c) => c.id) ?? []),
    [options, baralho],
  );

  const openAdd = async (): Promise<void> => {
    setAdding(true);
    setLoadingOptions(true);
    try {
      setOptions(await baralhosHttp.listAvailableCards());
    } catch {
      toast.error("Erro ao carregar seus flashcards.");
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleAdd = async (flashcardIds: string[]): Promise<void> => {
    setSubmitting(true);
    try {
      await baralhosHttp.addCards(baralhoId, flashcardIds);
      toast.success(`${flashcardIds.length} cartão(ões) adicionado(s)!`);
      setAdding(false);
      await load();
    } catch {
      toast.error("Erro ao adicionar os cartões.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (flashcardId: string): Promise<void> => {
    try {
      await baralhosHttp.removeCard(baralhoId, flashcardId);
      toast.success("Cartão removido do baralho.");
      await load();
    } catch {
      toast.error("Erro ao remover o cartão.");
    }
  };

  const handleRename = async (): Promise<void> => {
    if (!titulo.trim() || titulo === baralho?.titulo) { setRenaming(false); return; }
    try {
      await baralhosHttp.renameBaralho(baralhoId, titulo);
      toast.success("Baralho renomeado!");
      setRenaming(false);
      await load();
    } catch {
      toast.error("Erro ao renomear. Use um título de até 120 caracteres.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!baralho) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        <LayersIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
        <p className="text-lg font-medium">Baralho não encontrado.</p>
        <Link href="/baralhos"><Button variant="link" className="mt-2">Voltar para os baralhos</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
      {renaming ? (
        <div className="flex items-center gap-2">
          <Input
            value={titulo}
            autoFocus
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); }}
          />
          <Button size="sm" onClick={handleRename}><CheckIcon className="size-3.5" /></Button>
        </div>
      ) : (
        <PageHeader
          title={baralho.titulo}
          subtitle={
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <LayersIcon className="size-2.5" />
                {baralho.cards.length} cartão{baralho.cards.length !== 1 && "es"}
              </Badge>
              {baralho.origens.map((origem) => (
                <Link key={origem.grafoId} href={`/graph/${origem.grafoId}`}>
                  <Badge variant="outline" className="gap-1 text-[10px] font-normal text-muted-foreground hover:text-foreground">
                    <NetworkIcon className="size-2.5" />
                    {origem.nome}
                  </Badge>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => setRenaming(true)}
                title="Renomear baralho"
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
              >
                <PencilIcon className="size-3" />
                Renomear
              </button>
            </span>
          }
          actions={
            <>
              <Button variant="outline" className="h-9" onClick={openAdd}>
                <PlusIcon className="size-4 mr-1" />
                Adicionar cartões
              </Button>
              <Button className="h-9" disabled={baralho.cards.length === 0} onClick={() => setStudying(true)}>
                <PlayIcon className="size-4 mr-1" />
                Estudar
              </Button>
            </>
          }
        />
      )}

      {baralho.cards.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <LayersIcon className="size-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-lg font-medium">Baralho vazio.</p>
          <p className="text-sm text-zinc-400 mt-1">Adicione cartões para começar a estudar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {baralho.cards.map((card) => (
            <BaralhoCardRow key={card.id} card={card} onRemove={() => handleRemove(card.id)} />
          ))}
        </div>
      )}

      <AddCardsDialog
        open={adding}
        onOpenChange={setAdding}
        options={available}
        loading={loadingOptions}
        submitting={submitting}
        onAdd={handleAdd}
      />
      <StudyDeckModal
        open={studying}
        onOpenChange={(open) => { if (!open) { setStudying(false); void load(); } }}
        baralhoId={baralhoId}
      />
    </div>
  );
}
