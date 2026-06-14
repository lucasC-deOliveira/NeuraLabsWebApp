// Ponte tipada para a API exposta pelo preload do Electron (window.neuralabs).
// Só existe no app desktop; no web, isDesktop() é false e as funções lançam.

export interface VaultFile {
  relPath: string; // ex.: "Resources/conceito--id.md"
  content: string;
}

export interface VaultSyncState {
  lastPull?: string; // ISO 8601
  lastPush?: string; // ISO 8601
}

interface NeuralabsBridge {
  isDesktop: boolean;
  getApiUrl: () => Promise<string>;
  setApiUrl: (url: string) => Promise<{ ok: boolean }>;
  vault: {
    getPath: () => Promise<string | null>;
    pickFolder: () => Promise<string | null>;
    read: (dir: string) => Promise<VaultFile[]>;
    write: (dir: string, files: VaultFile[]) => Promise<{ written: number }>;
    openFolder: (dir: string) => Promise<void>;
    readSyncState: (dir: string) => Promise<VaultSyncState | null>;
    writeSyncState: (dir: string, state: Partial<VaultSyncState>) => Promise<{ ok: boolean }>;
    checkModified: (dir: string, since: string) => Promise<{ count: number; files: string[] }>;
    readFile: (dir: string, relPath: string) => Promise<string | null>;
    writeFile: (dir: string, relPath: string, content: string) => Promise<{ ok: boolean }>;
    watch: (dir: string, watchId: string) => Promise<{ ok: boolean }>;
    unwatch: (watchId: string) => Promise<{ ok: boolean }>;
    onChanged: (cb: (data: { watchId: string; files: VaultFile[] }) => void) => () => void;
  };
}

function bridge(): NeuralabsBridge | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { neuralabs?: NeuralabsBridge }).neuralabs ?? null;
}

export function isDesktop(): boolean {
  return bridge()?.isDesktop === true;
}

function required(): NeuralabsBridge {
  const b = bridge();
  if (!b) throw new Error("Recurso disponível apenas no app desktop.");
  return b;
}

export const desktop = {
  getApiUrl: () => required().getApiUrl(),
  setApiUrl: (url: string) => required().setApiUrl(url),
  vault: {
    getPath: () => required().vault.getPath(),
    pickFolder: () => required().vault.pickFolder(),
    read: (dir: string) => required().vault.read(dir),
    write: (dir: string, files: VaultFile[]) => required().vault.write(dir, files),
    openFolder: (dir: string) => required().vault.openFolder(dir),
    readSyncState: (dir: string) => required().vault.readSyncState(dir),
    writeSyncState: (dir: string, state: Partial<VaultSyncState>) => required().vault.writeSyncState(dir, state),
    checkModified: (dir: string, since: string) => required().vault.checkModified(dir, since),
    readFile: (dir: string, relPath: string) => required().vault.readFile(dir, relPath),
    writeFile: (dir: string, relPath: string, content: string) => required().vault.writeFile(dir, relPath, content),
    watch: (dir: string, watchId: string) => required().vault.watch(dir, watchId),
    unwatch: (watchId: string) => required().vault.unwatch(watchId),
    onChanged: (cb: (data: { watchId: string; files: VaultFile[] }) => void) => required().vault.onChanged(cb),
  },
};
