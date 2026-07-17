import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, NetworkIcon, FileTextIcon, MousePointer2Icon } from "lucide-react";
import type { Community } from "@/lib/graph-communities";
import { TYPE_COLORS } from "@/lib/graph-metrics";

interface CommunitiesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: Community[];
  onCreateDeck: (community: Community) => void;
  onHighlightCommunity: (communityId: string | null) => void;
  onSummarizeCommunity: (community: Community) => void;
  /** Seleciona os nós da comunidade no grafo (vira uma seleção múltipla normal). */
  onSelectCommunity: (community: Community) => void;
}

function countNodeTypes(community: Community): Map<string, number> {
  const typeCount = new Map<string, number>();
  for (const n of community.nodes) typeCount.set(n.group, (typeCount.get(n.group) ?? 0) + 1);
  return typeCount;
}

export function CommunitiesPanel({
  open,
  onOpenChange,
  communities,
  onCreateDeck,
  onHighlightCommunity,
  onSummarizeCommunity,
  onSelectCommunity,
}: CommunitiesPanelProps) {
  const handleOpenChange = (v: boolean): void => {
    if (!v) onHighlightCommunity(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[80dvh] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <NetworkIcon className="size-4" />
            Clusters por assunto
          </DialogTitle>
          <DialogDescription>
            Cada assunto é um cluster com toda a sua subárvore (tópicos, conceitos e nós).
            {communities.length === 0 && " Adicione assuntos, tópicos e conceitos conectados para formar clusters."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {communities.map((c) => (
            <CommunityCard
              key={c.id}
              community={c}
              onHighlight={onHighlightCommunity}
              onCreateDeck={onCreateDeck}
              onSummarize={onSummarizeCommunity}
              onSelect={onSelectCommunity}
            />
          ))}
        </div>

        {communities.length > 0 && (
          <>
            <Separator className="my-3 shrink-0" />
            <p className="shrink-0 text-[11px] text-muted-foreground text-center">
              Passe o mouse sobre um cluster para destacá-lo no grafo.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CommunityCard({
  community,
  onHighlight,
  onCreateDeck,
  onSummarize,
  onSelect,
}: {
  community: Community;
  onHighlight: (communityId: string | null) => void;
  onCreateDeck: (community: Community) => void;
  onSummarize: (community: Community) => void;
  onSelect: (community: Community) => void;
}) {
  const typeCount = countNodeTypes(community);
  const flashcardCount = typeCount.get("FLASHCARD") ?? 0;

  return (
    <div
      className="rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors cursor-pointer"
      onMouseEnter={() => onHighlight(community.id)}
      onMouseLeave={() => onHighlight(null)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 size-3 rounded-full shrink-0" style={{ backgroundColor: community.color }} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight mb-1.5">{community.label}</div>
          <div className="flex flex-wrap gap-1 mb-2">
            {[...typeCount.entries()].map(([type, count]) => (
              <Badge
                key={type}
                variant="outline"
                className="text-[10px] px-1.5 py-0"
                style={{ borderColor: TYPE_COLORS[type] + "60", color: TYPE_COLORS[type] }}
              >
                {count} {type.toLowerCase()}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onSelect(community); }}
            >
              <MousePointer2Icon className="size-3" />
              Selecionar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7"
              onClick={(e) => { e.stopPropagation(); onSummarize(community); }}
            >
              <FileTextIcon className="size-3" />
              Resumir
            </Button>
            {flashcardCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7"
                onClick={(e) => { e.stopPropagation(); onCreateDeck(community); }}
              >
                <PlusIcon className="size-3" />
                Criar baralho ({flashcardCount} cards)
              </Button>
            )}
          </div>
          {flashcardCount === 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Sem flashcards neste cluster para criar baralho.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
