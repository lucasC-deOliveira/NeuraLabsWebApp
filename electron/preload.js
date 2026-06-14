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
  vault: {
    getPath: () => ipcRenderer.invoke("vault:get-path"),
    pickFolder: () => ipcRenderer.invoke("vault:pick-folder"),
    read: (dir) => ipcRenderer.invoke("vault:read", dir),
    write: (dir, files) => ipcRenderer.invoke("vault:write", { dir, files }),
    openFolder: (dir) => ipcRenderer.invoke("vault:open-folder", dir),
    readSyncState: (dir) => ipcRenderer.invoke("vault:read-sync-state", dir),
    writeSyncState: (dir, state) => ipcRenderer.invoke("vault:write-sync-state", { dir, state }),
    checkModified: (dir, since) => ipcRenderer.invoke("vault:check-modified", { dir, since }),
    watch: (dir, watchId) => ipcRenderer.invoke("vault:watch", { dir, watchId }),
    unwatch: (watchId) => ipcRenderer.invoke("vault:unwatch", watchId),
    onChanged: (cb) => {
      const fn = (_e, data) => cb(data);
      ipcRenderer.on("vault:changed", fn);
      return () => ipcRenderer.off("vault:changed", fn);
    },
  },
});
