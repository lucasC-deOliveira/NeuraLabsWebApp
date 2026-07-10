// Persistência das preferências de visualização do grafo (física + destaque de
// conexões) em localStorage. É uma preferência de UI do usuário — global, não por
// grafo — para que a afinação escolhida sobreviva entre sessões (inclusive no
// Electron, que também expõe localStorage no renderer).

import type { PhysicsMode, PhysicsOptions } from "./graph-physics.service";

export interface StoredGraphSettings {
  physicsMode: PhysicsMode;
  physicsOptions: PhysicsOptions;
  focusDepth: number;
}

const STORAGE_KEY = "neuralabs.graph-settings.v1";

/**
 * Lê as preferências salvas. Retorna null quando não há nada salvo ou o
 * localStorage está indisponível (modo privado/quota) — o chamador aplica os
 * padrões nesse caso.
 * @example const saved = loadGraphSettings(); // { physicsMode, focusDepth, ... } | null
 */
export function loadGraphSettings(): Partial<StoredGraphSettings> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredGraphSettings>) : null;
  } catch {
    return null;
  }
}

/**
 * Grava as preferências. Silencioso quando o localStorage está indisponível — a
 * ausência de persistência não deve quebrar a UI.
 * @example saveGraphSettings({ physicsMode, physicsOptions, focusDepth });
 */
export function saveGraphSettings(settings: StoredGraphSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage indisponível — as configurações simplesmente não persistem.
  }
}
