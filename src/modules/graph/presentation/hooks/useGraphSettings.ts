import { useEffect, useRef, useState } from "react";
import type { PhysicsMode, PhysicsOptions } from "../services/graph-physics.service";
import { loadGraphSettings, saveGraphSettings } from "../services/graph-settings-storage";
import { DEFAULT_FOCUS_DEPTH } from "../components/GraphSettingsModal";

interface GraphSettingsControls {
  physicsMode: PhysicsMode;
  setPhysicsMode: (mode: PhysicsMode) => void;
  focusDepth: number;
  setFocusDepth: (depth: number) => void;
}

/**
 * Owns the user-tweakable graph settings (physics mode + focus depth) and keeps
 * them — together with the physics options held by the controller — persisted in
 * localStorage, so a user's tuning survives across sessions. On mount it rehydrates
 * the stored physics options into the controller; afterwards it saves on any change.
 * @example const { physicsMode, setPhysicsMode } = useGraphSettings(options, setOptions);
 */
export function useGraphSettings(
  physicsOptions: PhysicsOptions,
  applyPhysicsOptions: (options: PhysicsOptions) => void,
): GraphSettingsControls {
  const [initial] = useState(loadGraphSettings);
  const [physicsMode, setPhysicsMode] = useState<PhysicsMode>(initial?.physicsMode ?? "default");
  const [focusDepth, setFocusDepth] = useState(initial?.focusDepth ?? DEFAULT_FOCUS_DEPTH);
  const hydrated = useRef(false);
  useEffect(() => {
    if (initial?.physicsOptions) applyPhysicsOptions(initial.physicsOptions);
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (hydrated.current) saveGraphSettings({ physicsMode, focusDepth, physicsOptions });
  }, [physicsMode, focusDepth, physicsOptions]);
  return { physicsMode, setPhysicsMode, focusDepth, setFocusDepth };
}
