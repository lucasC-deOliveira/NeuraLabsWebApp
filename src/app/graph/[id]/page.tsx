"use client";

import { useParams, useRouter } from "@/lib/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { DeleteDeckModal } from "@/modules/graph/presentation/components/deck/DeleteDeckModal";
import { GenerateDeckModal } from "@/modules/graph/presentation/components/deck/GenerateDeckModal";

import { Button } from "@/components/ui/button";
import { PropertiesPanel } from "@/modules/graph/presentation/components/PropertiesPanel";

import { ArrowLeftIcon, FolderTreeIcon, BarChart2Icon, GlobeIcon, NetworkIcon, ZapIcon, WandSparklesIcon, Link2Icon, CopyIcon, GitBranchIcon, MessageCircleIcon, SparklesIcon, ChevronDownIcon, GaugeIcon, ScissorsIcon, ChevronRightIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CommunitiesPanel } from "@/modules/graph/presentation/components/CommunitiesPanel";
import { GapDetectionModal } from "@/modules/graph/presentation/components/ai/GapDetectionModal";
import { GenerateGraphModal } from "@/modules/graph/presentation/components/ai/GenerateGraphModal";
import { LinkEditalProvaModal } from "@/modules/graph/presentation/components/ai/LinkEditalProvaModal";
import { AutoLinkModal } from "@/modules/graph/presentation/components/ai/AutoLinkModal";
import { ClassifyDeckModal } from "@/modules/graph/presentation/components/ai/ClassifyDeckModal";
import { DuplicatesModal } from "@/modules/graph/presentation/components/ai/DuplicatesModal";
import { CommunitySummaryModal } from "@/modules/graph/presentation/components/ai/CommunitySummaryModal";
import { MissingPrereqsModal } from "@/modules/graph/presentation/components/ai/MissingPrereqsModal";
import { GraphChatModal } from "@/modules/graph/presentation/components/ai/GraphChatModal";
import { CompletenessModal } from "@/modules/graph/presentation/components/ai/CompletenessModal";
import type { Community, StructuralGap } from "@/lib/graph-communities";
import { graphHttp } from "@/modules/graph/infra/http";
import { useGraphCommunities } from "@/modules/graph/presentation/hooks/useGraphCommunities";

import { useGraphController } from "@/modules/graph/presentation/controllers/useGraphController";
import { GraphRenderer } from "@/modules/graph/presentation/components/GraphRenderer";
import { Graph3DRenderer, type Graph3DHandle } from "@/modules/graph/presentation/components/Graph3DRenderer";
import { GraphLegend } from "@/modules/graph/presentation/components/GraphLegend";
import { GraphToolbar } from "@/modules/graph/presentation/components/GraphToolbar";
import { GraphSideToolbar } from "@/modules/graph/presentation/components/GraphSideToolbar";
import { TokenUsageMeter } from "@/modules/graph/presentation/components/TokenUsageMeter";
import { useGraphSearch } from "@/modules/graph/presentation/hooks/useGraphSearch";
import { RoadmapPanel } from "@/modules/graph/presentation/components/RoadmapPanel";
import { GraphSettingsModal } from "@/modules/graph/presentation/components/GraphSettingsModal";
import { GraphLoadingScreen } from "@/modules/graph/presentation/components/GraphLoadingScreen";
import { useGraphSettings } from "@/modules/graph/presentation/hooks/useGraphSettings";

import type { GrafoInfoDetail } from "@/modules/graph/domain/types/graph.types";
import { CreateSubgrafoModal } from "@/modules/graph/presentation/components/vault/CreateSubgrafoModal";
import { ExtractSubgrafoModal } from "@/modules/graph/presentation/components/vault/ExtractSubgrafoModal";
import {
  expandSubgraphIntoView,
  retractSubgraphFromView,
  isSubgraphExpanded,
} from "@/modules/graph/domain/services/subgraph-expansion";
import { expandActionFor, type ExpandKind } from "@/modules/graph/presentation/services/node-expand-action";
import {
  toClipItems,
  readClipboard,
  writeClipboard,
  clearClipboard,
} from "@/modules/graph/presentation/services/node-clipboard";
import { useUndoStack } from "@/modules/graph/presentation/hooks/useUndoStack";
import { createdBetween, type GraphIdSnapshot } from "@/modules/graph/presentation/services/graph-diff";
import { CreateNodeModal } from "@/modules/graph/presentation/components/create-node/CreateNodeModal";
import { ImportJsonModal } from "@/modules/graph/presentation/components/vault/ImportJsonModal";
import { EdgeManagerModal } from "@/modules/graph/presentation/components/EdgeManagerModal";
import { EditNodeModal } from "@/modules/graph/presentation/components/EditNodeModal";
import { ViewNotaModal } from "@/modules/graph/presentation/components/deck/ViewNotaModal";
import { ViewProvaModal } from "@/modules/graph/presentation/components/deck/ViewProvaModal";
import { StudyProvaModal } from "@/modules/graph/presentation/components/deck/StudyProvaModal";
import { ViewTextoBrutoModal } from "@/modules/graph/presentation/components/deck/ViewTextoBrutoModal";
import { StudyFlashcardModal } from "@/modules/graph/presentation/components/deck/StudyFlashcardModal";
import { ViewFlashcardModal } from "@/modules/graph/presentation/components/deck/ViewFlashcardModal";
import { ImproveFlashcardModal } from "@/modules/graph/presentation/components/ai/ImproveFlashcardModal";
import { ImproveQuestaoModal } from "@/modules/graph/presentation/components/ai/ImproveQuestaoModal";
import { ImproveNotaModal } from "@/modules/graph/presentation/components/ai/ImproveNotaModal";
import { NodeInsightsModal } from "@/modules/graph/presentation/components/ai/NodeInsightsModal";
import { StudyDeckModal } from "@/modules/graph/presentation/components/deck/StudyDeckModal";
import { ViewDeckModal } from "@/modules/graph/presentation/components/deck/ViewDeckModal";
import { VaultSyncModal } from "@/modules/graph/presentation/components/vault/VaultSyncModal";
import { GraphDashboard } from "@/modules/graph/presentation/components/dashboard/GraphDashboard";
import { isDesktop } from "@/lib/vault-bridge";
import { canRelate } from "@/modules/graph/domain/services/relation-rules";
import { splitGraphEntities, countNodesByType, neighborhoodFlashcardIds } from "@/modules/graph/domain/services/graph-derivations";
import { getRelationStats } from "@/modules/graph/domain/selectors/graph.selectors";

