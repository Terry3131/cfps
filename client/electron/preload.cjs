const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);
const subscribe = (channel, callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);

  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld("cfpsDesktop", {
  auth: {
    login: (credentials) => invoke("auth:login", credentials),
    me: () => invoke("auth:me"),
    state: () => invoke("auth:state"),
    logout: () => invoke("auth:logout"),
  },
  settings: {
    get: () => invoke("settings:get"),
    update: (values) => invoke("settings:update", values),
  },
  localMemos: {
    list: () => invoke("localMemos:list"),
    saveDraft: (memo) => invoke("localMemos:saveDraft", memo),
    queue: (id) => invoke("localMemos:queue", id),
  },
  syncQueue: {
    summary: () => invoke("syncQueue:summary"),
    process: () => invoke("syncQueue:process"),
    reconnect: () => invoke("syncQueue:reconnect"),
    onProgress: (callback) => subscribe("syncQueue:progress", callback),
  },
  notifications: {
    summary: () => invoke("notifications:summary"),
  },
  desktop: {
    info: () => invoke("desktop:info"),
    exportDb: () => invoke("desktop:exportDb"),
  },
});
