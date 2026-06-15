"use client";

import { Canvas } from "@react-three/fiber";
import { XR, createXRStore, PointerEvents, DefaultXRController } from "@react-three/xr";
import { useMemo } from "react";
import { VRGraph } from "./VRGraph";
import { VRPanel3D } from "./VRPanel3D";
import type { SimNode, SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";

type XRMode = "ar" | "vr";

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
}

export function VRScene({
  mode, nodes, edges, isDark, grafoNome,
  selectedNodeIds, onNodeClick, onExit,
  selectedNode, onClosePanel, onSelectNode, grafoId,
}: VRSceneProps) {
  const store = useMemo(() => createXRStore({ controller: DefaultXRController }), []);

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

      {/* Canvas com PointerEvents do @react-three/xr — essencial para eventos dentro do headset */}
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0, 1.6, 0.5], fov: 70 }}
        frameloop="always"
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      >
        <XR store={store}>
          {/* Habilita eventos de pointer compatíveis com XR controllers e hand tracking */}
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

          {selectedNode && (
            <VRPanel3D
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              isDark={isDark}
              grafoId={grafoId}
              grafoNome={grafoNome}
              onClose={onClosePanel}
              onSelectNode={onSelectNode}
            />
          )}
        </XR>
      </Canvas>
    </div>
  );
}
