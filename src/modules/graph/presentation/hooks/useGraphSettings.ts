import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CLUSTER_OPTIONS,
  type PhysicsOptions,
} from "../services/graph-physics.service";
import { loadGraphSettings, saveGraphSettings } from "../services/graph-settings-storage";
import { DEFAULT_FOCUS_DEPTH } from "../components/GraphSettingsModal";

interface GraphSettingsControls {
  focusDepth: number;
  setFocusDepth: (depth: number) => void;
}

/**
 * Owns the user-tweakable graph settings (focus depth) and keeps them — together
 * with the physics options held by the controller — persisted in localStorage, so
 * a user's tuning survives across sessions. On mount it rehydrates the stored
 * physics options into the controller; afterwards it saves on any change.
 * @example const { focusDepth, setFocusDepth } = useGraphSettings(options, setOptions);
 */
export function useGraphSettings(
  physicsOptions: PhysicsOptions,
  applyPhysicsOptions: (options: PhysicsOptions) => void,
): GraphSettingsControls {
  const [initial] = useState(loadGraphSettings);
  const [focusDepth, setFocusDepth] = useState(initial?.focusDepth ?? DEFAULT_FOCUS_DEPTH);
  const hydrated = useRef(false);
  useEffect(() => {
    // Migração: preferências legadas do modo hierárquico (clusterBy "hierarchy")
    // caem para o padrão de cluster, agora o único modo.
    const stored = initial?.physicsOptions;
    if (stored) {
      applyPhysicsOptions(stored.clusterBy === "hierarchy" ? DEFAULT_CLUSTER_OPTIONS : stored);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (hydrated.current) saveGraphSettings({ focusDepth, physicsOptions });
  }, [focusDepth, physicsOptions]);
  return { focusDepth, setFocusDepth };
}
