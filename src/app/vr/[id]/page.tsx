"use client";

import { useParams, useRouter } from "@/lib/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { getGraphNodes } from "@/lib/graph-api";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, GlobeIcon, BoxIcon, Loader2Icon } from "lucide-react";
import { VRScene } from "@/modules/vr/components/VRScene";
import { useGraphController } from "@/modules/graph/presentation/controllers/useGraphController";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";

type XRMode = "ar" | "vr" | null;

export default function VRPage() {
  const router = useRouter();
  const params = useParams();
  const graphId = params.id as string;
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const controller = useGraphController(graphId);
  const [mode, setMode] = useState<XRMode>(null);
  const [arSupported, setArSupported] = useState(false);
  const [vrSupported, setVrSupported] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!navigator.xr) return;
    navigator.xr.isSessionSupported("immersive-ar").then(setArSupported);
    navigator.xr.isSessionSupported("immersive-vr").then(setVrSupported);
  }, []);

  const handleNodeClick = (node: SimNode) => {
    setSelectedNode(node);
    setSelectedNodeIds(new Set([node.id]));
  };

  const handleClosePanel = () => {
    setSelectedNode(null);
    setSelectedNodeIds(new Set());
  };

  const handleEdgesChanged = useCallback(async () => {
    try {
      const result = await getGraphNodes(graphId);
      controller.actions.setRawEdges(result.edges);
    } catch { /**/ }
  }, [graphId, controller.actions]);

  const handleSelectNode = (nodeId: string) => {
    const target = controller.state.filteredNodes.find((n) => n.id === nodeId);
    if (target) {
      setSelectedNode(target);
      setSelectedNodeIds(new Set([nodeId]));
    }
  };

  if (controller.state.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2Icon className="animate-spin" />
      </div>
    );
  }

  if (mode) {
    return (
      <>
        <VRScene
          mode={mode}
          nodes={controller.state.filteredNodes}
          edges={controller.state.filteredEdges}
          isDark={isDark}
          grafoId={graphId}
          grafoNome={controller.state.grafoNome}
          selectedNodeIds={selectedNodeIds}
          onNodeClick={handleNodeClick}
          onExit={() => { setMode(null); handleClosePanel(); }}
          selectedNode={selectedNode}
          onClosePanel={handleClosePanel}
          onSelectNode={handleSelectNode}
          onEdgesChanged={handleEdgesChanged}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="h-10 flex items-center px-2 border-b border-primary/60">
        <Button variant="ghost" className="text-primary" onClick={() => router.back()}>
          <ArrowLeftIcon />
        </Button>
        <div className="flex-1 text-center font-semibold text-primary">
          {controller.state.grafoNome} — XR
        </div>
      </header>

      <div className="flex flex-col flex-1 items-center justify-center gap-8 p-8">
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Escolha o modo de visualização. Para AR, abra esta página no browser do Quest 3.
        </p>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button
            size="lg"
            className="h-16 gap-3 text-base"
            disabled={!arSupported}
            onClick={() => setMode("ar")}
          >
            <GlobeIcon className="size-5" />
            Realidade Aumentada
            {!arSupported && <span className="text-xs opacity-60 ml-1">(não suportado)</span>}
          </Button>

          <Button
            size="lg"
            variant="secondary"
            className="h-16 gap-3 text-base"
            disabled={!vrSupported}
            onClick={() => setMode("vr")}
          >
            <BoxIcon className="size-5" />
            Realidade Virtual
            {!vrSupported && <span className="text-xs opacity-60 ml-1">(não suportado)</span>}
          </Button>
        </div>

        {!arSupported && !vrSupported && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            WebXR não detectado. Abra esta página no Meta Browser do Quest 3 via HTTPS.
          </p>
        )}
      </div>
    </div>
  );
}