export default function GraphPage() {
  const router = useRouter();
  const params = useParams();
  const graphId = params.id as string;

  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark" || theme === "dark";

  const controller = useGraphController(graphId);
  const undo = useUndoStack();

  // busca com filtros poderosos (texto, tipo, domínio, prioridade, conexões)
  const search = useGraphSearch(
    controller.state.filteredNodes,
    controller.state.filteredEdges,
    graphId,
  );
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [insightsNode, setInsightsNode] = useState<{ id: string; label?: string } | null>(null);

  // assuntos/tópicos/conceitos já no grafo (para relacionar ao criar nós)
  const graphEntities = useMemo(
    () => splitGraphEntities(controller.state.layout),
    [controller.state.layout],
  );
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isDeletingNode, setIsDeletingNode] = useState(false);
  const [deleteDeckConfirm, setDeleteDeckConfirm] = useState<{ node: any } | null>(null);
  const [generateDeckConfirm, setGenerateDeckConfirm] = useState<{ node: any; flashcardIds: string[] } | null>(null);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportJsonOpen, setIsImportJsonOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [dashFilterIds, setDashFilterIds] = useState<Set<string> | null>(null);
  const [roadmapSpotlightId, setRoadmapSpotlightId] = useState<string | null>(null);

  // P3 — Comunidades / P1 — Lacunas / P4 — Ego Network (estados declarados antes dos useMemos que os usam)
  const [communitiesOpen, setCommunitiesOpen] = useState(false);
  const [gapsOpen, setGapsOpen] = useState(false);
  const [highlightedCommunityId, setHighlightedCommunityId] = useState<string | null>(null);
  const [highlightedGap, setHighlightedGap] = useState<StructuralGap | null>(null);
  const [neighborhoodStudyIds, setNeighborhoodStudyIds] = useState<string[] | null>(null);
  const [generateGraphOpen, setGenerateGraphOpen] = useState(false);
  // IA automática
  const [autoLinkOpen, setAutoLinkOpen] = useState(false);
  // Classificação do acervo em lotes (Fase 6): id do baralho em classificação.
  const [classifyDeckId, setClassifyDeckId] = useState<string | null>(null);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [missingPrereqsOpen, setMissingPrereqsOpen] = useState(false);
  const [communitySummary, setCommunitySummary] = useState<{ label: string; nodeIds: string[] } | null>(null);
  const [learningPathOpen, setLearningPathOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [completenessOpen, setCompletenessOpen] = useState(false);
  const [isSplittingBaralhos, setIsSplittingBaralhos] = useState(false);

  // P3 clusters hierárquicos + P1 lacunas + P5 pontes/destaque — derivados do layout.
  const { communities, gaps, gapBridges, highlightedCommunityNodeIds } = useGraphCommunities(
    controller.state.layout,
    controller.state.edges,
    { gapsOpen, highlightedCommunityId, highlightedGap },
  );

  // P4 — BFS a partir do nó selecionado para coletar IDs de FLASHCARDs vizinhos
  const getNeighborhoodFlashcardIds = (nodeId: string, depth: number): string[] =>
    neighborhoodFlashcardIds(nodeId, depth, controller.state.layout, controller.state.edges);

  const combinedMatchedIds = useMemo(() => {
    const a = dashFilterIds;
    const b = search.matchedIds;
    const c = roadmapSpotlightId ? new Set([roadmapSpotlightId]) : null;
    const sources = [a, b, c].filter(Boolean) as Set<string>[];
    if (sources.length === 0) return null;
    if (sources.length === 1) return sources[0];
    return sources.reduce((acc, s) => new Set([...acc].filter(id => s.has(id))));
  }, [dashFilterIds, search.matchedIds, roadmapSpotlightId]);
  const desktopApp = isDesktop();
  const graph3DRef = useRef<Graph3DHandle>(null);
  const [legendVisible, setLegendVisible] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [has3DBeenOpened, setHas3DBeenOpened] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const { focusDepth, setFocusDepth } = useGraphSettings(
    controller.state.physicsOptions,
    controller.actions.setPhysicsOptions,
  );
  const [showClusters, setShowClusters] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEdgeManagerOpen, setIsEdgeManagerOpen] = useState(false);
  const [graphEdges, setGraphEdges] = useState<any[]>([]);
  const [nodeMenu, setNodeMenu] = useState<{ node: any; x: number; y: number } | null>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [viewingNotaId, setViewingNotaId] = useState<string | null>(null);
  const [viewingProvaId, setViewingProvaId] = useState<string | null>(null);
  const [studyProvaId, setStudyProvaId] = useState<string | null>(null);
  const [studyQuestaoId, setStudyQuestaoId] = useState<string | null>(null);
  const [linkEditalOpen, setLinkEditalOpen] = useState(false);
  const [viewingTextoId, setViewingTextoId] = useState<string | null>(null);
  const [studyFlashcardId, setStudyFlashcardId] = useState<string | null>(null);
  const [viewFlashcardId, setViewFlashcardId] = useState<string | null>(null);
  const [improveFlashcardId, setImproveFlashcardId] = useState<string | null>(null);
  const [improveQuestaoId, setImproveQuestaoId] = useState<string | null>(null);
  const [improveNotaId, setImproveNotaId] = useState<string | null>(null);
  const [studyDeckId, setStudyDeckId] = useState<string | null>(null);
  const [viewDeckId, setViewDeckId] = useState<string | null>(null);
  const [editEdge, setEditEdge] = useState<any>(null);
  const [addEdgeSourceId, setAddEdgeSourceId] = useState<string | null>(null);
  const [grafoInfo, setGrafoInfo] = useState<GrafoInfoDetail | null>(null);
  const [isCreateSubgrafoOpen, setIsCreateSubgrafoOpen] = useState(false);
  const [isExtractSubgrafoOpen, setIsExtractSubgrafoOpen] = useState(false);

  useEffect(() => {
    graphHttp.getGrafoInfo(graphId).then(setGrafoInfo).catch(() => {});
  }, [graphId]);

  const closeToolbarModals = () => {
    setIsCreateModalOpen(false);
    setIsImportJsonOpen(false);
    setIsVaultOpen(false);
    setIsDashboardOpen(false);
    setIsSettingsOpen(false);
    setIsEdgeManagerOpen(false);
    setRoadmapOpen(false);
    setGenerateGraphOpen(false);
    setAutoLinkOpen(false);
    setDuplicatesOpen(false);
    setMissingPrereqsOpen(false);
    setLearningPathOpen(false);
    setChatOpen(false);
    setCompletenessOpen(false);
    setIsCreateSubgrafoOpen(false);
    setIsExtractSubgrafoOpen(false);
  };

  const handleOpenGrafoRef = (childGrafoId: string) => {
    router.push(`/graph/${childGrafoId}`);
  };

  // Expande o subgrafo DENTRO desta vista: busca a vista do filho e a funde ao redor
  // da tile, sem navegar. `refNode` é o nó GRAFO_REF do menu (id = id do subgrafo);
  // usamos a posição atual dele na tela como âncora do cluster.
  // Injeta a estrutura do subgrafo na vista atual (sem tocar no undo). Reusado pelo
  // expandir e pelo refazer, para o redo não empurrar uma nova entrada de undo.
  const injectSubgraphIntoView = async (menuNode: { id: string; x?: number; y?: number }): Promise<boolean> => {
    const tile = controller.state.rawNodes.find((n) => n.id === menuNode.id);
    if (!tile) return false;
    const child = await graphHttp.getGraphNodes(menuNode.id);
    // A âncora é onde a tile está AGORA na tela (posição do layout), não a salva.
    const anchor = { ...tile, posicaoX: menuNode.x ?? tile.posicaoX, posicaoY: menuNode.y ?? tile.posicaoY };
    const next = expandSubgraphIntoView({ nodes: controller.state.rawNodes, edges: controller.state.rawEdges }, anchor, child);
    controller.actions.setRawNodes(next.nodes);
    controller.actions.setRawEdges(next.edges);
    return true;
  };

  const handleExpandGrafoRef = async (menuNode: { id: string; x?: number; y?: number }) => {
    try {
      if (!(await injectSubgraphIntoView(menuNode))) return;
      undo.push({
        label: "Expandir subgrafo",
        invert: () => handleRetractGrafoRef(menuNode.id),
        redo: () => { void injectSubgraphIntoView(menuNode); },
      });
    } catch {
      toast.error("Não foi possível expandir o subgrafo.");
    }
  };

  const handleRetractGrafoRef = (refId: string) => {
    const next = retractSubgraphFromView(
      { nodes: controller.state.rawNodes, edges: controller.state.rawEdges },
      refId,
    );
    controller.actions.setRawNodes(next.nodes);
    controller.actions.setRawEdges(next.edges);
  };

  // Expande um nó com IA, roteando pelo tipo: baralho classifica seus flashcards,
  // nós estruturais geram sub-nós, um flashcard é ligado aos conceitos que define.
  const expandByKind = async (kind: ExpandKind, nodeId: string): Promise<string> => {
    if (kind === "populate") {
      const r = await graphHttp.populateGraphFromBaralho(graphId, nodeId);
      return `Criados: ${r.assuntos} assunto(s), ${r.topicos} tópico(s), ${r.conceitos} conceito(s)`;
    }
    if (kind === "classify") {
      const r = await graphHttp.classifyFlashcard(graphId, nodeId);
      const novos = r.conceitos ? ` (${r.conceitos} novo(s))` : "";
      return `Ligado a ${r.linked} conceito(s)${novos}`;
    }
    const r = await graphHttp.expandNode(graphId, nodeId);
    const parts = [
      r.topicos && `${r.topicos} tópico(s)`,
      r.conceitos && `${r.conceitos} conceito(s)`,
      r.notas && `${r.notas} nota(s)`,
      r.flashcards && `${r.flashcards} flashcard(s)`,
    ].filter(Boolean);
    return `Criados: ${parts.join(", ") || "nenhum"}`;
  };

  // Snapshot autoritativo dos ids do grafo (nós + arestas com id) para o diff de undo.
  const snapshotGraphIds = async (): Promise<GraphIdSnapshot> => {
    const [g, edges] = await Promise.all([graphHttp.getGraphNodes(graphId), graphHttp.getGraphEdges(graphId)]);
    return { nodeIds: g.nodes.map((n) => n.id), edgeIds: edges.map((e) => e.id) };
  };

  // Registra no undo o que a escrita de IA criou: apaga as arestas por id (as que
  // ligam nós que já existiam) e os nós novos (que cascateiam suas próprias arestas).
  const pushAiUndo = (before: GraphIdSnapshot, after: GraphIdSnapshot, label: string): void => {
    const { nodeIds, edgeIds } = createdBetween(before, after);
    if (nodeIds.length === 0 && edgeIds.length === 0) return;
    undo.push({
      label: `IA: ${label} (${nodeIds.length} nó, ${edgeIds.length} aresta)`,
      invert: async () => {
        await Promise.all(edgeIds.map((id) => graphHttp.deleteEdge(id, graphId).catch(() => {})));
        await Promise.all(nodeIds.map((id) => graphHttp.deleteGraphNode(id, graphId).catch(() => {})));
        await refreshGraph();
      },
    });
  };

  const runNodeExpansion = async (node: any) => {
    const action = expandActionFor(node?.group);
    if (!node || !action) return;
    const tid = toast.loading("Expandindo nó com IA...");
    try {
      const before = await snapshotGraphIds();
      const msg = await expandByKind(action.kind, node.id);
      pushAiUndo(before, await snapshotGraphIds(), action.label);
      toast.success(msg, { id: tid });
      await refreshGraph();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao expandir", { id: tid });
    }
  };

  // As escritas de IA que expandem o grafo acontecem DENTRO dos modais, então o
  // snapshot "antes" é tirado ao abrir o modal e comparado quando a operação avisa
  // que terminou. Assim qualquer expansão (por texto, auto-conexão, pré-requisitos,
  // insights) entra na mesma pilha de undo das operações por nó.
  const aiBeforeRef = useRef<GraphIdSnapshot | null>(null);
  const beginAiWrite = (): void => {
    aiBeforeRef.current = null;
    void snapshotGraphIds().then((s) => { aiBeforeRef.current = s; });
  };
  const finishAiWrite = (label: string) => async (): Promise<void> => {
    const before = aiBeforeRef.current;
    aiBeforeRef.current = null;
    if (before) pushAiUndo(before, await snapshotGraphIds(), label);
    await refreshGraph();
  };
  // Abre um modal de IA já registrando o estado "antes" para o undo.
  const openAiTool = (open: () => void): void => { closeToolbarModals(); beginAiWrite(); open(); };

  // ── Atalhos: selecionar tudo / copiar / recortar / colar / desfazer ──────────
  // Copiar/recortar/colar operam sobre a CONTENÇÃO (o nó é do sistema): colar
  // adiciona a mesma entidade a este grafo; recortar soltou a contenção na origem.
  const selectAllNodes = () => {
    const ids = controller.state.filteredNodes.map((n: any) => n.id);
    controller.actions.setSelectedNodeIds(new Set(ids));
  };

  const copySelection = (mode: "copy" | "cut") => {
    const items = toClipItems(controller.state.filteredNodes, controller.state.selectedNodeIds);
    if (items.length === 0) return [];
    writeClipboard({ items, mode, sourceGrafoId: graphId });
    return items;
  };

  // Adiciona/solta a contenção de um conjunto de itens neste grafo, e reflete na vista.
  const addContainment = async (items: { entityId: string; tipoNode: string }[]) => {
    await Promise.all(items.map((i) => graphHttp.addNodeToGraph(graphId, i.tipoNode, { entityId: i.entityId })));
    await refreshGraph();
  };
  const releaseContainment = async (items: { entityId: string }[]) => {
    await Promise.all(items.map((i) => graphHttp.removeNodeFromGraph(i.entityId, graphId)));
    await refreshGraph();
  };

  const cutSelection = async () => {
    const items = copySelection("cut");
    if (items.length === 0) return;
    try {
      await releaseContainment(items);
      undo.push({
        label: `Recortar ${items.length} nó(s)`,
        invert: () => addContainment(items),
        redo: () => releaseContainment(items),
      });
      toast.success(`${items.length} nó(s) recortado(s) — cole em outro grafo`);
    } catch {
      toast.error("Não foi possível recortar");
    }
  };

  const pasteClipboard = async () => {
    const clip = readClipboard();
    if (!clip) return;
    const present = new Set(controller.state.rawNodes.map((n: any) => n.id));
    const toAdd = clip.items.filter((i) => !present.has(i.entityId));
    if (toAdd.length === 0) { toast("Esses nós já estão neste grafo"); return; }
    try {
      await addContainment(toAdd);
      undo.push({
        label: `Colar ${toAdd.length} nó(s)`,
        invert: () => releaseContainment(toAdd),
        redo: () => addContainment(toAdd),
      });
      if (clip.mode === "cut") clearClipboard();
      toast.success(`${toAdd.length} nó(s) colado(s)`);
    } catch {
      toast.error("Não foi possível colar");
    }
  };

  const copyToClipboard = () => {
    const items = copySelection("copy");
    if (items.length > 0) toast.success(`${items.length} nó(s) copiado(s)`);
  };

  // Duplo-clique abre o que o nó É: subgrafo expande/retrai, baralho e flashcard
  // abrem sua visualização. Nos demais tipos, centraliza.
  const handleNodeDoubleClick = (node: any) => {
    if (node.group === "GRAFO_REF") {
      if (isSubgraphExpanded(controller.state.rawNodes, node.id)) handleRetractGrafoRef(node.id);
      else void handleExpandGrafoRef(node);
      return;
    }
    if (node.group === "BARALHO") { setViewDeckId(node.id); return; }
    if (node.group === "FLASHCARD") { setViewFlashcardId(node.id); return; }
    controller.interactions.focusNode(node);
  };

  const clearSelectionAndMenus = () => {
    setNodeMenu(null);
    controller.actions.setSelectedNodeIds(new Set());
    controller.actions.setSelectedNode(null);
  };

  // ── Ações em lote sobre a seleção ────────────────────────────────────────────
  const selectedItems = () =>
    toClipItems(controller.state.filteredNodes, controller.state.selectedNodeIds);

  // Delete: remove a seleção DESTE grafo (contenção — as entidades ficam no app).
  const deleteSelection = async () => {
    const items = selectedItems();
    if (items.length === 0) return;
    try {
      await releaseContainment(items);
      undo.push({
        label: `Remover ${items.length} nó(s) do grafo`,
        invert: () => addContainment(items),
        redo: () => releaseContainment(items),
      });
      clearSelectionAndMenus();
      toast.success(`${items.length} nó(s) removido(s) do grafo`);
    } catch {
      toast.error("Não foi possível remover a seleção");
    }
  };

  const selectedFlashcardIds = () =>
    controller.state.filteredNodes
      .filter((n: any) => controller.state.selectedNodeIds.has(n.id) && n.group === "FLASHCARD")
      .map((n: any) => n.id);

  const studySelection = () => {
    const ids = selectedFlashcardIds();
    if (ids.length === 0) { toast.error("Nenhum flashcard na seleção."); return; }
    setNeighborhoodStudyIds(ids);
  };

  // Expande cada nó aplicável da seleção, um por vez (cada um entra no undo).
  const expandSelectionWithAi = async () => {
    const nodes = controller.state.filteredNodes.filter(
      (n: any) => controller.state.selectedNodeIds.has(n.id) && expandActionFor(n.group),
    );
    if (nodes.length === 0) { toast.error("Nenhum nó expansível na seleção."); return; }
    for (const node of nodes) await runNodeExpansion(node);
  };

  // F enquadra a seleção na tela; sem seleção, enquadra o grafo inteiro.
  const fitSelection = () => {
    const all = controller.state.layout;
    const sel = all.filter((n: any) => controller.state.selectedNodeIds.has(n.id));
    controller.interactions.fitToNodes(sel.length > 0 ? sel : all);
  };

  // Ctrl+E: cresce a seleção UMA onda de vizinhos diretos (repetível — cada
  // aperto avança mais um anel). A base é a seleção de antes da onda.
  const growSelection = () => {
    const sel = controller.state.selectedNodeIds;
    if (sel.size === 0) return;
    const next = new Set(sel);
    for (const e of controller.state.filteredEdges as any[]) {
      const s = typeof e.source === "object" ? e.source.id : e.source;
      const t = typeof e.target === "object" ? e.target.id : e.target;
      if (sel.has(s)) next.add(t);
      if (sel.has(t)) next.add(s);
    }
    controller.actions.setSelectedNodeIds(next);
    if (next.size > sel.size) toast(`Seleção cresceu para ${next.size} nós`);
  };

  const invertSelection = () => {
    const sel = controller.state.selectedNodeIds;
    const next = new Set<string>(
      controller.state.filteredNodes.filter((n: any) => !sel.has(n.id)).map((n: any) => n.id),
    );
    controller.actions.setSelectedNodeIds(next);
    controller.actions.setSelectedNode(null);
  };

  const selectAllOfType = (group: string) => {
    const ids = controller.state.filteredNodes
      .filter((n: any) => n.group === group)
      .map((n: any) => n.id);
    controller.actions.setSelectedNodeIds(new Set(ids));
    toast(`${ids.length} nó(s) do tipo selecionado(s)`);
  };

  const undoLast = async () => {
    if (!undo.canUndo) { toast("Nada para desfazer"); return; }
    const tid = toast.loading(`Desfazendo: ${undo.nextUndoLabel}...`);
    try {
      await undo.undo();
      toast.success("Desfeito", { id: tid });
    } catch {
      toast.error("Não foi possível desfazer", { id: tid });
    }
  };

  const redoLast = async () => {
    if (!undo.canRedo) { toast("Nada para refazer"); return; }
    const tid = toast.loading(`Refazendo: ${undo.nextRedoLabel}...`);
    try {
      await undo.redo();
      toast.success("Refeito", { id: tid });
    } catch {
      toast.error("Não foi possível refazer", { id: tid });
    }
  };

  // Um ref carrega sempre os handlers mais recentes, para o listener (ligado uma
  // vez) não capturar estado obsoleto (seleção, clipboard, pilha de undo).
  const shortcutsRef = useRef({ selectAllNodes, copyToClipboard, cutSelection, pasteClipboard, undoLast, redoLast, clearSelectionAndMenus, fitSelection, deleteSelection, growSelection, invertSelection });
  shortcutsRef.current = { selectAllNodes, copyToClipboard, cutSelection, pasteClipboard, undoLast, redoLast, clearSelectionAndMenus, fitSelection, deleteSelection, growSelection, invertSelection };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
      const s = shortcutsRef.current;
      if (e.key === "Escape") { s.clearSelectionAndMenus(); return; }
      if (e.key === "Delete") { void s.deleteSelection(); return; }
      // F enquadra (como o zoom-to-fit de editores de canvas); sem modificador.
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "f") { s.fitSelection(); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      // Ctrl+Y ou Ctrl+Shift+Z = refazer (as duas convenções); Ctrl+Z = desfazer.
      if (k === "z" && e.shiftKey) { e.preventDefault(); void s.redoLast(); }
      else if (k === "i" && e.shiftKey) { e.preventDefault(); s.invertSelection(); }
      else if (k === "e") { e.preventDefault(); s.growSelection(); }
      else if (k === "a") { e.preventDefault(); s.selectAllNodes(); }
      else if (k === "c") { e.preventDefault(); s.copyToClipboard(); }
      else if (k === "x") { e.preventDefault(); void s.cutSelection(); }
      else if (k === "v") { e.preventDefault(); void s.pasteClipboard(); }
      else if (k === "z") { e.preventDefault(); void s.undoLast(); }
      else if (k === "y") { e.preventDefault(); void s.redoLast(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSplitByBaralho = async () => {
    const baralhos = controller.state.filteredNodes.filter((n: any) => n.group === "BARALHO");
    if (baralhos.length === 0) {
      toast.error("Nenhum baralho encontrado neste grafo.");
      return;
    }
    const ok = window.confirm(
      `Dividir ${baralhos.length} baralho(s) em subgrafos separados?\n\nCada baralho e seus flashcards serão movidos para um novo subgrafo com o nome do baralho.`,
    );
    if (!ok) return;

    setIsSplittingBaralhos(true);
    const toastId = toast.loading(`Dividindo 0/${baralhos.length} baralhos…`);
    try {
      // BARALHO → FLASHCARD via CONTEM edges
      const contemByBaralho = new Map<string, string[]>();
      for (const e of controller.state.filteredEdges) {
        if ((e as any).type !== "CONTEM") continue;
        const src = (e as any).source;
        if (!contemByBaralho.has(src)) contemByBaralho.set(src, []);
        contemByBaralho.get(src)!.push((e as any).target);
      }

      let done = 0;
      for (const baralho of baralhos) {
        const flashcardIds = contemByBaralho.get(baralho.id) ?? [];
        await graphHttp.extractNodesToSubgrafo(graphId, {
          nodeIds: [baralho.id, ...flashcardIds],
          nome: baralho.label,
          tipoRelacao: "CONTEM",
        });
        done++;
        toast.loading(`Dividindo ${done}/${baralhos.length} baralhos…`, { id: toastId });
      }

      toast.success(`${baralhos.length} baralho(s) divididos com sucesso!`, { id: toastId });
      const result = await graphHttp.getGraphNodes(graphId);
      controller.actions.setRawNodes(result.nodes);
      controller.actions.setRawEdges(result.edges);
    } catch {
      toast.error("Erro ao dividir baralhos.", { id: toastId });
    } finally {
      setIsSplittingBaralhos(false);
    }
  };

  const handleOpenCreateNode = () => {
    closeToolbarModals();
    setIsCreateModalOpen(true);
  };

  const loadEdges = async () => {
    try {
      setGraphEdges(await graphHttp.getGraphEdges(graphId));
    } catch {
      toast.error("Erro ao carregar relações");
    }
  };

  // relações disponíveis desde o início (painel de propriedades)
  useEffect(() => {
    loadEdges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphId]);

  // Lazy mount: só cria o contexto WebGL na primeira vez que 3D é ativado
  useEffect(() => {
    if (is3D) setHas3DBeenOpened(true);
  }, [is3D]);

  // Pausa/retoma o loop de animação ao alternar entre modos
  useEffect(() => {
    if (!has3DBeenOpened) return;
    if (is3D) {
      graph3DRef.current?.resume();
    } else {
      graph3DRef.current?.pause();
    }
  }, [is3D, has3DBeenOpened]);

  const handleOpenEdgeManager = async () => {
    closeToolbarModals();
    await loadEdges();
    setIsEdgeManagerOpen(true);
  };

  // ======================
  // LOADING
  // ======================
  if (controller.state.loading || controller.state.preparing) {
    return <GraphLoadingScreen phase={controller.state.loading ? "loading" : "preparing"} />;
  }
  // contagem de nós por tipo (painel de camadas/filtro)
  const nodeStats = countNodesByType(controller.state.layout);
  // contagem de arestas por tipo de relação (camadas de relações)
  const relationStats = getRelationStats(controller.state.edges);

  // ======================
  // ZOOM BUTTONS (zoom around SVG center)
  // ======================
  const handleZoomButton = (delta: number) => {
    const rect = controller.svgRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    const currentZoom = controller.state.zoom;
    const currentPan = controller.state.pan;
    const nextZoom = Math.min(3, Math.max(0.2, currentZoom + delta));
    const graphX = (cx - (rect?.left ?? 0) - currentPan.x) / currentZoom;
    const graphY = (cy - (rect?.top ?? 0) - currentPan.y) / currentZoom;
    controller.actions.setZoom(nextZoom);
    controller.actions.setPan({
      x: cx - (rect?.left ?? 0) - graphX * nextZoom,
      y: cy - (rect?.top ?? 0) - graphY * nextZoom,
    });
  };

  // ======================
  // MENU "RELACIONAR" — aparece no ponto médio entre 2 nós selecionados
  // ======================
  let relateMenuPos: { x: number; y: number } | null = null;
  if (controller.state.selectedNodeIds.size === 2) {
    const [idA, idB] = [...controller.state.selectedNodeIds];
    const a = controller.state.layout.find((n) => n.id === idA);
    const b = controller.state.layout.find((n) => n.id === idB);
    // só mostra o menu se os tipos dos dois nós tiverem relação possível
    if (a && b && canRelate(a.group, b.group)) {
      relateMenuPos = {
        x: ((a.x + b.x) / 2) * controller.state.zoom + controller.state.pan.x,
        y: ((a.y + b.y) / 2) * controller.state.zoom + controller.state.pan.y,
      };
    }
  }

  // ======================
  // GRAPH REFRESH
  // ======================
  const refreshGraph = async () => {
    const result = await graphHttp.getGraphNodes(graphId);

    // o controller mescla os nós novos preservando as posições dos existentes
    controller.actions.setRawNodes(result.nodes);
    controller.actions.setRawEdges(result.edges);
    // mantém a seleção: o nó selecionado é derivado do layout, então mostra os
    // dados atualizados (ex.: domínio recalculado). Some sozinho se o nó foi removido.
    await loadEdges();
  };

  // ======================
  // RELAÇÕES DO NÓ SELECIONADO (painel de propriedades)
  // ======================
  const selectedNodeId = controller.state.selectedNode?.id;
  // tipo de cada nó, para o painel agrupar as relações pelo tipo do outro nó.
  const nodeTypeById = new Map<string, string>(
    controller.state.layout.map((n: any) => [n.id, n.tipoReal ?? n.group])
  );
  const selectedNodeEdges = selectedNodeId
    ? graphEdges
        .filter((e: any) => e.source === selectedNodeId || e.target === selectedNodeId)
        .map((e: any) => ({
          ...e,
          sourceType: nodeTypeById.get(e.source),
          targetType: nodeTypeById.get(e.target),
        }))
    : [];

  const handleEditEdge = (edge: any) => {
    setEditEdge(edge);
    setIsEdgeManagerOpen(true);
  };

  // botão "Nova relação" do painel: abre a criação com o nó como origem
  const handleAddEdgeFromPanel = () => {
    if (!controller.state.selectedNode) return;
    setAddEdgeSourceId(controller.state.selectedNode.id);
    setIsEdgeManagerOpen(true);
  };

  const handleDeleteEdge = async (edge: any) => {
    if (!confirm("Excluir esta relação?")) return;
    try {
      await graphHttp.deleteEdge(edge.id, graphId);
      toast.success("Relação excluída");
      await refreshGraph();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir relação");
    }
  };

  // ======================
  // DELETE NODE (exclui a entidade do app)
  // ======================
  const performDeleteNode = async (node: any, deleteConnected: boolean) => {
    controller.actions.selectNode(null);
    setIsDeletingNode(true);
    try {
      await graphHttp.deleteGraphNode(node.id, graphId, { deleteConnected });
      controller.actions.removeNodeFromLayout(node.id);
      toast.success("Nó excluído do aplicativo");
      await refreshGraph();
    } catch (e) {
      console.error("deleteNode error", e);
      toast.error(e instanceof Error ? e.message : "Erro ao excluir node");
    } finally {
      setIsDeletingNode(false);
    }
  };

  const deleteNodeFromApp = async (node: any) => {
    if (!node) return;
    if (node.group === "BARALHO") {
      setDeleteDeckConfirm({ node });
      return;
    }
    if (!confirm(`Excluir "${node.label}" permanentemente do aplicativo?`)) return;
    await performDeleteNode(node, false);
  };

  const handleDeleteNode = () => deleteNodeFromApp(controller.state.selectedNode);

  // ======================
  // REMOVE FROM GRAPH (mantém a entidade no app)
  // ======================
  const removeFromGraph = async (node: any) => {
    if (!node) return;

    setIsDeletingNode(true);
    try {
      await graphHttp.removeNodeFromGraph(node.id, graphId);
      toast.success("Removido do grafo");
      await refreshGraph();
    } catch {
      toast.error("Erro ao remover");
    } finally {
      setIsDeletingNode(false);
    }
  };

  const handleRemoveFromGraph = () => removeFromGraph(controller.state.selectedNode);

  // ======================
  // GENERATE DECK FROM CONNECTED FLASHCARDS
  // ======================
  const handleGenerateDeck = () => {
    const node = controller.state.selectedNode;
    if (!node) return;
    const layoutById = new Map(controller.state.layout.map((n: any) => [n.id, n]));
    const flashcardIds = selectedNodeEdges
      .map((e: any) => (e.source === node.id ? e.target : e.source))
      .filter((id: string) => layoutById.get(id)?.group === "FLASHCARD");
    setGenerateDeckConfirm({ node, flashcardIds });
  };

  const performGenerateDeck = async (titulo: string) => {
    if (!generateDeckConfirm) return;
    const { flashcardIds } = generateDeckConfirm;
    setIsGeneratingDeck(true);
    try {
      await graphHttp.createBaralhoNode(graphId, titulo, flashcardIds);
      setGenerateDeckConfirm(null);
      toast.success("Baralho criado com sucesso");
      await refreshGraph();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar baralho");
    } finally {
      setIsGeneratingDeck(false);
    }
  };

  // ======================
  // RENDER
  // ======================
  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* HEADER */}
      <header className="h-10 flex items-center px-2 border-b border-primary/60">
        <Button variant="ghost" className="text-primary" onClick={() => router.push("/graph")}>
          <ArrowLeftIcon />
        </Button>

        <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
          {grafoInfo?.parentGrafoId && (
            <>
              <button
                onClick={() => router.push(`/graph/${grafoInfo.parentGrafoId}`)}
                className="text-xs text-zinc-400 hover:text-primary truncate max-w-24"
              >
                {grafoInfo.parentNome ?? "Pai"}
              </button>
              <ChevronRightIcon className="size-3 text-zinc-400 flex-shrink-0" />
            </>
          )}
          <span className="font-semibold text-primary truncate">{controller.state.grafoNome}</span>
        </div>

        <div className="mr-1 hidden md:block"><TokenUsageMeter /></div>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => router.push(`/vr/${graphId}`)} title="Visualizar em AR/VR">
          <GlobeIcon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setIsDashboardOpen(v => !v); }} title="Analytics do grafo">
          <BarChart2Icon className="size-4" />
        </Button>

        <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setCommunitiesOpen(v => !v); }} title={`Comunidades detectadas (${communities.length})`}>
          <NetworkIcon className="size-4" />
        </Button>

        <Button variant="ghost" className={`gap-1.5 ${gaps.length > 0 ? "text-amber-500" : "text-primary"}`} onClick={() => { closeToolbarModals(); setGapsOpen(v => !v); }} title={`Lacunas estruturais (${gaps.length})`}>
          <ZapIcon className="size-4" />
          {gaps.length > 0 && <span className="text-xs">{gaps.length}</span>}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" className="gap-1.5 text-violet-600 dark:text-violet-400 font-medium hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400">
              <SparklesIcon className="size-4" />
              IA
              <ChevronDownIcon className="size-3 opacity-60" />
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Construir</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => openAiTool(() => setGenerateGraphOpen(true))}>
              <WandSparklesIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Gerar grafo por texto</div>
                <div className="text-[11px] text-muted-foreground">Cria nós a partir de qualquer material</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openAiTool(() => setAutoLinkOpen(true))}>
              <Link2Icon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Auto-conectar nós</div>
                <div className="text-[11px] text-muted-foreground">Sugere arestas faltantes com IA</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openAiTool(() => setMissingPrereqsOpen(true))}>
              <GitBranchIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Pré-requisitos faltantes</div>
                <div className="text-[11px] text-muted-foreground">Adiciona conceitos base que faltam</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Analisar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setCompletenessOpen(true); }}>
              <GaugeIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Completude do conhecimento</div>
                <div className="text-[11px] text-muted-foreground">Score por assunto com lacunas</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Organizar</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => { closeToolbarModals(); handleSplitByBaralho(); }}
              disabled={isSplittingBaralhos}
            >
              <ScissorsIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Dividir por baralho</div>
                <div className="text-[11px] text-muted-foreground">
                  {(() => {
                    const n = controller.state.filteredNodes.filter((x: any) => x.group === "BARALHO").length;
                    return n > 0 ? `Move ${n} baralho(s) para subgrafos separados` : "Nenhum baralho neste grafo";
                  })()}
                </div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Limpar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setDuplicatesOpen(true); }}>
              <CopyIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Detectar duplicatas</div>
                <div className="text-[11px] text-muted-foreground">Identifica e mescla nós equivalentes</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Explorar</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { closeToolbarModals(); setChatOpen(true); }}>
              <MessageCircleIcon className="size-4 shrink-0 text-violet-500" />
              <div>
                <div className="font-medium">Chat com o grafo</div>
                <div className="text-[11px] text-muted-foreground">Pergunte sobre seu conhecimento</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          className="text-primary gap-1.5"
          onClick={() => { closeToolbarModals(); setIsCreateSubgrafoOpen(true); }}
          title="Criar subgrafo"
        >
          <NetworkIcon className="size-4" />
          <span className="hidden sm:inline text-xs">Subgrafo</span>
        </Button>

        {desktopApp && (
          <Button variant="ghost" className="text-primary gap-1.5" onClick={() => { closeToolbarModals(); setIsVaultOpen(true); }} title="Sincronizar com vault Markdown">
            <FolderTreeIcon className="size-4" /> Vault
          </Button>
        )}
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* GRAPH */}
        <div className="flex-1 relative">
          {legendVisible && <GraphLegend isDark={isDark} highContrast={highContrast} />}
          <GraphSideToolbar
            isDark={isDark}
            tool={controller.state.activeTool}
            onToolChange={controller.actions.setActiveTool}
            onOpenCreateNode={handleOpenCreateNode}
            onOpenEdgeManager={handleOpenEdgeManager}
            onOpenImportJson={() => { closeToolbarModals(); setIsImportJsonOpen(true); }}
            search={search}
            onFocusNode={controller.interactions.focusNode}
            nodeStats={nodeStats}
            hiddenTypes={controller.state.hiddenTypes}
            onToggleType={controller.actions.toggleNodeType}
            onSelectType={selectAllOfType}
            relationStats={relationStats}
            hiddenRelations={controller.state.hiddenRelations}
            onToggleRelation={controller.actions.toggleRelation}
            roadmapOpen={roadmapOpen}
            onToggleRoadmap={() => { const next = !roadmapOpen; closeToolbarModals(); setRoadmapOpen(next); if (!next) setRoadmapSpotlightId(null); }}
          />

          <RoadmapPanel
            open={roadmapOpen}
            onClose={() => { setRoadmapOpen(false); setRoadmapSpotlightId(null); }}
            grafoId={graphId}
            nodes={controller.state.layout}
            edges={controller.state.edges}
            provas={controller.state.layout
              .filter((n: any) => n.group === "PROVA")
              .map((n: any) => ({ id: n.id, label: n.label }))}
            editais={controller.state.layout
              .filter((n: any) => n.group === "EDITAL")
              .map((n: any) => ({ id: n.id, label: n.label }))}
            onFocusNode={(n) => {
              const full = controller.state.layout.find((x) => x.id === n.id);
              if (!full) return;
              setRoadmapSpotlightId(n.id);
              controller.interactions.focusNode(full);
              controller.actions.selectNode(full);
            }}
          />
          <GraphToolbar
            legendVisible={legendVisible}
            onToggleLegend={() => setLegendVisible((v) => !v)}
            onZoomIn={() => is3D ? graph3DRef.current?.zoomIn() : handleZoomButton(0.1)}
            onZoomOut={() => is3D ? graph3DRef.current?.zoomOut() : handleZoomButton(-0.1)}
            physicsEnabled={controller.state.physicsEnabled}
            onTogglePhysics={() => controller.actions.setPhysicsEnabled((v: boolean) => !v)}
            highContrast={highContrast}
            onToggleHighContrast={() => setHighContrast((v) => !v)}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((v) => !v)}
            showClusters={showClusters}
            onToggleShowClusters={() => setShowClusters((v) => !v)}
            onOpenSettings={() => { closeToolbarModals(); setIsSettingsOpen(true); }}
            is3D={is3D}
            onToggle3D={() => setIs3D((v) => !v)}
            canUndo={undo.canUndo}
            canRedo={undo.canRedo}
            onUndo={() => void undoLast()}
            onRedo={() => void redoLast()}
          />
          {has3DBeenOpened && (
            <div className={`absolute inset-0${!is3D ? " invisible pointer-events-none" : ""}`}>
              <Graph3DRenderer
                ref={graph3DRef}
                nodes={controller.state.filteredNodes}
                edges={controller.state.filteredEdges}
                isDark={isDark}
                matchedIds={combinedMatchedIds}
                selectedNodeIds={controller.state.selectedNodeIds}
                onNodeClick={controller.actions.selectNode}
                highContrast={highContrast}
                focusMode={focusMode}
                focusDepth={focusDepth}
                physicsEnabled={controller.state.physicsEnabled}
              />
            </div>
          )}
          {!is3D && (
            <GraphRenderer
              nodes={controller.state.filteredNodes}
              edges={controller.state.filteredEdges}
              zoom={controller.state.zoom}
              pan={controller.state.pan}
              isDark={isDark}
              svgRef={controller.svgRef}
              tool={controller.state.activeTool}
              selectedNodeIds={controller.state.selectedNodeIds}
              marquee={controller.interactions.marquee}
              highContrast={highContrast}
              focusMode={focusMode}
              focusDepth={focusDepth}
              matchedIds={combinedMatchedIds}
              showClusters={showClusters}
              gapBridges={gapBridges}
              highlightedCommunityIds={highlightedCommunityNodeIds}
              onNodeClick={controller.actions.selectNode}
              onNodeDoubleClick={handleNodeDoubleClick}
              onNodeContextMenu={(node, x, y) => setNodeMenu({ node, x, y })}
              onNodeHover={controller.actions.setHoveredNodeId}
              onNodeDragStart={controller.interactions.startDragNode}
              onPanStart={controller.interactions.startPan}
              onMarqueeStart={controller.interactions.startMarquee}
              onWheel={controller.interactions.handleWheel}
            />
          )}

          {/* dropdown entre os dois nós selecionados */}
          {relateMenuPos && (
            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: relateMenuPos.x, top: relateMenuPos.y }}
            >
              <div className="rounded-md border bg-popover text-popover-foreground shadow-md py-1 min-w-44">
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={handleOpenEdgeManager}
                >
                  Relacionar
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                  onClick={() => { closeToolbarModals(); setIsExtractSubgrafoOpen(true); }}
                >
                  <ScissorsIcon className="size-3.5 text-violet-500" />
                  Extrair como subgrafo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        {controller.state.selectedNode && (
        <PropertiesPanel
          selectedNode={controller.state.selectedNode}
          connectedEdges={selectedNodeEdges}
          isDark={isDark}
          onRemoveFromGraph={handleRemoveFromGraph}
          onDeleteNode={handleDeleteNode}
          isDeleting={isDeletingNode}
          onFocusNode={controller.interactions.focusNode}
          onEditEdge={handleEditEdge}
          onDeleteEdge={handleDeleteEdge}
          onAddEdge={handleAddEdgeFromPanel}
          onEditNode={() => setEditingNode(controller.state.selectedNode)}
          onViewNota={() => setViewingNotaId(controller.state.selectedNode?.id ?? null)}
          onViewProva={() => setViewingProvaId(controller.state.selectedNode?.id ?? null)}
          onViewTextoBruto={() => setViewingTextoId(controller.state.selectedNode?.id ?? null)}
          onStudyFlashcard={() => setStudyFlashcardId(controller.state.selectedNode?.id ?? null)}
          onViewFlashcard={() => setViewFlashcardId(controller.state.selectedNode?.id ?? null)}
          onImproveFlashcard={() => setImproveFlashcardId(controller.state.selectedNode?.id ?? null)}
          onImproveQuestao={() => setImproveQuestaoId(controller.state.selectedNode?.id ?? null)}
          onImproveNota={() => setImproveNotaId(controller.state.selectedNode?.id ?? null)}
          onStudyDeck={() => setStudyDeckId(controller.state.selectedNode?.id ?? null)}
          onViewDeck={() => setViewDeckId(controller.state.selectedNode?.id ?? null)}
          onStudyProva={() => setStudyProvaId(controller.state.selectedNode?.id ?? null)}
          onStudyQuestao={() => setStudyQuestaoId(controller.state.selectedNode?.id ?? null)}
          onLinkEdital={() => setLinkEditalOpen(true)}
          onGenerateDeck={handleGenerateDeck}
          onStudyNeighborhood={() => {
            const node = controller.state.selectedNode;
            if (!node) return;
            const ids = getNeighborhoodFlashcardIds(node.id, focusDepth);
            if (ids.length === 0) { toast.error("Nenhum flashcard na vizinhança."); return; }
            setNeighborhoodStudyIds(ids);
          }}
          onGenerateInsights={() => { beginAiWrite(); setInsightsNode(controller.state.selectedNode ?? null); }}
          onExpandNode={() => runNodeExpansion(controller.state.selectedNode)}
          onSelectNode={(nodeId) => {
            const node = controller.state.layout.find((n) => n.id === nodeId);
            if (!node) return;
            controller.actions.selectNode(node);
            controller.interactions.focusNode(node);
          }}
          grafoId={graphId}
          grafoNome={controller.state.grafoNome}
          collapsed={rightPanelCollapsed}
          onToggleCollapse={() =>
            setRightPanelCollapsed((v) => !v)
          }
        />
        )}
      </div>
      {/* MENU DE CONTEXTO DO NÓ (clique direito) */}
      {nodeMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setNodeMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setNodeMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-44 rounded-md border bg-popover text-popover-foreground shadow-md py-1"
            style={{ left: nodeMenu.x, top: nodeMenu.y }}
          >
            {/* Botão direito NUMA seleção múltipla: menu de lote no lugar do menu do nó. */}
            {controller.state.selectedNodeIds.size > 1 && controller.state.selectedNodeIds.has(nodeMenu.node?.id) ? (
              <>
                <div className="px-3 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {controller.state.selectedNodeIds.size} nós selecionados
                </div>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setNodeMenu(null); studySelection(); }}
                >
                  Estudar a seleção
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left font-medium text-violet-600 dark:text-violet-400 hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setNodeMenu(null); void expandSelectionWithAi(); }}
                >
                  Expandir com IA
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setNodeMenu(null); setGenerateDeckConfirm({ node: nodeMenu.node, flashcardIds: selectedFlashcardIds() }); }}
                >
                  Criar baralho com os flashcards
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setNodeMenu(null); setIsExtractSubgrafoOpen(true); }}
                >
                  Extrair para subgrafo…
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setNodeMenu(null); copyToClipboard(); }}
                >
                  Copiar
                </button>
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setNodeMenu(null); void cutSelection(); }}
                >
                  Recortar
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  className="w-full px-3 py-1.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-accent"
                  onClick={() => { setNodeMenu(null); void deleteSelection(); }}
                >
                  Remover do grafo (Del)
                </button>
              </>
            ) : (
              <>
            {nodeMenu.node?.group === "GRAFO_REF" && (
              <>
                {isSubgraphExpanded(controller.state.rawNodes, nodeMenu.node.id) ? (
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left font-medium text-violet-600 dark:text-violet-400 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => { handleRetractGrafoRef(nodeMenu.node.id); setNodeMenu(null); }}
                  >
                    Retrair subgrafo
                  </button>
                ) : (
                  <button
                    className="w-full px-3 py-1.5 text-sm text-left font-medium text-violet-600 dark:text-violet-400 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => { void handleExpandGrafoRef(nodeMenu.node); setNodeMenu(null); }}
                  >
                    Expandir subgrafo
                  </button>
                )}
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { handleOpenGrafoRef(nodeMenu.node.id); setNodeMenu(null); }}
                >
                  Abrir subgrafo →
                </button>
              </>
            )}
            {expandActionFor(nodeMenu.node?.group) && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left font-medium text-violet-600 dark:text-violet-400 hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  const node = nodeMenu.node;
                  setNodeMenu(null);
                  void runNodeExpansion(node);
                }}
              >
                {expandActionFor(nodeMenu.node?.group)?.label}
              </button>
            )}
            {nodeMenu.node?.group === "BARALHO" && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left font-medium text-violet-600 dark:text-violet-400 hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  const deckId = nodeMenu.node.id;
                  setNodeMenu(null);
                  openAiTool(() => setClassifyDeckId(deckId));
                }}
              >
                Classificar acervo (lotes)
              </button>
            )}
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
              onClick={() => { const g = nodeMenu.node?.group; setNodeMenu(null); if (g) selectAllOfType(g); }}
            >
              Selecionar todos do tipo
            </button>
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setEditingNode(nodeMenu.node);
                setNodeMenu(null);
              }}
            >
              Editar
            </button>
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                removeFromGraph(nodeMenu.node);
                setNodeMenu(null);
              }}
            >
              Remover do grafo
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              className="w-full px-3 py-1.5 text-sm text-left text-red-600 dark:text-red-400 hover:bg-accent"
              onClick={() => {
                const node = nodeMenu.node;
                setNodeMenu(null);
                deleteNodeFromApp(node);
              }}
            >
              Excluir do aplicativo
            </button>
              </>
            )}
          </div>
        </>
      )}

      <GraphDashboard
        open={isDashboardOpen}
        onClose={() => { setIsDashboardOpen(false); setDashFilterIds(null); }}
        nodes={controller.state.layout}
        edges={controller.state.edges}
        onFilteredIdsChange={setDashFilterIds}
      />

      <GraphSettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        options={controller.state.physicsOptions}
        onChange={controller.actions.setPhysicsOptions}
        focusDepth={focusDepth}
        onFocusDepthChange={setFocusDepth}
      />
      <CreateNodeModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        grafoId={graphId}
        parentIds={graphEntities}
        provas={controller.state.filteredNodes
          .filter((n: any) => n.group === "PROVA")
          .map((n: any) => ({ id: n.id, label: n.label }))}
        onSuccess={refreshGraph}
      />
      <ImportJsonModal
        open={isImportJsonOpen}
        onOpenChange={setIsImportJsonOpen}
        grafoId={graphId}
        onSuccess={refreshGraph}
      />
      {desktopApp && (
        <VaultSyncModal
          open={isVaultOpen}
          onOpenChange={setIsVaultOpen}
          grafoId={graphId}
          grafoNome={controller.state.grafoNome}
          onSynced={refreshGraph}
        />
      )}
      <EditNodeModal
        open={!!editingNode}
        onOpenChange={(open) => !open && setEditingNode(null)}
        grafoId={graphId}
        node={editingNode}
        onSuccess={refreshGraph}
      />
      <ViewNotaModal
        open={!!viewingNotaId}
        onOpenChange={(open) => !open && setViewingNotaId(null)}
        notaId={viewingNotaId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ViewProvaModal
        open={!!viewingProvaId}
        onOpenChange={(open) => !open && setViewingProvaId(null)}
        provaId={viewingProvaId}
      />
      <StudyProvaModal
        open={!!(studyProvaId || studyQuestaoId)}
        onOpenChange={(open) => { if (!open) { setStudyProvaId(null); setStudyQuestaoId(null); } }}
        provaId={studyProvaId}
        questaoId={studyQuestaoId}
      />
      <ViewTextoBrutoModal
        open={!!viewingTextoId}
        onOpenChange={(open) => !open && setViewingTextoId(null)}
        textoId={viewingTextoId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <StudyFlashcardModal
        open={!!studyFlashcardId}
        onOpenChange={(open) => {
          if (!open) {
            setStudyFlashcardId(null);
            // a revisão pode ter mudado a maestria → recalcula o domínio
            refreshGraph();
          }
        }}
        flashcardId={studyFlashcardId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ViewFlashcardModal
        open={!!viewFlashcardId}
        onOpenChange={(open) => !open && setViewFlashcardId(null)}
        flashcardId={viewFlashcardId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ImproveFlashcardModal
        open={!!improveFlashcardId}
        onOpenChange={(open) => !open && setImproveFlashcardId(null)}
        flashcardId={improveFlashcardId}
        grafoId={graphId}
        onApplied={refreshGraph}
      />
      <ImproveQuestaoModal
        open={!!improveQuestaoId}
        onOpenChange={(open) => !open && setImproveQuestaoId(null)}
        questaoId={improveQuestaoId}
        onApplied={refreshGraph}
      />
      <ImproveNotaModal
        open={!!improveNotaId}
        onOpenChange={(open) => !open && setImproveNotaId(null)}
        notaId={improveNotaId}
        grafoId={graphId}
        onApplied={refreshGraph}
      />
      <NodeInsightsModal
        open={!!insightsNode}
        onOpenChange={(open) => !open && setInsightsNode(null)}
        grafoId={graphId}
        nodeId={insightsNode?.id ?? null}
        nodeLabel={insightsNode?.label}
        onAdded={finishAiWrite("Insights da IA")}
      />
      <StudyDeckModal
        open={!!studyDeckId}
        onOpenChange={(open) => {
          if (!open) {
            setStudyDeckId(null);
            refreshGraph();
          }
        }}
        baralhoId={studyDeckId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <ViewDeckModal
        open={!!viewDeckId}
        onOpenChange={(open) => !open && setViewDeckId(null)}
        baralhoId={viewDeckId}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
      />
      <CommunitiesPanel
        open={communitiesOpen}
        onOpenChange={setCommunitiesOpen}
        communities={communities}
        onCreateDeck={async (community) => {
          const ids = community.nodes.filter(n => n.group === "FLASHCARD").map(n => n.id);
          try {
            await graphHttp.createBaralhoNode(graphId, `Baralho — ${community.label}`, ids);
            await refreshGraph();
            toast.success("Baralho criado!");
          } catch { toast.error("Erro ao criar baralho."); }
        }}
        onHighlightCommunity={setHighlightedCommunityId}
        onSelectCommunity={(community) => {
          controller.actions.setSelectedNodeIds(new Set(community.nodes.map((n) => n.id)));
          controller.actions.setSelectedNode(null);
          setCommunitiesOpen(false);
          toast(`${community.nodes.length} nós da comunidade selecionados`);
        }}
        onSummarizeCommunity={(community) => {
          setCommunitySummary({ label: community.label, nodeIds: community.nodes.map(n => n.id) });
          setCommunitiesOpen(false);
        }}
      />
      <GapDetectionModal
        open={gapsOpen}
        onOpenChange={setGapsOpen}
        grafoId={graphId}
        gaps={gaps}
        onAdded={refreshGraph}
        onHighlightGap={setHighlightedGap}
      />
      <StudyDeckModal
        open={!!neighborhoodStudyIds}
        onOpenChange={(open) => { if (!open) { setNeighborhoodStudyIds(null); refreshGraph(); } }}
        baralhoId={null}
        grafoId={graphId}
        grafoNome={controller.state.grafoNome}
        customFlashcardIds={neighborhoodStudyIds ?? undefined}
        customTitulo={`Vizinhança: ${controller.state.selectedNode?.label ?? ""}`}
      />
      <GenerateGraphModal
        open={generateGraphOpen}
        onOpenChange={setGenerateGraphOpen}
        grafoId={graphId}
        onGenerated={finishAiWrite("Gerar grafo por texto")}
      />
      <LinkEditalProvaModal
        key={controller.state.selectedNode?.id ?? "none"}
        open={linkEditalOpen}
        onOpenChange={setLinkEditalOpen}
        grafoId={graphId}
        node={
          controller.state.selectedNode
            ? {
                id: controller.state.selectedNode.id,
                group: controller.state.selectedNode.tipoReal,
                label: controller.state.selectedNode.label,
              }
            : null
        }
        provas={controller.state.filteredNodes
          .filter((n: any) => n.group === "PROVA")
          .map((n: any) => ({ id: n.id, label: n.label }))}
        onLinked={refreshGraph}
      />
      <AutoLinkModal
        open={autoLinkOpen}
        onOpenChange={setAutoLinkOpen}
        grafoId={graphId}
        onApplied={finishAiWrite("Auto-conectar nós")}
      />
      <ClassifyDeckModal
        open={!!classifyDeckId}
        onOpenChange={(open) => { if (!open) setClassifyDeckId(null); }}
        grafoId={graphId}
        baralhoId={classifyDeckId ?? ""}
        onApplied={finishAiWrite("Classificar acervo do baralho")}
      />
      <DuplicatesModal
        open={duplicatesOpen}
        onOpenChange={setDuplicatesOpen}
        grafoId={graphId}
        onDeleted={refreshGraph}
      />
      <MissingPrereqsModal
        open={missingPrereqsOpen}
        onOpenChange={setMissingPrereqsOpen}
        grafoId={graphId}
        onAdded={finishAiWrite("Pré-requisitos faltantes")}
      />
      <CommunitySummaryModal
        open={!!communitySummary}
        onOpenChange={(open) => { if (!open) setCommunitySummary(null); }}
        grafoId={graphId}
        communityLabel={communitySummary?.label ?? ""}
        nodeIds={communitySummary?.nodeIds ?? []}
      />
      <GraphChatModal
        open={chatOpen}
        onOpenChange={setChatOpen}
        grafoId={graphId}
      />
      <CompletenessModal
        open={completenessOpen}
        onOpenChange={setCompletenessOpen}
        grafoId={graphId}
        onGenerated={refreshGraph}
      />
      <EdgeManagerModal
        open={isEdgeManagerOpen}
        onOpenChange={(open) => {
          setIsEdgeManagerOpen(open);
          if (!open) {
            setEditEdge(null);
            setAddEdgeSourceId(null);
          }
        }}
        grafoId={graphId}
        existingEdges={graphEdges}
        initialEditEdge={editEdge}
        initialSourceId={
          addEdgeSourceId ??
          (controller.state.selectedNodeIds.size === 2
            ? [...controller.state.selectedNodeIds][0]
            : undefined)
        }
        initialTargetId={
          addEdgeSourceId
            ? undefined
            : controller.state.selectedNodeIds.size === 2
            ? [...controller.state.selectedNodeIds][1]
            : undefined
        }
        onSuccess={async () => {
          await loadEdges();
          await refreshGraph();
        }}
      />
      <CreateSubgrafoModal
        open={isCreateSubgrafoOpen}
        onClose={() => setIsCreateSubgrafoOpen(false)}
        parentGrafoId={graphId}
        onCreated={async (_grafoId, _nodeId) => {
          await refreshGraph();
          await graphHttp.getGrafoInfo(graphId).then(setGrafoInfo).catch(() => {});
        }}
      />
      <ExtractSubgrafoModal
        open={isExtractSubgrafoOpen}
        onClose={() => setIsExtractSubgrafoOpen(false)}
        parentGrafoId={graphId}
        selectedNodes={[...controller.state.selectedNodeIds].map((id) => {
          const n = controller.state.layout.find((l) => l.id === id);
          return { id, label: n?.label ?? id, type: n?.group ?? "" };
        })}
        onExtracted={async (_grafoId, _nodeId) => {
          controller.actions.selectNode(null);
          await refreshGraph();
          await graphHttp.getGrafoInfo(graphId).then(setGrafoInfo).catch(() => {});
        }}
      />

      <DeleteDeckModal
        open={!!deleteDeckConfirm}
        onOpenChange={(open) => !open && setDeleteDeckConfirm(null)}
        deckLabel={deleteDeckConfirm?.node?.label ?? ""}
        loading={isDeletingNode}
        onConfirm={async (deleteConnected) => {
          const node = deleteDeckConfirm?.node;
          setDeleteDeckConfirm(null);
          if (node) await performDeleteNode(node, deleteConnected);
        }}
      />
      <GenerateDeckModal
        open={!!generateDeckConfirm}
        onOpenChange={(open) => !open && setGenerateDeckConfirm(null)}
        defaultTitle={generateDeckConfirm?.node?.label ?? ""}
        flashcardCount={generateDeckConfirm?.flashcardIds.length ?? 0}
        loading={isGeneratingDeck}
        onConfirm={performGenerateDeck}
      />
    </div>
  );
}