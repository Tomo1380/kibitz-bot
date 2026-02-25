import { contextBridge, ipcRenderer } from 'electron';

/** Shape of the app state broadcast from the main process */
export interface KibitzState {
  serverUrl: string;
  isCapturing: boolean;
  currentGame: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  recentReactions: Array<{
    id: string;
    text: string;
    personaName: string;
    timestamp: string; // ISO string
  }>;
}

/** API exposed to the renderer under window.kibitz */
export interface KibitzAPI {
  getState(): Promise<KibitzState>;
  setServerUrl(url: string): Promise<{ ok: boolean }>;
  startCapture(): Promise<{ ok: boolean }>;
  stopCapture(): Promise<{ ok: boolean }>;
  testConnection(): Promise<{ ok: boolean }>;
  onStateUpdate(callback: (state: KibitzState) => void): () => void;
}

contextBridge.exposeInMainWorld('kibitz', {
  getState: () => ipcRenderer.invoke('get-state'),

  setServerUrl: (url: string) => ipcRenderer.invoke('set-server-url', url),

  startCapture: () => ipcRenderer.invoke('start-capture'),

  stopCapture: () => ipcRenderer.invoke('stop-capture'),

  testConnection: () => ipcRenderer.invoke('test-connection'),

  onStateUpdate: (callback: (state: KibitzState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: KibitzState) => {
      callback(state);
    };
    ipcRenderer.on('state-update', listener);
    // Return an unsubscribe function
    return () => {
      ipcRenderer.removeListener('state-update', listener);
    };
  },
} satisfies KibitzAPI);
