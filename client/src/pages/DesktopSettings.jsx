import { useEffect, useState } from "react";
import ActionButton from "../components/ActionButton";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import InfoRow from "../components/InfoRow";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import { desktopApi, isDesktopShell } from "../desktop/desktopApi";
import { formatDateTime } from "../utils/format";

export default function DesktopSettings() {
  const [settings, setSettings] = useState({
    apiBaseUrl: "",
    deviceName: "",
    syncIntervalMinutes: 15,
    autoSyncEnabled: false,
    rememberSession: true,
    lastSyncAt: null,
  });
  const [desktopInfo, setDesktopInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isDesktopShell()) return;

    Promise.all([
      desktopApi.settings.get(),
      desktopApi.desktop.info(),
    ])
      .then(([nextSettings, info]) => {
        setSettings(nextSettings);
        setDesktopInfo(info);
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const saved = await desktopApi.settings.update({
        ...settings,
        syncIntervalMinutes: Number(settings.syncIntervalMinutes) || 15,
      });
      const info = await desktopApi.desktop.info();
      setSettings(saved);
      setDesktopInfo(info);
      setMessage("Desktop settings saved.");
    } catch (err) {
      setError(err.message || "Invalid API Base URL.");
    } finally {
      setLoading(false);
    }
  };

  const exportLocalDb = async () => {
    setError("");
    setMessage("");
    setExporting(true);

    try {
      const result = await desktopApi.desktop.exportDb();

      if (result.canceled) {
        setMessage("Local DB export canceled.");
      } else {
        setMessage(`Local DB backup exported as ${result.fileName}.`);
      }
    } catch (err) {
      setError(err.message || "Failed to export local DB backup.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Desktop Settings"
        subtitle="Local shell configuration for API access, sync cadence, and device identity."
        action={<ActionButton to="/desktop/local-memos" variant="ghost">Local Drafts</ActionButton>}
      />

      {!isDesktopShell() && (
        <ErrorBox message="Desktop IPC is unavailable in the web browser. Settings can only be saved from Electron." />
      )}

      <ErrorBox message={error} />

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Desktop Updates</p>
        <p>Automatic desktop updates are not enabled in this release.</p>
        <p className="mt-1">Install future updates using the approved CFPS Desktop installer package.</p>
      </div>

      <SectionCard title="Connection">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
          <FormField
            label="API Base URL"
            name="apiBaseUrl"
            value={settings.apiBaseUrl}
            onChange={handleChange}
            placeholder="http://localhost:5000"
            required
          />
          <p className="text-xs text-slate-500">
            Use the production HTTPS API, localhost for testing, or an approved LAN/dev IP only.
          </p>

          <FormField
            label="Device Name"
            name="deviceName"
            value={settings.deviceName}
            onChange={handleChange}
            required
          />

          <FormField
            label="Sync Interval Minutes"
            name="syncIntervalMinutes"
            type="number"
            min="1"
            value={settings.syncIntervalMinutes}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="autoSyncEnabled"
                checked={Boolean(settings.autoSyncEnabled)}
                onChange={handleChange}
              />
              Auto-sync enabled
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="rememberSession"
                checked={Boolean(settings.rememberSession)}
                onChange={handleChange}
              />
              Remember session
            </label>
          </div>

          <ActionButton type="submit" disabled={loading || !isDesktopShell()}>
            {loading ? "Saving..." : "Save Settings"}
          </ActionButton>
        </form>
      </SectionCard>

      <SectionCard title="Local Data">
        <div className="space-y-4">
          <InfoRow label="Last Sync Time" value={settings.lastSyncAt ? formatDateTime(settings.lastSyncAt) : "Never synced"} />
          <InfoRow label="Local Memo Drafts" value={desktopInfo?.localMemoCount ?? "N/A"} />
          <InfoRow label="Pending Queue Items" value={desktopInfo?.pendingQueueCount ?? "N/A"} />

          <button
            type="button"
            disabled={exporting || !isDesktopShell()}
            onClick={exportLocalDb}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-slate-900 text-white disabled:opacity-60"
          >
            {exporting ? "Exporting..." : "Export Local DB Backup"}
          </button>

          <p className="text-sm text-slate-500">
            Local DB backup uses an Electron folder picker and does not expose the source database path to the renderer.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
