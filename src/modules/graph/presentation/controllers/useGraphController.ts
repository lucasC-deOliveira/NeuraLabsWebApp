import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useGraphData } from "../hooks/useGraphData";
import { useGraphLayout } from "../hooks/useGraphLayout";
import { SimNode } from "../../infra/layout/force-layout.engine";
import { useGraphInteractions } from "../hooks/useGraphInteractions";
import { useGraphPhysics } from "../hooks/useGraphPhysics";
import { DEFAULT_CLUSTER_OPTIONS, type PhysicsOptions } from "../services/graph-physics.service";
import { runPresettle } from "../services/run-presettle";
import { isFirstOpenOfGraph } from "./big-bang-guard";
import { getFilteredNodes, getVisibleEdges } from "../../domain/selectors/graph.selectors";
import { graphHttp } from "../../infra/http";
import { useVaultWatch } from "../hooks/useVaultWatch";

// Grafo grande: layout fica num ref (não no estado React) para evitar
// reconciliação de 14k fibers em startTransition que leva 2-3s e trava o pan.
const LARGE_GRAPH_REF_MODE = true;

// "big bang": os nós nascem colapsados num ponto (escala mínima) e se expandem
// com easing até as posições finais ao longo dessa duração
const BIG_BANG_MIN_SCALE = 0.03;
const BIG_BANG_DURATION = 1100; // ms
// Teto de iterações do pre-settle. É só um limite de segurança: o cálculo para
// assim que o layout converge (presettleLayout), o que costuma ocorrer bem antes.
const BIG_BANG_PRESETTLE_ITERS = 1200;
// Adia o disparo do pre-settle um tick para o overlay "montando o layout" pintar
// antes. O cálculo em si roda off-thread (runPresettle) quando há Web Worker.
const BIG_BANG_PREPARE_DELAY = 32; // ms

