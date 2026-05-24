const unavailable = () => {
  throw new Error("Desktop features are only available in the Electron app.");
};

export function isDesktopShell() {
  return Boolean(window.cfpsDesktop);
}

export const desktopApi = {
  auth: {
    login: (credentials) => window.cfpsDesktop?.auth.login(credentials) ?? unavailable(),
    me: () => window.cfpsDesktop?.auth.me() ?? unavailable(),
    state: () => window.cfpsDesktop?.auth.state() ?? unavailable(),
    logout: () => window.cfpsDesktop?.auth.logout() ?? unavailable(),
  },
  settings: {
    get: () => window.cfpsDesktop?.settings.get() ?? unavailable(),
    update: (values) => window.cfpsDesktop?.settings.update(values) ?? unavailable(),
  },
  localMemos: {
    list: () => window.cfpsDesktop?.localMemos.list() ?? unavailable(),
    saveDraft: (memo) => window.cfpsDesktop?.localMemos.saveDraft(memo) ?? unavailable(),
    queue: (id) => window.cfpsDesktop?.localMemos.queue(id) ?? unavailable(),
  },
  syncQueue: {
    summary: () => window.cfpsDesktop?.syncQueue.summary() ?? unavailable(),
    process: () => window.cfpsDesktop?.syncQueue.process() ?? unavailable(),
    reconnect: () => window.cfpsDesktop?.syncQueue.reconnect() ?? unavailable(),
    onProgress: (callback) => window.cfpsDesktop?.syncQueue.onProgress(callback) ?? unavailable(),
  },
  notifications: {
    summary: () => window.cfpsDesktop?.notifications.summary() ?? unavailable(),
  },
  desktop: {
    info: () => window.cfpsDesktop?.desktop.info() ?? unavailable(),
    exportDb: () => window.cfpsDesktop?.desktop.exportDb() ?? unavailable(),
  },
};
