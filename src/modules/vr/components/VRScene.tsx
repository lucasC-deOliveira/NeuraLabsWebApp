"use client";

import { Canvas } from "@react-three/fiber";
import { XR, createXRStore, PointerEvents, DefaultXRController } from "@react-three/xr";
import { useRef, useState } from "react";
import { VRGraph } from "./VRGraph";
import { VRPanel3D } from "./VRPanel3D";
import { VRContentPanel3D } from "./VRContentPanel3D";
import { VRStudyPanel3D } from "./VRStudyPanel3D";
import { VREditPanel3D } from "./VREditPanel3D";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";

type XRMode = "ar" | "vr";
type Overlay = "edit" | "content" | "study" | null;

interface VRSceneProps {
  mode: XRMode;
  nodes: SimNode[];
  edges: SimEdge[];
  isDark: boolean;
  grafoNome: string;
  selectedNodeIds: Set<string>;
  onNodeClick: (node: SimNode) => void;
  onExit: () => void;
  selectedNode: SimNode | null;
  onClosePanel: () => void;
  onSelectNode: (nodeId: string) => void;
  grafoId: string;
  onEdgesChanged: () => void;
  onGraphChanged: () => void;
}

export function VRScene({
  mode, nodes, edges, isDark, grafoNome,
  selectedNodeIds, onNodeClick, onExit,
  selectedNode, onClosePanel, onSelectNode,
  grafoId, onEdgesChanged, onGraphChanged,
}: VRSceneProps) {
  const storeRef = useRef<ReturnType<typeof createXRStore> | null>(null);
  if (!storeRef.current) storeRef.current = createXRStore({ controller: DefaultXRController });
  const store = storeRef.current;

  const [overlay,     setOverlay]     = useState<Overlay>(null);
  const [overlayNode, setOverlayNode] = useState<SimNode | null>(null);

  const openOverlay = (type: Overlay) => {
    if (!selectedNode) return;
    setOverlayNode(selectedNode);
    setOverlay(type);
  };
  const closeOverlay = () => { setOverlay(null); setOverlayNode(null); };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Overlay pré-XR: botões de entrada */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 pointer-events-none">
        <p className="text-white text-lg font-semibold drop-shadow">{grafoNome}</p>
        <p className="text-white/60 text-sm">{nodes.length} nós · {edges.length} relações</p>
        <button
          className="pointer-events-auto px-8 py-4 rounded-xl bg-white text-black font-bold text-base active:opacity-80 shadow-lg"
          onClick={() => mode === "ar" ? store.enterAR() : store.enterVR()}
        >
          {mode === "ar" ? "Iniciar AR" : "Iniciar VR"}
        </button>
        <button
          className="pointer-events-auto px-4 py-2 rounded-lg border border-white/40 text-white/70 text-sm"
          onClick={onExit}
        >
          Voltar
        </button>
      </div>

      {/* Canvas 3D — todo o conteúdo renderizado aqui dentro */}
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 1.6, 0.5], fov: 70 }}
        frameloop="always"
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      >
        <XR store={store}>
          <PointerEvents />
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 5]} intensity={1.1} />
          <pointLight position={[-3, 3, -3]} intensity={0.4} color="#6366f1" />

          <VRGraph
            nodes={nodes}
            edges={edges}
            isDark={isDark}
            selectedNodeIds={selectedNodeIds}
            onNodeClick={onNodeClick}
          />

          {/* Painel de propriedades — oculto quando um overlay 3D está aberto */}
          {selectedNode && overlay === null && (
            <VRPanel3D
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              isDark={isDark}
              grafoId={grafoId}
              grafoNome={grafoNome}
              onClose={onClosePanel}
              onSelectNode={onSelectNode}
              onEdgesChanged={onEdgesChanged}
              onEditNode={()    => openOverlay("edit")}
              onShowContent={() => openOverlay("content")}
              onStudy={()       => openOverlay("study")}
            />
          )}

          {/* Painéis de overlay 3D — substituem VRPanel3D na mesma posição */}
          {overlayNode && overlay === "content" && (
            <VRContentPanel3D node={overlayNode} isDark={isDark} onClose={closeOverlay} />
          )}
          {overlayNode && overlay === "study" && (
            <VRStudyPanel3D node={overlayNode} isDark={isDark} onClose={closeOverlay} />
          )}
          {overlayNode && overlay === "edit" && (
            <VREditPanel3D
              node={overlayNode}
              isDark={isDark}
              grafoId={grafoId}
              onSuccess={() => { closeOverlay(); onGraphChanged(); }}
              onClose={closeOverlay}
            />
          )}
        </XR>
      </Canvas>
    </div>
  );
}
