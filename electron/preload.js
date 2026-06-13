const { contextBridge, ipcRenderer } = require("electron");

// API mínima exposta à página. Sinaliza que é o app desktop e dispara o
// login social (OAuth) via processo principal (navegador externo + loopback).
contextBridge.exposeInMainWorld("desktopAuth", {
  isDesktop: true,
  login: (provider) => ipcRenderer.invoke("desktop-oauth:login", provider),
});
