import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon, Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { availableTargets } from "../../domain/selectors/edge-candidates";
import { useEdgeManager, type EdgeManagerEdge, type EdgeNode } from "../hooks/useEdgeManager";
import { getRelationLabel } from "./edge-relation-labels";

interface EdgeManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  existingEdges: EdgeManagerEdge[];
  onSuccess?: () => void;
  initialSourceId?: string;
  initialTargetId?: string;
  initialEditEdge?: EdgeManagerEdge | null;
}

const TITLES: Record<string, string> = {
  list: "Gerenciar relações do grafo",
  add: "Adicionar nova relação",
  edit: "Editar relação",
};
const DESCRIPTIONS: Record<string, string> = {
  list: "Crie, edite ou remova relações entre os nós do grafo.",
  add: "Selecione os nós e o tipo de relação.",
  edit: "Altere o tipo e peso da relação.",
};

export function EdgeManagerModal(props: EdgeManagerModalProps) {
  const { existingEdges } = props;
  const graph = useEdgeManager(props);

  return (
    <Dialog open={props.open} onOpenChange={graph.handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{TITLES[graph.mode]}</DialogTitle>
          <DialogDescription>{DESCRIPTIONS[graph.mode]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {graph.mode === "list" ? (
            <EdgeList
              edges={existingEdges}
              nodeMap={graph.nodeMap}
              loading={graph.loading}
              onAdd={graph.startAdd}
              onEdit={graph.startEdit}
              onDelete={graph.remove}
            />
          ) : (
            <EdgeForm graph={graph} existingEdges={existingEdges} />
          )}
        </div>

        <EdgeFooter graph={graph} />
      </DialogContent>
    </Dialog>
  );
}

interface EdgeListProps {
  edges: EdgeManagerEdge[];
  nodeMap: Map<string, EdgeNode>;
  loading: boolean;
  onAdd: () => void;
  onEdit: (edge: EdgeManagerEdge) => void;
  onDelete: (edgeId: string) => void;
}

function EdgeList({ edges, nodeMap, loading, onAdd, onEdit, onDelete }: EdgeListProps) {
  return (
    <>
      <Button onClick={onAdd} className="w-full gap-1.5">
        <PlusIcon className="size-4" />
        Nova relação
      </Button>
      {edges.length === 0 ? (
        <p className="text-center text-zinc-500 py-8">Nenhuma relação criada ainda.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto px-1">
          {edges.map((edge) => (
            <EdgeRow key={edge.id} edge={edge} nodeMap={nodeMap} loading={loading} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </>
  );
}

interface EdgeRowProps {
  edge: EdgeManagerEdge;
  nodeMap: Map<string, EdgeNode>;
  loading: boolean;
  onEdit: (edge: EdgeManagerEdge) => void;
  onDelete: (edgeId: string) => void;
}

function EdgeRow({ edge, nodeMap, loading, onEdit, onDelete }: EdgeRowProps) {
  const sourceLabel = nodeMap.get(edge.source)?.label || edge.sourceLabel || edge.source;
  const targetLabel = nodeMap.get(edge.target)?.label || edge.targetLabel || edge.target;

  return (
    <div className="w-full p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-zinc-500 mb-0.5">De</div>
            <div className="text-sm font-medium truncate" title={sourceLabel}>{sourceLabel}</div>
          </div>
          <div className="flex items-center gap-1 px-2"><span className="text-zinc-400">→</span></div>
          <div className="flex-1 min-w-0 text-right">
            <div className="text-xs font-mono text-zinc-500 mb-0.5 text-right">Para</div>
            <div className="text-sm font-medium truncate" title={targetLabel}>{targetLabel}</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-sm font-medium text-primary">{getRelationLabel(edge.tipoRelacao)}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">peso: {edge.peso.toFixed(1)}</span>
            <div className="flex gap-1">
              <Button size="icon-sm" variant="ghost" aria-label="Editar relação" onClick={() => onEdit(edge)}>
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Remover relação"
                onClick={() => onDelete(edge.id)}
                disabled={loading}
              >
                <Trash2Icon className="size-3.5 text-red-500" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EdgeFormProps {
  graph: ReturnType<typeof useEdgeManager>;
  existingEdges: EdgeManagerEdge[];
}

function EdgeForm({ graph, existingEdges }: EdgeFormProps) {
  const { form, nodes, nodeMap, selected, allowedRelations, mode, setForm } = graph;
  const sourceType = nodeMap.get(form.sourceNodeId)?.type;
  const targetType = nodeMap.get(form.targetNodeId)?.type;
  const targets = availableTargets(nodes, existingEdges, form.sourceNodeId, sourceType, selected?.id);
  const isEdit = mode === "edit";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Nó de origem</Label>
          <Select
            value={form.sourceNodeId}
            onValueChange={(value) => setForm({ sourceNodeId: value ?? "", targetNodeId: "", tipoRelacao: "" })}
            disabled={isEdit}
          >
            <SelectTrigger id="source" className="w-full">
              <SelectValue placeholder="Selecione o nó de origem" />
            </SelectTrigger>
            <SelectContent>
              {nodes.map((node) => <NodeOption key={node.id} node={node} />)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Nó de destino</Label>
          <Select
            value={form.targetNodeId}
            onValueChange={(value) => setForm({ targetNodeId: value ?? "", tipoRelacao: "" })}
            disabled={isEdit}
          >
            <SelectTrigger id="target" className="w-full">
              <SelectValue placeholder="Selecione o nó de destino" />
            </SelectTrigger>
            <SelectContent>
              <TargetItems hasSource={Boolean(form.sourceNodeId)} targets={targets} />
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relation-type">Tipo de relação</Label>
        <Select value={form.tipoRelacao} onValueChange={(value) => setForm({ tipoRelacao: value ?? "" })}>
          <SelectTrigger id="relation-type" className="w-full">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <RelationItems sourceType={sourceType} targetType={targetType} allowed={allowedRelations} />
          </SelectContent>
        </Select>
        {sourceType && targetType && allowedRelations.length > 0 && (
          <p className="text-xs text-zinc-500">
            Relações permitidas para {sourceType.toLowerCase()} ↔ {targetType.toLowerCase()}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="peso">Peso da relação (0.0 - 2.0)</Label>
        <Input
          id="peso"
          type="number"
          step="0.1"
          min="0"
          max="2"
          value={form.peso}
          onChange={(e) => setForm({ peso: parseFloat(e.target.value) || 1.0 })}
          className="w-full"
        />
        <p className="text-xs text-zinc-500">
          Peso influencia a força da atração na força no layout do grafo. Valores mais altos aproximam mais os nós.
        </p>
      </div>
    </div>
  );
}

function NodeOption({ node }: { node: EdgeNode }) {
  return (
    <SelectItem value={node.id}>
      <div className="flex items-center gap-2 py-1 min-w-0">
        <span className="text-xs text-zinc-500 capitalize w-16 flex-shrink-0">{node.type.toLowerCase()}</span>
        <span className="truncate">{node.label}</span>
      </div>
    </SelectItem>
  );
}

function TargetItems({ hasSource, targets }: { hasSource: boolean; targets: EdgeNode[] }) {
  if (!hasSource) return <SelectItem value="none" disabled>Selecione a origem primeiro</SelectItem>;
  if (targets.length === 0) return <SelectItem value="none" disabled>Nenhum destino disponível</SelectItem>;
  return <>{targets.map((node) => <NodeOption key={node.id} node={node} />)}</>;
}

function RelationItems({
  sourceType,
  targetType,
  allowed,
}: {
  sourceType?: string;
  targetType?: string;
  allowed: string[];
}) {
  if (!sourceType || !targetType) {
    return <SelectItem value="none" disabled>Selecione origem e destino primeiro</SelectItem>;
  }
  if (allowed.length === 0) {
    return <SelectItem value="none" disabled>Estes tipos de nó não podem ser relacionados</SelectItem>;
  }
  return <>{allowed.map((rel) => <SelectItem key={rel} value={rel}>{RELATION_LABELS[rel] ?? rel}</SelectItem>)}</>;
}

function EdgeFooter({ graph }: { graph: ReturnType<typeof useEdgeManager> }) {
  const { mode, loading, reset, submit, startAdd, handleOpenChange } = graph;
  if (mode === "list") {
    return (
      <DialogFooter>
        <Button variant="outline" onClick={() => handleOpenChange(false)}>Fechar</Button>
        <Button onClick={startAdd}><PlusIcon className="size-4" />Adicionar</Button>
      </DialogFooter>
    );
  }
  return (
    <DialogFooter>
      <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancelar</Button>
      <Button variant="outline" onClick={reset}>Limpar</Button>
      <Button onClick={submit} disabled={loading}>
        {loading ? <Loader2Icon className="size-4 animate-spin" /> : mode === "add" ? "Criar" : "Salvar"}
      </Button>
    </DialogFooter>
  );
}
