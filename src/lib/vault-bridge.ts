// Ponte tipada para a API exposta pelo preload do Electron (window.neuralabs).
// Só existe no app desktop; no web, isDesktop() é false e as funções lançam.

export interface VaultFile {
  relPath: string; // ex.: "Resources/conceito--id.md"
  content: string;
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
  },
};
