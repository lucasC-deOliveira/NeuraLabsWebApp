import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PencilIcon, BookOpenIcon, EyeIcon, ClipboardListIcon, XIcon, Trash2Icon, LayersIcon, LinkIcon } from "lucide-react";
import type { PropertiesNode } from "./properties-panel.types";

const DECK_TYPES = ["ASSUNTO", "TOPICO", "CONCEITO"];

export function NodePosition({ node }: { node: PropertiesNode }) {
  return (
    <div className="text-xs text-muted-foreground">
      <div>Posição: ({Math.round(node.x)}, {Math.round(node.y)})</div>
    </div>
  );
}

export function GenerateDeckAction({ node, onGenerateDeck }: { node: PropertiesNode; onGenerateDeck?: () => void }) {
  if (!onGenerateDeck || !DECK_TYPES.includes(node.tipoReal)) return null;
  return (
    <>
      <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={onGenerateDeck}>
        <LayersIcon className="size-4" />
        Gerar baralho
      </Button>
      <Separator />
    </>
  );
}

interface NodeActionsProps {
  node: PropertiesNode;
  isDeleting: boolean;
  onEditNode?: () => void;
  onViewNota?: () => void;
  onViewTextoBruto?: () => void;
  onViewProva?: () => void;
  onLinkEdital?: () => void;
  onRemoveFromGraph: () => void;
  onDeleteNode: () => void;
}

const LINKABLE_TYPES = ["PROVA", "EDITAL"];

export function NodeActions(props: NodeActionsProps) {
  const { node } = props;
  return (
    <div className="space-y-2">
      {props.onEditNode && (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={props.onEditNode}>
          <PencilIcon className="size-4" />
          Editar
        </Button>
      )}
      {node.tipoReal === "NOTA" && props.onViewNota && (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={props.onViewNota}>
          <BookOpenIcon className="size-4" />
          Mostrar conteúdo
        </Button>
      )}
      {node.tipoReal === "TEXTO_BRUTO" && props.onViewTextoBruto && (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={props.onViewTextoBruto}>
          <EyeIcon className="size-4" />
          Ver conteúdo
        </Button>
      )}
      {node.tipoReal === "PROVA" && props.onViewProva && (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={props.onViewProva}>
          <ClipboardListIcon className="size-4" />
          Ver prova
        </Button>
      )}
      {LINKABLE_TYPES.includes(node.tipoReal) && props.onLinkEdital && (
        <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={props.onLinkEdital}>
          <LinkIcon className="size-4" />
          Vincular edital ↔ prova
        </Button>
      )}
      <NodeDeletionActions {...props} />
    </div>
  );
}

function NodeDeletionActions({ node, isDeleting, onRemoveFromGraph, onDeleteNode }: NodeActionsProps) {
  if (node.isRoot) {
    return (
      <p className="text-xs text-muted-foreground px-1">
        Assunto-raiz do grafo — fixo no centro. Renomeie pelo nome do grafo; só é removido ao excluir o grafo.
      </p>
    );
  }
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={onRemoveFromGraph}
        disabled={isDeleting}
      >
        <XIcon className="size-4" />
        Remover do grafo
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={onDeleteNode}
        disabled={isDeleting}
      >
        <Trash2Icon className="size-4" />
        Excluir permanentemente
      </Button>
    </>
  );
}
