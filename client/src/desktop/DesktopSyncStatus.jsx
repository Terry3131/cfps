import { useCallback, useEffect, useRef, useState } from "react";
import ActionButton from "../components/ActionButton";
import { desktopApi, isDesktopShell } from "./desktopApi";

export const DESKTOP_SYNC_REFRESH_EVENT = "cfps-desktop-sync-refresh";

export default function DesktopSyncStatus() {
  const [settings, setSettings] = useState(null);
  const [summary, setSummary] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshState = useCallback(async () => {
    if (!isDesktopShell()) return;

    const [nextSettings, nextSummary] = await Promise.all([
      desktopApi.settings.get(),
      desktopApi.syncQueue.summary(),
    ]);

    setSettings(nextSettings);
    setSummary(nextSummary);
  }, []);

  const syncNow = useCallback(async (prefixMessage = "") => {
    if (!isDesktopShell() || syncingRef.current) return;

    setError("");
    setMessage(prefixMessage || "Sync started.");
    setSyncing(true);
    syncingRef.current = true;

    try {
      const result = await desktopApi.syncQueue.process();
      await refreshState();
      setMessage(prefixMessage ? `${prefixMessage} ${result.message}` : result.message);
      window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Failed to process sync queue.");
      setMessage("");
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [refreshState]);

  useEffect(() => {
    if (!isDesktopShell()) return undefined;

    let active = true;

    refreshState()
      .then(() => {
        if (!active) return;
        setMessage("");
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load desktop sync status.");
      });

    const handleRefresh = () => {
      refreshState().catch((err) => setError(err.message || "Failed to refresh desktop sync status."));
    };

    window.addEventListener(DESKTOP_SYNC_REFRESH_EVENT, handleRefresh);

    return () => {
      active = false;
      window.removeEventListener(DESKTOP_SYNC_REFRESH_EVENT, handleRefresh);
    };
  }, [refreshState]);

  useEffect(() => {
    if (!isDesktopShell()) return undefined;

    const handleOnline = async () => {
      try {
        const [nextSettings, nextSummary, authState] = await Promise.all([
          desktopApi.settings.get(),
          desktopApi.syncQueue.summary(),
          desktopApi.auth.state(),
        ]);

        setSettings(nextSettings);
        setSummary(nextSummary);

        if (nextSettings.autoSyncEnabled && authState.authenticated && nextSummary.pendingCount > 0) {
          const result = await desktopApi.syncQueue.reconnect();
          await refreshState();
          setMessage(`Connection restored. ${result.message || "Auto-sync checked."}`);
          window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_REFRESH_EVENT));
        }
      } catch (err) {
        setError(err.message || "Failed to run reconnect sync.");
      }
    };

    window.addEventListener("online", handleOnline);

    return () => window.removeEventListener("online", handleOnline);
  }, [syncNow]);

  if (!isDesktopShell() || (!summary && !message && !error)) {
    return null;
  }

  const pendingCount = summary?.pendingCount || 0;
  const actionableCount = (summary?.pending || []).filter((item) =>
    ["PENDING", "FAILED"].includes(item.syncStatus) && !item.requiresManualRetry
  ).length;
  const showNotice = actionableCount > 0 || message || error;

  if (!showNotice) {
    return null;
  }

  return (
    <div className="border-b bg-amber-50 px-6 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900">
            {actionableCount > 0
              ? `${actionableCount} memo queue item${actionableCount === 1 ? "" : "s"} will sync when processed.`
              : message || "Memo sync queue is up to date."}
          </p>
          {(message || error || settings?.autoSyncEnabled) && (
            <p className={`mt-1 text-xs ${error ? "text-red-700" : "text-amber-800"}`}>
              {error || message || "Auto-sync is enabled and will retry when the connection is restored."}
            </p>
          )}
        </div>

        <ActionButton
          onClick={() => syncNow()}
          disabled={syncing || actionableCount === 0}
          variant="orange"
          className="md:w-auto"
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </ActionButton>
      </div>
    </div>
  );
}
