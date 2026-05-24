import { useEffect, useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import PageHeader from "../components/PageHeader";
import OrganizationalUnitSelect from "../components/OrganizationalUnitSelect";
import SectionCard from "../components/SectionCard";
import SelectField from "../components/SelectField";
import StatusBadge from "../components/StatusBadge";
import TextAreaField from "../components/TextAreaField";
import { DESKTOP_SYNC_REFRESH_EVENT } from "../desktop/DesktopSyncStatus";
import { desktopApi, isDesktopShell } from "../desktop/desktopApi";
import { formatDateTime, formatMoney } from "../utils/format";
import { NIGERIAN_STATES, getGeopoliticalZone } from "../utils/nigeriaGeo";

const emptyMemo = {
  id: null,
  reference_no: "",
  heading: "",
  description: "",
  category: "",
  branch_dru: "",
  beneficiary_name: "",
  movement_type: "LOCAL",
  state: "",
  location: "",
  geopolitical_zone: "",
  amount: "",
  currency: "NGN",
};

export default function LocalMemoDrafts() {
  const [memos, setMemos] = useState([]);
  const [form, setForm] = useState(emptyMemo);
  const [queueSummary, setQueueSummary] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const sortedMemos = useMemo(() => memos, [memos]);

  useEffect(() => {
    if (!isDesktopShell()) return;

    let unsubscribe = () => {};

    const loadStartupState = async () => {
      await loadLocalMemos();

      const [summary, authState, settings] = await Promise.all([
        desktopApi.syncQueue.summary(),
        desktopApi.auth.state(),
        desktopApi.settings.get(),
      ]);

      setQueueSummary(summary);
      setLastSyncAt(settings.lastSyncAt || null);

      if (authState.authenticated && summary.pendingCount > 0) {
        setMessage(`${summary.pendingCount} pending memo queue item${summary.pendingCount === 1 ? "" : "s"} found after startup.`);
      }
    };

    unsubscribe = desktopApi.syncQueue.onProgress((progress) => {
      setSyncProgress(progress);
    });

    const handleExternalRefresh = () => {
      refreshQueueState().catch((err) => setError(err.message));
      loadLocalMemos();
    };

    window.addEventListener(DESKTOP_SYNC_REFRESH_EVENT, handleExternalRefresh);

    loadStartupState().catch((err) => setError(err.message));

    return () => {
      unsubscribe();
      window.removeEventListener(DESKTOP_SYNC_REFRESH_EVENT, handleExternalRefresh);
    };
  }, []);

  const loadLocalMemos = async () => {
    if (!isDesktopShell()) return;

    try {
      const nextMemos = await desktopApi.localMemos.list();
      setMemos(nextMemos);
    } catch (err) {
      setError(err.message);
    }
  };

  const refreshQueueState = async () => {
    if (!isDesktopShell()) return;

    const [summary, settings] = await Promise.all([
      desktopApi.syncQueue.summary(),
      desktopApi.settings.get(),
    ]);

    setQueueSummary(summary);
    setLastSyncAt(settings.lastSyncAt || null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "state" ? { geopolitical_zone: getGeopoliticalZone(value) } : {}),
    }));
  };

  const editMemo = (memo) => {
    setForm({
      id: memo.id,
      reference_no: memo.reference_no || "",
      heading: memo.heading || "",
      description: memo.description || "",
      category: memo.category || "",
      branch_dru: memo.branch_dru || "",
      beneficiary_name: memo.beneficiary_name || "",
      movement_type: memo.movement_type || "LOCAL",
      state: memo.state || "",
      location: memo.location || "",
      geopolitical_zone: memo.geopolitical_zone || getGeopoliticalZone(memo.state),
      amount: memo.amount ?? "",
      currency: memo.currency || "NGN",
    });
    setMessage("");
    setError("");
  };

  const resetForm = () => {
    setForm(emptyMemo);
    setMessage("");
    setError("");
  };

  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const saved = await desktopApi.localMemos.saveDraft(form);
      setMessage(`Saved local draft ${saved.syncId}.`);
      setForm(emptyMemo);
      await loadLocalMemos();
      await refreshQueueState();
      window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Failed to save local memo draft.");
    } finally {
      setLoading(false);
    }
  };

  const queueMemo = async (memo) => {
    setError("");
    setMessage("");

    try {
      const queued = await desktopApi.localMemos.queue(memo.id);
      setMessage(`Queued memo ${queued.syncId} for future sync.`);
      await loadLocalMemos();
      await refreshQueueState();
      window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Failed to queue local memo.");
    }
  };

  const syncNow = async (prefixMessage = "") => {
    setError("");
    setMessage("Sync started.");
    setSyncProgress(null);
    setSyncing(true);

    try {
      const before = await desktopApi.syncQueue.summary();
      setQueueSummary(before);

      const actionableCount = (before.pending || []).filter((item) =>
        ["PENDING", "FAILED"].includes(item.syncStatus) && !item.requiresManualRetry
      ).length;

      if (actionableCount === 0) {
        setMessage("No pending memo queue items to sync.");
        return;
      }

      const result = await desktopApi.syncQueue.process();
      await refreshQueueState();
      setMessage(prefixMessage ? `${prefixMessage} ${result.message}` : result.message);
      await loadLocalMemos();
      window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_REFRESH_EVENT));
    } catch (err) {
      setError(err.message || "Failed to process sync queue.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Local Memo Drafts"
        subtitle="Create, edit, queue, and sync local memo drafts from the desktop client."
        action={
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => syncNow()} disabled={!isDesktopShell() || syncing}>
              {syncing ? "Syncing..." : "Sync Now"}
            </ActionButton>
            <ActionButton to="/desktop/settings" variant="ghost">
              Settings
            </ActionButton>
          </div>
        }
      />

      {!isDesktopShell() && (
        <ErrorBox message="Desktop IPC is unavailable in the web browser. Local drafts require the Electron shell." />
      )}

      <ErrorBox message={error} />

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title={form.id ? "Edit Local Draft" : "Create Local Draft"}>
          <form onSubmit={saveDraft} className="space-y-4">
            <FormField
              label="Reference"
              name="reference_no"
              value={form.reference_no}
              onChange={handleChange}
            />

            <FormField
              label="Title"
              name="heading"
              value={form.heading}
              onChange={handleChange}
              required
            />

            <TextAreaField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Category"
                name="category"
                value={form.category}
                onChange={handleChange}
              />

              <OrganizationalUnitSelect
                label="Branch / DRU"
                name="branch_dru"
                value={form.branch_dru}
                onChange={handleChange}
                type="HQ_BRANCH"
              />

              <FormField
                label="Beneficiary"
                name="beneficiary_name"
                value={form.beneficiary_name}
                onChange={handleChange}
              />

              <FormField
                label="Movement / Project Type"
                name="movement_type"
                value={form.movement_type}
                onChange={handleChange}
              />

              <SelectField
                label="State"
                name="state"
                value={form.state}
                onChange={handleChange}
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </SelectField>

              <FormField
                label="Location"
                name="location"
                value={form.location}
                onChange={handleChange}
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Geopolitical Zone</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {form.geopolitical_zone || "Select a state"}
                </p>
              </div>

              <FormField
                label="Amount"
                name="amount"
                type="number"
                value={form.amount}
                onChange={handleChange}
              />

              <FormField
                label="Currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <ActionButton type="submit" disabled={loading || !isDesktopShell()}>
                {loading ? "Saving..." : "Save Draft"}
              </ActionButton>
              {form.id && (
                <ActionButton onClick={resetForm} variant="ghost">
                  New Draft
                </ActionButton>
              )}
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Sync Queue Foundation">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Sync Now processes pending local memo CREATE and UPDATE queue items only.
            </p>

            <ActionButton onClick={() => syncNow()} disabled={!isDesktopShell() || syncing}>
              {syncing ? "Syncing..." : "Process Memo Queue"}
            </ActionButton>

            {queueSummary && (
              <div className="space-y-4">
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-500">Pending Items</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {queueSummary.pendingCount}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-slate-500">Last Sync Time</p>
                        <p className="font-semibold text-slate-900">
                          {lastSyncAt ? formatDateTime(lastSyncAt) : "Never synced"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {queueSummary.counts.map((item) => (
                    <div key={item.syncStatus} className="p-4 flex items-center justify-between">
                      <span className="text-sm text-slate-600">{item.syncStatus}</span>
                      <span className="font-semibold text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>

                {syncProgress?.currentItem && (
                  <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700 font-semibold">
                      Syncing item {syncProgress.currentIndex} of {syncProgress.total}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Queue #{syncProgress.currentItem.id} - {syncProgress.currentItem.operationType}
                    </p>
                  </div>
                )}

                {syncProgress?.phase === "complete" && (
                  <div className="border border-slate-100 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Success</p>
                      <p className="font-bold text-green-700">{syncProgress.counts?.succeeded || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Failed</p>
                      <p className="font-bold text-red-700">{syncProgress.counts?.failed || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Conflict</p>
                      <p className="font-bold text-orange-700">{syncProgress.counts?.conflicted || 0}</p>
                    </div>
                  </div>
                )}

                {queueSummary.pending?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="text-left p-2">Queue ID</th>
                          <th className="text-left p-2">Operation</th>
                          <th className="text-left p-2">Status</th>
                          <th className="text-left p-2">Retries</th>
                          <th className="text-left p-2">Manual Retry</th>
                          <th className="text-left p-2">Last Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueSummary.pending.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="p-2">{item.id}</td>
                            <td className="p-2">{item.operationType}</td>
                            <td className="p-2">
                              <StatusBadge status={item.syncStatus} />
                            </td>
                            <td className="p-2">{item.retryCount}</td>
                            <td className="p-2">{item.requiresManualRetry ? "Required" : "No"}</td>
                            <td className="p-2 text-slate-500">
                              {item.lastError || "None"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Local Memo List">
        {sortedMemos.length === 0 ? (
          <EmptyState
            title="No local drafts yet."
            message="Create a local memo draft to prepare it for a future sync."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left p-3">Memo</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Version</th>
                  <th className="text-left p-3">Amount</th>
                  <th className="text-left p-3">Modified</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {sortedMemos.map((memo) => (
                  <tr key={memo.id} className="border-t">
                    <td className="p-3">
                      <p className="font-semibold text-slate-900">{memo.heading}</p>
                      <p className="text-xs text-slate-500">{memo.syncId}</p>
                      {memo.isLocked && (
                        <div className="mt-2 inline-flex rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                          Locked / Archived
                        </div>
                      )}
                      {memo.serverId && ["PENDING_SYNC", "FAILED"].includes(memo.syncStatus) && (
                        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Update sync is best-effort only. Concurrent edits on multiple devices may overwrite changes.
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={memo.syncStatus} />
                    </td>
                    <td className="p-3">{memo.version}</td>
                    <td className="p-3">{formatMoney(memo.amount, memo.currency)}</td>
                    <td className="p-3">{formatDateTime(memo.lastModifiedAt)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          onClick={() => editMemo(memo)}
                          variant="ghost"
                          disabled={memo.isLocked}
                        >
                          Edit
                        </ActionButton>
                        <ActionButton
                          onClick={() => queueMemo(memo)}
                          disabled={
                            memo.isLocked ||
                            ["PENDING_SYNC", "SYNCING", "SYNCED", "CONFLICT"].includes(memo.syncStatus)
                          }
                          variant="blue"
                        >
                          {memo.syncStatus === "FAILED" ? "Retry Sync" : "Queue"}
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
