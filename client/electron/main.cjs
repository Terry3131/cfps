const path = require("path");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const { getDb } = require("./database.cjs");
const store = require("./localStore.cjs");
const { syncMemoQueue } = require("./syncService.cjs");

const isDev = !app.isPackaged;
let reconnectSyncInFlight = false;

function getDesktopDbPath() {
  return path.join(app.getPath("userData"), "cfps-desktop.db");
}

async function getDesktopDb() {
  return getDb(getDesktopDbPath());
}

async function runReconnectSyncOnce() {
  if (reconnectSyncInFlight) return { skipped: true, reason: "reconnect sync already running" };

  reconnectSyncInFlight = true;

  try {
    const db = await getDesktopDb();
    const settings = await store.getSettings(db);

    if (!settings.autoSyncEnabled) {
      return { skipped: true, reason: "auto-sync disabled" };
    }

    return syncMemoQueue(db);
  } finally {
    reconnectSyncInFlight = false;
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: "CFPS Desktop",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function registerIpc() {
  ipcMain.handle("settings:get", async () => {
    return store.getSettings(await getDesktopDb());
  });

  ipcMain.handle("settings:update", async (_event, values) => {
    return store.updateSettings(await getDesktopDb(), values || {});
  });

  ipcMain.handle("desktop:info", async () => {
    return store.getDesktopInfo(await getDesktopDb(), app);
  });

  ipcMain.handle("desktop:exportDb", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select Local DB Backup Folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return {
        canceled: true,
        fileName: null,
      };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `cfps-local-backup-${timestamp}.db`;
    const targetPath = path.join(result.filePaths[0], fileName);

    await (await getDesktopDb()).backup(targetPath);

    return {
      canceled: false,
      fileName,
    };
  });

  ipcMain.handle("auth:login", async (_event, credentials) => {
    const db = await getDesktopDb();
    const settings = await store.getSettings(db);
    const apiBaseUrl = store.validateApiBaseUrl(credentials?.apiBaseUrl || settings.apiBaseUrl);

    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: credentials?.username,
        password: credentials?.password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.message || "Desktop login failed.");
    }

    const payload = data?.data || data;
    const token = payload?.token;
    const user = payload?.user;

    if (!token || !user) {
      throw new Error("Login response is missing token or user details.");
    }

    return store.saveAuthSession(db, {
      token,
      user,
      apiBaseUrl,
      rememberSession: Boolean(credentials?.rememberSession),
    });
  });

  ipcMain.handle("auth:me", async () => {
    const db = await getDesktopDb();
    const session = await store.getAuthSession(db);

    if (!session?.token || !session?.apiBaseUrl) {
      return null;
    }

    const response = await fetch(`${session.apiBaseUrl.replace(/\/$/, "")}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });

    if (!response.ok) {
      await store.clearAuthSession(db);
      return null;
    }

    const data = await response.json().catch(() => ({}));
    const user = data?.data?.user || data?.user || data?.data || data;

    return store.saveAuthSession(db, {
      token: session.token,
      user,
      apiBaseUrl: session.apiBaseUrl,
      rememberSession: session.rememberSession,
    });
  });

  ipcMain.handle("auth:logout", async () => {
    await store.clearAuthSession(await getDesktopDb());
    return true;
  });

  ipcMain.handle("auth:state", async () => {
    return store.getAuthState(await getDesktopDb());
  });

  ipcMain.handle("localMemos:list", async () => {
    return store.listLocalMemos(await getDesktopDb());
  });

  ipcMain.handle("localMemos:saveDraft", async (_event, memo) => {
    return store.saveLocalMemo(await getDesktopDb(), memo || {});
  });

  ipcMain.handle("localMemos:queue", async (_event, id) => {
    return store.queueLocalMemo(await getDesktopDb(), id);
  });

  ipcMain.handle("syncQueue:summary", async () => {
    return store.getPendingQueueSummary(await getDesktopDb());
  });

  ipcMain.handle("syncQueue:process", async (event) => {
    return syncMemoQueue(await getDesktopDb(), (progress) => {
      event.sender.send("syncQueue:progress", progress);
    });
  });

  ipcMain.handle("syncQueue:reconnect", async () => {
    return runReconnectSyncOnce();
  });

  ipcMain.handle("notifications:summary", async () => {
    const db = await getDesktopDb();
    const session = await store.getAuthSession(db);

    if (!session?.token || !session?.apiBaseUrl) {
      return { unreadCount: 0, notifications: [] };
    }

    const apiBaseUrl = session.apiBaseUrl.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${session.token}`,
    };

    const [countResponse, listResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/notifications/unread-count`, { headers }),
      fetch(`${apiBaseUrl}/notifications`, { headers }),
    ]);

    if (!countResponse.ok || !listResponse.ok) {
      return { unreadCount: 0, notifications: [] };
    }

    const countPayload = await countResponse.json().catch(() => ({}));
    const listPayload = await listResponse.json().catch(() => ({}));
    const countData = countPayload?.data || countPayload;
    const listData = listPayload?.data || listPayload;

    return {
      unreadCount: countData?.unread_count ?? countData?.unreadCount ?? 0,
      notifications: Array.isArray(listData) ? listData : [],
    };
  });
}

app.whenReady().then(async () => {
  await getDesktopDb();
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
