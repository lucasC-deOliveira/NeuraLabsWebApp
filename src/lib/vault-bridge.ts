// Ponte tipada para a API exposta pelo preload do Electron (window.neuralabs).
// Só existe no app desktop; no web, isDesktop() é false e as funções lançam.

export interface SavedApiConfig {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

export type CodexProxyState = { enabled: false } | { enabled: true; previous: SavedApiConfig | null; proxy: SavedApiConfig };

export interface ClaudeCodeConfigResult {
  enabled: boolean;
  savedApiConfig: SavedApiConfig | null;
}

export interface VaultFile {
  preserveSharedContent?: boolean;
  relPath: string; // ex.: "Resources/conceito--id.md"
  content: string;
}

export interface VaultGraphMarkdownWrite {
  dir: string;
  relPath: string;
  expected: string;
  next: string;
}

export interface VaultGraphFolder {
  layout?: "shared-para";
  id: string;
  label: string;
  directory: string;
  modifiedAt: string;
}

export interface VaultSyncState {
  lastPull?: string; // ISO 8601
  lastPush?: string; // ISO 8601
  dir?: string;      // caminho absoluto da pasta do vault deste grafo
}

export interface VaultStudyWrite {
  folder: string;
  expected: string | null;
  next: string;
}

interface NeuralabsBridge {
  isDesktop: boolean;
  getApiUrl: () => Promise<string>;
  setApiUrl: (url: string) => Promise<{ ok: boolean }>;
  claudeCode: {
    getConfig: () => Promise<ClaudeCodeConfigResult>;
    setEnabled: (
      enabled: boolean,
      savedConfig?: SavedApiConfig
    ) => Promise<{ ok: boolean; savedApiConfig?: SavedApiConfig | null }>;
  };
  codexProxy: {
    getConfig: () => Promise<CodexProxyState>;
    start: (previous: SavedApiConfig | null) => Promise<SavedApiConfig>;
    stop: () => Promise<void>;
  };
  vault: {
    getPath: () => Promise<string | null>;
    listGraphFolders: () => Promise<VaultGraphFolder[]>;
    listExamAttempts?: (dir: string) => Promise<string[]>;
    pickFolder: () => Promise<string | null>;
    readStudy: (folder: string) => Promise<string | null>;
    writeStudy: (update: VaultStudyWrite) => Promise<boolean>;
    read: (dir: string) => Promise<VaultFile[]>;
    write: (dir: string, files: VaultFile[]) => Promise<{ written: number }>;
    openFolder: (dir: string) => Promise<void>;
    readSyncState: (dir: string) => Promise<VaultSyncState | null>;
    writeSyncState: (dir: string, state: Partial<VaultSyncState>) => Promise<{ ok: boolean }>;
    checkModified: (dir: string, since: string) => Promise<{ count: number; files: string[] }>;
    readFile: (dir: string, relPath: string) => Promise<string | null>;
    writeFile: (dir: string, relPath: string, content: string) => Promise<{ ok: boolean }>;
    replaceGraphMarkdown: (dir: string, relPath: string, expected: string, next: string) => Promise<boolean>;
    replaceGraphMarkdownBatch: (writes: VaultGraphMarkdownWrite[]) => Promise<boolean>;
    deleteFiles: (dir: string, relPaths: string[]) => Promise<{ deleted: string[]; skipped: string[] }>;
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
  claudeCode: {
    getConfig: () => required().claudeCode.getConfig(),
    setEnabled: (enabled: boolean, savedConfig?: SavedApiConfig) =>
      required().claudeCode.setEnabled(enabled, savedConfig),
  },
  codexProxy: {
    getConfig: () => required().codexProxy.getConfig(),
    start: (previous: SavedApiConfig | null) => required().codexProxy.start(previous),
    stop: () => required().codexProxy.stop(),
  },
  vault: {
    getPath: () => required().vault.getPath(),
    listGraphFolders: () => required().vault.listGraphFolders(),
    listExamAttempts: (dir: string) => required().vault.listExamAttempts?.(dir) ?? null,
    pickFolder: () => required().vault.pickFolder(),
    readStudy: (folder: string) => required().vault.readStudy(folder),
    writeStudy: (update: VaultStudyWrite) => required().vault.writeStudy(update),
    read: (dir: string) => required().vault.read(dir),
    write: (dir: string, files: VaultFile[]) => required().vault.write(dir, files),
    openFolder: (dir: string) => required().vault.openFolder(dir),
    readSyncState: (dir: string) => required().vault.readSyncState(dir),
    writeSyncState: (dir: string, state: Partial<VaultSyncState>) => required().vault.writeSyncState(dir, state),
    checkModified: (dir: string, since: string) => required().vault.checkModified(dir, since),
    readFile: (dir: string, relPath: string) => required().vault.readFile(dir, relPath),
    writeFile: (dir: string, relPath: string, content: string) => required().vault.writeFile(dir, relPath, content),
    replaceGraphMarkdown: (dir: string, relPath: string, expected: string, next: string) =>
      required().vault.replaceGraphMarkdown(dir, relPath, expected, next),
    replaceGraphMarkdownBatch: (writes: VaultGraphMarkdownWrite[]) =>
      required().vault.replaceGraphMarkdownBatch(writes),
    deleteFiles: (dir: string, relPaths: string[]) => required().vault.deleteFiles(dir, relPaths),
    watch: (dir: string, watchId: string) => required().vault.watch(dir, watchId),
    unwatch: (watchId: string) => required().vault.unwatch(watchId),
    onChanged: (cb: (data: { watchId: string; files: VaultFile[] }) => void) => required().vault.onChanged(cb),
  },
};