// Grafos com muitos nós pulam a animação de entrada e desligam a física:
// physicsStep é O(n²) e o big bang copia n objetos por frame — inviável acima deste limiar.
const LARGE_GRAPH_THRESHOLD = 2000;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Reaplica os nós preservando a posição atual dos já existentes (não embaralha ao
// criar/excluir); novos nós entram com a posição vinda do layout.
function mergePositions(nodes: SimNode[], prev: SimNode[]): SimNode[] {
  if (prev.length === 0) return nodes.map((n) => ({ ...n, vx: 0, vy: 0 }));
  const prevById = new Map(prev.map((n) => [n.id, n]));
  return nodes.map((n) => {
    const old = prevById.get(n.id);
    return old ? { ...n, x: old.x, y: old.y, vx: 0, vy: 0 } : { ...n, vx: 0, vy: 0 };
  });
}

export function useGraphController(graphId: string) {
  const svgRef = useRef<HTMLElement | null>(null);

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

  useVaultWatch({ grafoId: graphId, grafoNome, rawNodes, setRawNodes, setRawEdges });

  const [layout, setLayout] = useState<SimNode[]>([]);
  // Ref-mode para grafos grandes: evita 14k itens no estado React
  const largeLayoutRef  = useRef<SimNode[]>([]);
  const [largeLayoutVer, setLargeLayoutVer] = useState(0); // contador de versão
  const isLargeRef = useRef(false); // estável depois do bigbang

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
  // tipos de relação (aresta) ocultados pelo usuário — mesma "camada", para arestas
  const [hiddenRelations, setHiddenRelations] = useState<Set<string>>(new Set());
  const toggleRelation = (type: string) =>
    setHiddenRelations((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  const [activeTool, setActiveTool] = useState<"select" | "marquee" | "hand">("select");
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [physicsOptions, setPhysicsOptions] = useState<PhysicsOptions>(DEFAULT_CLUSTER_OPTIONS);
  const [physicsRestartKey, setPhysicsRestartKey] = useState(0);

  const layoutRefForSelect = useRef<SimNode[]>([]);
  useEffect(() => {
    layoutRefForSelect.current = isLargeRef.current ? largeLayoutRef.current : layout;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, largeLayoutVer]);

  // animação de entrada "big bang": enquanto roda, a física ambiente fica pausada
  const [introActive, setIntroActive] = useState(false);
  // "preparing": layout pesado (pre-settle do big-bang) rodando após a carga —
  // mantém o feedback na tela para não deixar o grafo preto sem nada.
  const [preparing, setPreparing] = useState(false);
  const introRafRef = useRef(0);
  // Guarda o graphId cujo big-bang já rodou: a animação de entrada roda UMA vez por
  // grafo aberto. Refresh dos dados do MESMO grafo (ex.: fechar o modal de estudo →
  // refreshGraph) reusa este guard e cai no branch de "cargas seguintes" (mergePositions),
  // sem re-montar o layout. Trocar de grafo (graphId novo) reanima. (Antes era um boolean
  // resetado na limpeza do efeito p/ o StrictMode dev — o que re-disparava o big-bang a
  // cada refresh real em produção.)
  const bigBangedGraphRef = useRef<string | null>(null);
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

  // Para grafos grandes, passa o ref inteiro às interações (drag de nós funciona)
  // e fornece um setter que atualiza o ref + dispara re-render barato.
  const largeSetLayout = useCallback((updater: any) => {
    const next = typeof updater === "function" ? updater(largeLayoutRef.current) : updater;
    largeLayoutRef.current = next;
    setLargeLayoutVer((v) => v + 1);
  }, []);

  const interactions = useGraphInteractions({
    layout:    isLargeRef.current ? largeLayoutRef.current : layout,
    setLayout: isLargeRef.current ? largeSetLayout : setLayout,
    zoom,
    setZoom,
    pan,
    setPan,
    svgRef,
    selectedNodeIds,
    onMarqueeSelect: handleMarqueeSelect,
  });

  // A física ignora o que está oculto nas camadas: nós de tipos ocultos não
  // exercem/recebem força, e arestas de relações ou nós ocultos não puxam nada.
  const hiddenNodeIds = useMemo(
    () => new Set(nodes.filter((n) => hiddenTypes.has((n as any).group)).map((n) => n.id)),
    [nodes, hiddenTypes],
  );
  const physicsEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          !hiddenRelations.has((e as any).type) &&
          !hiddenNodeIds.has(e.source) &&
          !hiddenNodeIds.has(e.target),
      ),
    [edges, hiddenRelations, hiddenNodeIds],
  );
  // Reinicia a física quando muda o que está visível, para reassentar sem os ocultos.
  useEffect(() => {
    setPhysicsRestartKey((k) => k + 1);
  }, [hiddenNodeIds, physicsEdges]);

  // física ambiente: nós se movem devagar e orbitam o centro do grafo
  useGraphPhysics({
    enabled: physicsEnabled && !introActive,
    setLayout,
    edges: physicsEdges,
    options: physicsOptions,
    restartKey: physicsRestartKey,
    hiddenIds: hiddenNodeIds,
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

    if (isFirstOpenOfGraph(bigBangedGraphRef.current, graphId)) {
      bigBangedGraphRef.current = graphId;

      // Grafo grande: armazena no ref em vez do estado React.
      // startTransition com 14k itens levava 2-3s de reconciliação de fibers,
      // travando o pan. Com ref, o commit é O(1) (uma só atribuição).
      if (LARGE_GRAPH_REF_MODE && nodes.length > LARGE_GRAPH_THRESHOLD) {
        setPhysicsEnabled(false);
        isLargeRef.current = true;
        largeLayoutRef.current = nodes.map((n) => ({ ...n, vx: 0, vy: 0 }));
        setLargeLayoutVer((v) => v + 1); // um único re-render barato
        // Ao sair deste grafo grande (graphId muda → nodes mudam → effect
        // re-roda), a limpeza reseta os flags para que o próximo grafo
        // (possivelmente pequeno) possa rodar o bigbang e a física. O guard do
        // big-bang é keyed por graphId, então o grafo novo reanima sozinho.
        return () => {
          isLargeRef.current = false;
          largeLayoutRef.current = [];
          setPhysicsEnabled(true);
        };
      }

      // Grafo pequeno: garante física ligada caso o usuário venha de um grande.
      setPhysicsEnabled(true);

      if (nodes.length > 1) {
        // Pausa a física ambiente e mostra o feedback ANTES do cálculo pesado.
        setIntroActive(true);
        setPreparing(true);

        let cancelled = false;

        // Anima o "big bang" (colapso → expansão) até os alvos assentados e, no fim,
        // persiste as posições recém-simuladas. Extraída para manter o build enxuto.
        const animateBigBang = (targets: SimNode[], allPinned: boolean): void => {
          let cx = 0;
          let cy = 0;
          for (const n of targets) {
            cx += n.x;
            cy += n.y;
          }
          cx /= targets.length;
          cy /= targets.length;

          const collapse = (scale: number): SimNode[] =>
            targets.map((n) => ({
              ...n,
              x: cx + (n.x - cx) * scale,
              y: cy + (n.y - cy) * scale,
              vx: 0,
              vy: 0,
            }));

          setPreparing(false);
          setLayout(collapse(BIG_BANG_MIN_SCALE));

          const start =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          const step = (): void => {
            if (cancelled) return;
            const now =
              typeof performance !== "undefined" ? performance.now() : Date.now();
            const t = Math.min(1, (now - start) / BIG_BANG_DURATION);
            const scale = BIG_BANG_MIN_SCALE + (1 - BIG_BANG_MIN_SCALE) * easeOutCubic(t);
            setLayout(t >= 1 ? targets : collapse(scale));
            if (t < 1) {
              introRafRef.current = requestAnimationFrame(step);
            } else {
              setIntroActive(false);
              // Persiste posições só quando foram simuladas (nós sem posição salva).
              // Grafos com todas as posições salvas já têm dados inalterados.
              if (!allPinned) {
                graphHttp.saveGraphPositions(
                  graphId,
                  Object.fromEntries(targets.map((n) => [n.id, { x: n.x, y: n.y }])),
                ).catch(() => { /* silencia — não bloqueia o usuário */ });
              }
            }
          };
          introRafRef.current = requestAnimationFrame(step);
        };

        // Monta o layout. Grafo já salvo (allPinned) usa as posições direto. Senão,
        // pré-assenta OFF-THREAD (runPresettle) marcando os pinados como âncoras
        // FIXAS: só os nós novos assentam ao redor deles — converge rápido, não
        // embaralha o existente e não congela a UI. Ver run-presettle / worker.
        const build = (): void => {
          if (cancelled) return;
          const allPinned = nodes.every((n) => n.pinned);
          const seed = allPinned
            ? Promise.resolve(nodes.map((n) => ({ ...n, vx: 0, vy: 0 })))
            : runPresettle(
                nodes.map((n) => ({ ...n, fixed: n.pinned })),
                edges,
                physicsOptions,
                BIG_BANG_PRESETTLE_ITERS,
              );
          seed.then((settled) => {
            if (cancelled) return;
            animateBigBang(settled.map((n) => ({ ...n, fixed: false, vx: 0, vy: 0 })), allPinned);
          });
        };

        const prepTimer = setTimeout(build, BIG_BANG_PREPARE_DELAY);
        // Cancela a animação/timers em voo ao re-rodar o efeito ou desmontar. NÃO
        // reseta o guard do big-bang: um refresh do mesmo grafo deve mesclar posições,
        // não re-animar (ver bigBangedGraphRef). Trocar de grafo reanima pelo graphId.
        return () => {
          cancelled = true;
          clearTimeout(prepTimer);
          cancelAnimationFrame(introRafRef.current);
          setIntroActive(false);
          setPreparing(false);
        };
      }

      setLayout(nodes);
      return;
    }

    // Cargas seguintes: se o grafo cresceu além do limiar (ex.: importou um edital),
    // muda para o modo ref e desliga a física — senão a física O(n²) + reconciliar
    // centenas de fibers no estado React a cada frame travam a UI (mesmo motivo do
    // modo grande na primeira carga).
    if (LARGE_GRAPH_REF_MODE && nodes.length > LARGE_GRAPH_THRESHOLD) {
      isLargeRef.current = true;
      largeLayoutRef.current = mergePositions(nodes, layoutRefForSelect.current);
      setPhysicsEnabled(false);
      setLayout([]);
      setLargeLayoutVer((v) => v + 1);
      return;
    }
    // Encolheu abaixo do limiar: volta ao modo pequeno (física ligada).
    if (isLargeRef.current) {
      isLargeRef.current = false;
      largeLayoutRef.current = [];
      setPhysicsEnabled(true);
    }
    setLayout((prev) => mergePositions(nodes, prev));
    // Reinicia a física para que novos nós (sem posição salva) se posicionem.
    // Para nós existentes (vx=0, vy=0 no equilíbrio) a física para em 1-2 frames.
    setPhysicsRestartKey((k) => k + 1);
  }, [nodes]);

  // Grafo grande: lê do ref (referência estável — useMemo não recomputa no pan)
  const filteredNodes = useMemo(() => {
    if (isLargeRef.current) {
      const src = largeLayoutRef.current;
      return hiddenTypes.size === 0 ? src : src.filter((n) => !hiddenTypes.has((n as any).group));
    }
    return getFilteredNodes(layout, hiddenTypes);
  // largeLayoutVer invalida o memo quando o ref é atualizado (drag, carga inicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, hiddenTypes, largeLayoutVer]);

  // Grafo grande: visibleNodeIds vazio — o Canvas já faz culling interno
  const visibleNodeIds = useMemo(
    () => isLargeRef.current ? new Set<string>() : new Set(filteredNodes.map((n) => n.id)),
    [filteredNodes]
  );

  // Oculta relações desativadas (camadas) e, no grafo pequeno, arestas de nós
  // ocultos. No grafo grande passa null p/ nós — o Canvas filtra por viewport.
  const filteredEdges = useMemo(
    () => getVisibleEdges(edges, isLargeRef.current ? null : visibleNodeIds, hiddenRelations),
    [edges, visibleNodeIds, hiddenRelations]
  );

  const liveSelectedNode = useMemo(() => {
    if (!selectedNode) return null;
    const src = isLargeRef.current ? largeLayoutRef.current : layout;
    return src.find((n) => n.id === selectedNode.id) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode, layout, largeLayoutVer]);

  return {
    svgRef,
    state: {
      layout,
      edges,
      // Nós/arestas crus (pré-layout): a expansão de subgrafo os funde para injetar
      // ou remover a vista de um subgrafo dentro desta.
      rawNodes,
      rawEdges,
      filteredNodes,
      filteredEdges,
      selectedNode: liveSelectedNode,
      selectedNodeIds,
      hoveredNodeId,
      hiddenTypes,
      hiddenRelations,
      zoom,
      pan,
      loading,
      preparing,
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
      toggleRelation,
      setHiddenRelations,
      setLayout,
      setGrafoNome,
      setZoom,
      setPan,
      setRawNodes,
      setRawEdges,
      setActiveTool,
      setPhysicsEnabled,
      setPhysicsOptions,
      removeNodeFromLayout: (nodeId: string) => {
        const filter = (prev: SimNode[]) => prev.filter((n) => n.id !== nodeId);
        if (isLargeRef.current) {
          largeLayoutRef.current = filter(largeLayoutRef.current);
          setLargeLayoutVer((v) => v + 1);
        } else {
          setLayout(filter);
        }
      },
    },
    interactions,
  };
}