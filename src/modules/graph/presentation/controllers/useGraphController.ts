import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphData } from "../hooks/useGraphData";
import { useGraphLayout } from "../hooks/useGraphLayout";
import { SimNode } from "../../infra/layout/force-layout.engine";
import { useGraphInteractions } from "../hooks/useGraphInteractions";
import { useGraphPhysics } from "../hooks/useGraphPhysics";
import { DEFAULT_PHYSICS_OPTIONS, physicsStep, type PhysicsOptions } from "../services/graph-physics.service";
import { getFilteredEdges, getFilteredNodes } from "../../domain/selectors/graph.selectors";

// "big bang": os nós nascem colapsados num ponto (escala mínima) e se expandem
// com easing até as posições finais ao longo dessa duração
const BIG_BANG_MIN_SCALE = 0.03;
const BIG_BANG_DURATION = 1100; // ms
const BIG_BANG_PRESETTLE_ITERS = 2000; // pré-assenta o alvo no equilíbrio da física
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useGraphController(graphId: string) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const {
    rawNodes,
    rawEdges,
    loading,
    grafoNome,
    setGrafoNome,
    zoom,
    setZoom,
    pan,
    setPan,
    setRawNodes,
    setRawEdges,
  } = useGraphData(graphId);

  const { nodes, edges } = useGraphLayout(rawNodes, rawEdges);

  const [layout, setLayout] = useState<SimNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // tipos de nó ocultados pelo usuário (todos visíveis por padrão)
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const toggleNodeType = (type: string) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  const [activeTool, setActiveTool] = useState<"select" | "marquee" | "hand">("select");
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [physicsOptions, setPhysicsOptions] = useState<PhysicsOptions>(DEFAULT_PHYSICS_OPTIONS);

  const layoutRefForSelect = useRef<SimNode[]>([]);
  useEffect(() => { layoutRefForSelect.current = layout; }, [layout]);

  // animação de entrada "big bang": enquanto roda, a física ambiente fica pausada
  const [introActive, setIntroActive] = useState(false);
  const introRafRef = useRef(0);
  const bigBangDoneRef = useRef(false);
  useEffect(() => () => cancelAnimationFrame(introRafRef.current), []);

  const handleMarqueeSelect = useCallback((ids: string[]) => {
    setSelectedNodeIds(new Set(ids));
    setSelectedNode(
      ids.length === 1
        ? (layoutRefForSelect.current.find((n) => n.id === ids[0]) ?? null)
        : null
    );
  }, []);

  // clique simples seleciona um único nó; com Ctrl/Cmd alterna o nó na
  // seleção múltipla (comportamento do Windows Explorer)
  const selectNode = useCallback((node: any, additive = false) => {
    if (!node) {
      setSelectedNode(null);
      setSelectedNodeIds(new Set());
      return;
    }
    if (!additive) {
      setSelectedNode(node);
      setSelectedNodeIds(new Set([node.id]));
      return;
    }
    const next = new Set(selectedNodeIds);
    if (next.has(node.id)) {
      next.delete(node.id);
      if (next.size === 1) {
        const onlyId = [...next][0];
        setSelectedNode(layoutRefForSelect.current.find((n) => n.id === onlyId) ?? null);
      } else {
        setSelectedNode(null);
      }
    } else {
      next.add(node.id);
      setSelectedNode(node);
    }
    setSelectedNodeIds(next);
  }, [selectedNodeIds]);

  // atalhos estilo Figma: V seleção, M seleção múltipla, H mão
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t?.isContentEditable
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "v") setActiveTool("select");
      if (key === "m") setActiveTool("marquee");
      if (key === "h") setActiveTool("hand");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const interactions = useGraphInteractions({
    layout,
    setLayout,
    zoom,
    setZoom,
    pan,
    setPan,
    svgRef,
    selectedNodeIds,
    onMarqueeSelect: handleMarqueeSelect,
  });

  // física ambiente: nós se movem devagar e orbitam o centro do grafo
  useGraphPhysics({
    enabled: physicsEnabled && !introActive,
    setLayout,
    edges,
    options: physicsOptions,
  });

  // sincroniza layout com os nós:
  //  • primeira carga (física ligada): animação "big bang" — os nós nascem
  //    colapsados no centro e se expandem com easing até as posições finais,
  //    como no exemplo worldCupPerformance do vis-network; depois a física
  //    ambiente assume para assentar.
  //  • cargas seguintes: novos entram, removidos saem, e os existentes mantêm
  //    a posição atual (não embaralha ao criar/excluir).
  useEffect(() => {
    if (nodes.length === 0) return;

    if (!bigBangDoneRef.current) {
      bigBangDoneRef.current = true;

      if (nodes.length > 1) {
        // pré-assenta o layout com a própria física ambiente: o fim do big bang
        // já é o equilíbrio, então a física assume sem retrair o grafo
        let settled: SimNode[] = nodes.map((n) => ({ ...n }));
        for (let i = 0; i < BIG_BANG_PRESETTLE_ITERS; i++) {
          const nx = physicsStep(settled, edges, physicsOptions);
          if (nx === settled) break;
          settled = nx;
        }
        const targets = settled.map((n) => ({ ...n, vx: 0, vy: 0 }));

        // expande a partir do centro do layout final
        let cx = 0;
        let cy = 0;
        for (const n of targets) {
          cx += n.x;
          cy += n.y;
        }
        cx /= targets.length;
        cy /= targets.length;

        const collapse = (scale: number) =>
          targets.map((n) => ({
            ...n,
            x: cx + (n.x - cx) * scale,
            y: cy + (n.y - cy) * scale,
            vx: 0,
            vy: 0,
          }));

        setIntroActive(true);
        setLayout(collapse(BIG_BANG_MIN_SCALE));

        const start =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        const step = () => {
          const now =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          const t = Math.min(1, (now - start) / BIG_BANG_DURATION);
          const scale = BIG_BANG_MIN_SCALE + (1 - BIG_BANG_MIN_SCALE) * easeOutCubic(t);
          setLayout(t >= 1 ? targets : collapse(scale));
          if (t < 1) {
            introRafRef.current = requestAnimationFrame(step);
          } else {
            setIntroActive(false);
          }
        };
        introRafRef.current = requestAnimationFrame(step);
        return;
      }

      setLayout(nodes);
      return;
    }

    setLayout((prev) => {
      if (prev.length === 0) return nodes;
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return nodes.map((n) => {
        const old = prevById.get(n.id);
        return old ? { ...n, x: old.x, y: old.y, vx: 0, vy: 0 } : n;
      });
    });
  }, [nodes]);

  const filteredNodes = useMemo(
    () => getFilteredNodes(layout, hiddenTypes),
    [layout, hiddenTypes]
  );

  // só os nós visíveis contam para as arestas (esconde arestas de tipos ocultos)
  const visibleNodeIds = useMemo(
    () => new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(
    () => getFilteredEdges(edges, layout, visibleNodeIds),
    [edges, layout, visibleNodeIds]
  );

  // nó selecionado "vivo": reflete o layout atual (ex.: domínio recalculado)
  // em vez do snapshot guardado no clique
  const liveSelectedNode = useMemo(
    () => (selectedNode ? layout.find((n) => n.id === selectedNode.id) ?? null : null),
    [selectedNode, layout]
  );

  return {
    svgRef,
    state: {
      layout,
      filteredNodes,
      filteredEdges,
      selectedNode: liveSelectedNode,
      selectedNodeIds,
      hoveredNodeId,
      hiddenTypes,
      zoom,
      pan,
      loading,
      grafoNome,
      activeTool,
      physicsEnabled,
      physicsOptions,
    },
    actions: {
      setSelectedNode,
      selectNode,
      setSelectedNodeIds,
      setHoveredNodeId,
      toggleNodeType,
      setHiddenTypes,
      setLayout,
      setGrafoNome,
      setZoom,
      setPan,
      setRawNodes,
      setRawEdges,
      setActiveTool,
      setPhysicsEnabled,
      setPhysicsOptions,
    },
    interactions,
  };
}