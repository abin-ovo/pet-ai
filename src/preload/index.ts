import { contextBridge, ipcRenderer } from 'electron'
import type { PetBridge } from '../shared/bridge'
const listen = <T>(channel: string, fn: (value: T) => void) => {
  const handler = (_event: Electron.IpcRendererEvent, value: T) => fn(value)
  ipcRenderer.on(channel, handler)
  return () => { ipcRenderer.removeListener(channel, handler) }
}
const bridge: PetBridge = {
  getSnapshot: () => ipcRenderer.invoke('pet:snapshot'),
  dispatch: command => ipcRenderer.invoke('pet:dispatch', command),
  subscribe: fn => listen('pet:changed', fn),
  status: () => ipcRenderer.invoke('pet:status'),
  subscribeStatus: fn => listen('pet:status-changed', fn),
  onTab: fn => listen('pet:tab', fn),
  openPanel: tab => ipcRenderer.invoke('pet:open-panel', tab),
  closePanel: () => ipcRenderer.invoke('pet:close-panel'),
  hide: () => ipcRenderer.invoke('pet:hide'),
  sendChat: text => ipcRenderer.invoke('pet:chat', text),
  cancelChat: () => ipcRenderer.invoke('pet:cancel-chat'),
  checkConnection: () => ipcRenderer.invoke('pet:check-connection'),
  saveConnection: (connection, key) => ipcRenderer.invoke('pet:connection', connection, key),
  removeConnection: () => ipcRenderer.invoke('pet:disconnect'),
  setHitRegions: regions => ipcRenderer.invoke('pet:hit-regions', regions),
  drag: command => ipcRenderer.invoke('pet:drag', command)
}
contextBridge.exposeInMainWorld('xiaotuan', bridge)
