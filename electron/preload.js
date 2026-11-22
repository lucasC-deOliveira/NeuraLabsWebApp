const { contextBridge, ipcRenderer } = require("electron");

// URL do backend salva em config (lida de forma síncrona antes da página
// carregar) para o cliente HTTP (src/lib/api.ts) já apontar pro backend certo.
let apiUrl = "";
try {
  apiUrl = ipcRenderer.sendSync("neuralabs:get-api-url-sync") || "";
} catch {
  apiUrl = "";
}
if (apiUrl) contextBridge.exposeInMainWorld("__NEURALABS_API_URL__", apiUrl);

// Ponte do app desktop: backend configurável + operações de vault (sistema de
// arquivos) no processo principal. A edição dos .md é externa (Obsidian/Claude).
contextBridge.exposeInMainWorld("neuralabs", {
  isDesktop: true,
  getApiUrl: () => ipcRenderer.invoke("neuralabs:get-api-url"),
  setApiUrl: (url) => ipcRenderer.invoke("neuralabs:set-api-url", url),
  claudeCode: {
    getConfig: () => ipcRenderer.invoke("neuralabs:get-claude-code-config"),
    setEnabled: (enabled, savedConfig) =>
      ipcRenderer.invoke("neuralabs:set-claude-code-enabled", { enabled, savedConfig }),
  },
  codexProxy: {
    getConfig: () => ipcRenderer.invoke("neuralabs:get-codex-proxy"),
    start: (previous) => ipcRenderer.invoke("neuralabs:start-codex-proxy", previous),
    stop: () => ipcRenderer.invoke("neuralabs:stop-codex-proxy"),
  },
  vault: {
    getPath: () => ipcRenderer.invoke("vault:get-path"),
    listGraphFolders: () => ipcRenderer.invoke("vault:list-graph-folders"),
    writeBookGraph: (update) => ipcRenderer.invoke("vault:write-book-graph", update),
    readBookGraphPage: (graphId, page) => ipcRenderer.invoke("vault:read-book-graph-page", graphId, page),
    listReaderExplanations: (book, page) => ipcRenderer.invoke("vault:list-reader-explanations", book, page),
    saveReaderExplanation: (book, page, explanation) => ipcRenderer.invoke("vault:save-reader-explanation", book, page, explanation),
    listExamAttempts: (dir) => ipcRenderer.invoke("vault:list-exam-attempts", dir),
    pickFolder: () => ipcRenderer.invoke("vault:pick-folder"),
    readStudy: (folder) => ipcRenderer.invoke("vault:study-read", folder),
    writeStudy: (update) => ipcRenderer.invoke("vault:study-write", update),
    read: (dir) => ipcRenderer.invoke("vault:read", dir),
    write: (dir, files) => ipcRenderer.invoke("vault:write", { dir, files }),
    openFolder: (dir) => ipcRenderer.invoke("vault:open-folder", dir),
    readSyncState: (dir) => ipcRenderer.invoke("vault:read-sync-state", dir),
    writeSyncState: (dir, state) => ipcRenderer.invoke("vault:write-sync-state", { dir, state }),
    checkModified: (dir, since) => ipcRenderer.invoke("vault:check-modified", { dir, since }),
    readFile: (dir, relPath) => ipcRenderer.invoke("vault:read-file", { dir, relPath }),
    listLibraryPdfs: () => ipcRenderer.invoke("vault:list-library-pdfs"),
    importLibraryPdf: () => ipcRenderer.invoke("vault:import-library-pdf"),
    readLibraryPdf: (relative) => ipcRenderer.invoke("vault:read-library-pdf", relative),
    loadReaderOcr: (relative) => ipcRenderer.invoke("vault:load-reader-ocr", relative),
    recognizeReaderPage: (request) => ipcRenderer.invoke("vault:recognize-reader-page", request),
    convertReaderMarkdown: (request) => ipcRenderer.invoke("vault:convert-reader-markdown", request),
    onReaderConversionProgress: (callback) => {
      const listener = (_event, value) => callback(value);
      ipcRenderer.on("vault:reader-conversion-progress", listener);
      return () => ipcRenderer.removeListener("vault:reader-conversion-progress", listener);
    },
    listReaderTranscriptions: (book) => ipcRenderer.invoke("vault:list-reader-transcriptions", book),
    readReaderTranscription: (book, id) => ipcRenderer.invoke("vault:read-reader-transcription", book, id),
    searchReaderTranscription: (book, id, query) => ipcRenderer.invoke("vault:search-reader-transcription", book, id, query),
    findReaderBookEvidence: (book, id, query) => ipcRenderer.invoke("vault:find-reader-book-evidence", book, id, query),
    readReaderTranscriptionImage: (book, id, name) => ipcRenderer.invoke("vault:read-reader-transcription-image", book, id, name),
    trashReaderTranscription: (book, id) => ipcRenderer.invoke("vault:trash-reader-transcription", book, id),
    writeFile: (dir, relPath, content) => ipcRenderer.invoke("vault:write-file", { dir, relPath, content }),
    replaceGraphMarkdown: (dir, relPath, expected, next) =>
      ipcRenderer.invoke("vault:replace-graph-markdown", { dir, relPath, expected, next }),
    replaceGraphMarkdownBatch: (writes) => ipcRenderer.invoke("vault:replace-graph-markdown-batch", writes),
    deleteFiles: (dir, relPaths) => ipcRenderer.invoke("vault:delete-files", { dir, relPaths }),
    watch: (dir, watchId) => ipcRenderer.invoke("vault:watch", { dir, watchId }),
    unwatch: (watchId) => ipcRenderer.invoke("vault:unwatch", watchId),
    onChanged: (cb) => {
      const fn = (_e, data) => cb(data);
      ipcRenderer.on("vault:changed", fn);
      return () => ipcRenderer.off("vault:changed", fn);
    },
  },
});
