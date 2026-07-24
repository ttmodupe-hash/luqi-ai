/**
 * Luqi-AI v3.6.0 — Electron Preload Script
 * Secure bridge between main and renderer processes.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApiUrl: () => ipcRenderer.invoke('get-api-url'),
  setApiUrl: (url) => ipcRenderer.invoke('set-api-url', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
});