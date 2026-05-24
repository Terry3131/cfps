import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import useMemos from "../hooks/useMemos";
import { getUser } from "../auth/authStore";
import {
  canValidateMemo,
  canUserValidateMemo,
  getValidationReadinessMessage,
  getMemoProgress,
  getMemoWorkflowType,
  getMemoLifecycleStage,
} from "../utils/memoFields";
import { getOrganizationLabelFromMemo } from "../utils/organizationalUnits";

export default function ValidationDesk() {
  const { memos, loading, error } = useMemos();
  const user = getUser();
  const validationItems = memos.filter((memo) => {
    if (getMemoWorkflowType(memo) !== "HEAVY_WORKFLOW") return false;
    if (memo.is_completed || memo.is_locked) return false;
    if (getMemoLifecycleStage(memo) !== "AWAITING_VALIDATION") return false;
    if (Number(getMemoProgress(memo) || 0) < 100) return false;

    return canUserValidateMemo(user, memo);
  });
  const readyCount = validationItems.filter(canValidateMemo).length;
  const waitingCount = validationItems.length - readyCount;

  return (
    <div className="space-y-5">
      <BackButton fallback="/memos" />
      <PageHeader
        title="Validation Desk"
        subtitle="Review and validate submitted memo progress records."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ValidationKpi label="Assigned Queue" value={validationItems.length} />
        <ValidationKpi label="Ready" value={readyCount} tone="ready" />
        <ValidationKpi label="Not Actionable" value={waitingCount} tone="waiting" />
      </div>

      <ErrorBox message={error} />

      {loading ? (
        <LoadingBox message="Loading validation items..." />
      ) : validationItems.length === 0 ? (
        <EmptyState
          title="No validation items found."
          message="Assigned heavy workflow validation items will appear here when backend records are available."
        />
      ) : (
        <div className="space-y-3">
          {validationItems.map((memo) => {
            const ready = canValidateMemo(memo);

            return (
              <div
                key={memo.id}
                className={`overflow-hidden rounded-3xl border bg-white p-4 shadow-sm shadow-slate-900/5 transition hover:shadow-md md:p-5 ${
                  ready ? "border-emerald-200" : "border-slate-200/80"
                }`}
              >
                <div className={`-mx-4 -mt-4 mb-4 h-1 md:-mx-5 md:-mt-5 ${ready ? "bg-emerald-500" : "bg-amber-400"}`} />
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                        ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}>
                      {ready ? "Ready for validation" : "Not Ready"}
                      </span>
                      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                        {memo.reference_no || "No reference"}
                      </span>
                    </div>

                    <p className="mt-2 break-words text-lg font-black tracking-tight text-slate-950">
                      {memo.heading || memo.title || memo.reference_no || "Untitled memo"}
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {ready ? "Ready for validation" : getValidationReadinessMessage(memo)}
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wide text-slate-500">Assigned Monitor</p>
                        <p className="mt-1 font-bold text-slate-900">{getOrganizationLabelFromMemo(memo, "primary_monitor_branch", "primary_monitor_branch_name", [])}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="font-black uppercase tracking-wide text-slate-500">Monitor Progress</p>
                        <p className="mt-1 font-bold text-slate-900">{getMemoProgress(memo)}% | {memo.lifecycle_stage || "N/A"}</p>
                      </div>
                    </div>

                  </div>

                  <ActionButton
                    to={`/memos/${memo.id}/validate`}
                    disabled={!ready}
                    variant={ready ? "primary" : "ghost"}
                    className="md:min-w-32"
                  >
                    {ready ? "Validate / Reject" : "Not Ready"}
                  </ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ValidationKpi({ label, value, tone = "slate" }) {
  const toneClass = {
    slate: "from-slate-50 to-white text-slate-950",
    ready: "from-emerald-50 to-white text-emerald-950",
    waiting: "from-amber-50 to-white text-amber-950",
  }[tone];

  return (
    <div className={`rounded-3xl border border-slate-200/70 bg-gradient-to-br ${toneClass} p-4 shadow-sm`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}
