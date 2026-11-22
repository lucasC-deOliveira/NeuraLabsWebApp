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
  bookSource?: BookGraphSource;
}

import type { BookGraphIndex, BookGraphSource } from "@contracts/book-graph-source";
import type { ReaderExplanation, SavedReaderExplanation } from "@contracts/reader-explanation";

export interface VaultBookGraphWrite {
  directory: string;
  expectedManifest: string;
  manifest: { id: string; layout?: "shared-para"; bookIndex?: BookGraphIndex; bookSource?: BookGraphSource };
  notes: (VaultFile & { id: string; previousPath?: string; expected?: string })[];
}

export type VaultBookGraphPage =
  | { status: "missing" }
  | { status: "unanalyzed"; graphId: string }
  | { status: "ready"; graphId: string; edges: string[]; files: VaultFile[] };

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
    writeBookGraph: (update: VaultBookGraphWrite) => Promise<boolean>;
    readBookGraphPage: (graphId: string, page: number) => Promise<VaultBookGraphPage>;
    listReaderExplanations: (book: string, page: number) => Promise<SavedReaderExplanation[]>;
    saveReaderExplanation: (book: string, page: number, explanation: ReaderExplanation) => Promise<SavedReaderExplanation>;
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
    listLibraryPdfs: () => Promise<{ path: string; name: string }[]>;
    importLibraryPdf: () => Promise<{ path: string; name: string } | null>;
    readLibraryPdf: (relative: string) => Promise<Uint8Array>;
    loadReaderOcr: (relative: string) => Promise<ReaderOcrCache>;
    recognizeReaderPage: (request: ReaderOcrRequest) => Promise<ReaderOcrPage>;
    convertReaderMarkdown: (request: ReaderConversionRequest) => Promise<ReaderConversionResult>;
    onReaderConversionProgress: (callback: (progress: ReaderConversionProgress) => void) => () => void;
    listReaderTranscriptions: (book: string) => Promise<ReaderTranscription[]>;
    readReaderTranscription: (book: string, id: string) => Promise<string>;
    searchReaderTranscription: (book: string, id: string, query: string) => Promise<ReaderSemanticHit[]>;
    findReaderBookEvidence: (book: string, id: string, query: string) => Promise<ReaderSemanticHit[]>;
    readReaderTranscriptionImage: (book: string, id: string, name: string) => Promise<string | null>;
    trashReaderTranscription: (book: string, id: string) => Promise<"system" | "vault">;
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
    writeBookGraph: (update: VaultBookGraphWrite) => required().vault.writeBookGraph(update),
    readBookGraphPage: (graphId: string, page: number) => required().vault.readBookGraphPage(graphId, page),
    listReaderExplanations: (book: string, page: number) => required().vault.listReaderExplanations(book, page),
    saveReaderExplanation: (book: string, page: number, explanation: ReaderExplanation) => required().vault.saveReaderExplanation(book, page, explanation),
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
    listLibraryPdfs: () => required().vault.listLibraryPdfs(),
    importLibraryPdf: () => required().vault.importLibraryPdf(),
    readLibraryPdf: (relative: string) => required().vault.readLibraryPdf(relative),
    loadReaderOcr: (relative: string) => required().vault.loadReaderOcr(relative),
    recognizeReaderPage: (request: ReaderOcrRequest) => required().vault.recognizeReaderPage(request),
    convertReaderMarkdown: (request: ReaderConversionRequest) => required().vault.convertReaderMarkdown(request),
    onReaderConversionProgress: (callback: (progress: ReaderConversionProgress) => void) => required().vault.onReaderConversionProgress(callback),
    listReaderTranscriptions: (book: string) => required().vault.listReaderTranscriptions(book),
    readReaderTranscription: (book: string, id: string) => required().vault.readReaderTranscription(book, id),
    searchReaderTranscription: (book: string, id: string, query: string) => required().vault.searchReaderTranscription(book, id, query),
    findReaderBookEvidence: (book: string, id: string, query: string) => required().vault.findReaderBookEvidence(book, id, query),
    readReaderTranscriptionImage: (book: string, id: string, name: string) => required().vault.readReaderTranscriptionImage(book, id, name),
    trashReaderTranscription: (book: string, id: string) => required().vault.trashReaderTranscription(book, id),
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
import type { ReaderOcrCache, ReaderOcrPage, ReaderOcrRequest } from "@contracts/reader-ocr";
import type { ReaderConversionProgress, ReaderConversionRequest, ReaderConversionResult } from "@contracts/reader-conversion";
import type { ReaderSemanticHit, ReaderTranscription } from "@contracts/reader-transcriptions";
