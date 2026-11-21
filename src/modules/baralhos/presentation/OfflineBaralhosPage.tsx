import { useEffect, useState } from "react";
import { Link } from "@/components/link";
import { LoadingState } from "@/components/loading-state";
import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import type { BaralhoDetail } from "../domain/baralho.types";
import { readOfflineBaralhos } from "../infra/offline-deck-library";

type OfflineLibraryView =
  | { status: "loading" | "failure" }
  | { status: "ready"; decks: BaralhoDetail[] };

export function OfflineBaralhosPage({ readDecks = readOfflineBaralhos }: {
  readDecks?: () => Promise<BaralhoDetail[]>;
}) {
  const [library, setLibrary] = useState<OfflineLibraryView>({ status: "loading" });

  useEffect(() => {
    let active = true;
    readDecks()
      .then((decks) => { if (active) setLibrary({ status: "ready", decks }); })
      .catch(() => { if (active) setLibrary({ status: "failure" }); });
    return () => { active = false; };
  }, [readDecks]);

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Biblioteca offline"
        subtitle="Consulte os cartões dos baralhos baixados neste dispositivo."
        actions={<Link href="/baralhos" className="text-sm text-primary underline">Voltar aos baralhos</Link>}
      />
      {library.status === "loading" && <LoadingState message="Abrindo biblioteca offline…" />}
      {library.status === "failure" && <p role="alert">Não foi possível abrir a biblioteca offline.</p>}
      {library.status === "ready" && <OfflineDecks decks={library.decks} />}
    </PageContainer>
  );
}

function OfflineDecks({ decks }: { decks: BaralhoDetail[] }) {
  if (!decks.length) return <p>Nenhum baralho baixado para esta conta.</p>;
  return (
    <ul className="space-y-3">
      {decks.map((deck) => (
        <li key={deck.id} className="rounded-lg border border-border p-4">
          <details>
            <summary className="cursor-pointer font-medium">{deck.titulo} ({deck.cards.length})</summary>
            <ul className="mt-3 space-y-2">
              {deck.cards.map((card) => (
                <li key={card.id} className="border-t border-border pt-2">
                  <details>
                    <summary className="cursor-pointer whitespace-pre-wrap text-sm">{card.pergunta}</summary>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{card.resposta}</p>
                  </details>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
