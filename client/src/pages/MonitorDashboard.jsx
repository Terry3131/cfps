import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import ProgressBar from "../components/ProgressBar";
import StatusBadge from "../components/StatusBadge";
import useMemos from "../hooks/useMemos";
import { getUser } from "../auth/authStore";
import { formatDate } from "../utils/format";
import {
  getMemoProgress,
  getMemoReference,
  getMemoTitle,
  getMemoWorkflowType,
  canValidateMemo,
} from "../utils/memoFields";
import { getOrganizationLabelFromMemo } from "../utils/organizationalUnits";

export default function MonitorDashboard() {
  const { memos, loading, error } = useMemos();
  const user = getUser();

  const assignedProjects = memos.filter((memo) => {
    if (getMemoWorkflowType(memo) !== "HEAVY_WORKFLOW") return false;
    if (memo.is_completed || memo.is_locked) return false;

    const lifecycle = String(memo.lifecycle_stage || "").toUpperCase();
    const activeStage = [
      "ASSIGNED",
      "COMMENCED",
      "IN_PROGRESS",
      "VALIDATION_REJECTED",
      "AWAITING_VALIDATION",
      "FUNDS_RELEASED",
    ].includes(lifecycle);

    if (!activeStage) return false;
    const assignedUser = memo.assigned_to_user_id && user?.id && String(memo.assigned_to_user_id) === String(user.id);
    const assignedBranch = memo.primary_monitor_branch && user?.branch_dru && normalizeCode(memo.primary_monitor_branch) === normalizeCode(user.branch_dru);

    if (assignedUser || assignedBranch) return true;

    return user?.role === "SUPER_ADMIN" && Boolean(memo.primary_monitor_branch);
  });
  const awaitingReleaseProjects = assignedProjects.filter((memo) => !hasReleasedFunds(memo));
  const releasedProjects = assignedProjects.filter((memo) => hasReleasedFunds(memo));
  const awaitingActionCount = releasedProjects.filter((memo) => !canValidateMemo(memo)).length;
  const monitorKpis = [
    { label: "Assigned", value: assignedProjects.length, tone: "slate" },
    { label: "In Progress", value: releasedProjects.filter((memo) => String(memo.lifecycle_stage || "").toUpperCase() === "IN_PROGRESS").length, tone: "blue" },
    { label: "Awaiting Validation", value: assignedProjects.filter(canValidateMemo).length, tone: "purple" },
    { label: "Completed", value: memos.filter((memo) => getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" && memo.is_completed).length, tone: "green" },
  ];

  if (loading) {
    return <LoadingBox message="Loading assigned monitor projects..." />;
  }

  if (error) {
    return <ErrorBox message={error} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monitor Dashboard"
        subtitle="Assigned heavy workflow projects, progress status, and reporting cycle."
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {monitorKpis.map((item) => (
          <MonitorKpi key={item.label} {...item} />
        ))}
      </div>

      {awaitingActionCount > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 text-sm text-amber-900 shadow-sm">
          <p className="font-black">Monitor action required</p>
          <p className="mt-1">
            {awaitingActionCount} released heavy memo{awaitingActionCount === 1 ? "" : "s"} need follow-up or progress reporting.
          </p>
        </div>
      )}

      {assignedProjects.length === 0 ? (
        <EmptyState
          title="No assigned tracked projects."
          message="Approved heavy workflow assignments will appear here after registry assignment."
        />
      ) : (
        <div className="space-y-6">
          <MonitorSection
            title="Assigned / Awaiting Fund Release"
            emptyMessage="No assigned memos are waiting for fund release."
            memos={awaitingReleaseProjects}
            released={false}
          />

          <MonitorSection
            title="Released / Follow-up Required"
            emptyMessage="No released memos need monitor follow-up."
            memos={releasedProjects}
            released
          />
        </div>
      )}
    </div>
  );
}

function MonitorSection({ title, emptyMessage, memos, released }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Operational Queue</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
        </div>
        <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          {memos.length} memo{memos.length === 1 ? "" : "s"}
        </p>
      </div>

      {memos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-4 text-sm font-medium text-slate-500 shadow-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {memos.map((memo) => (
            <MonitorMemoCard key={memo.id} memo={memo} released={released} />
          ))}
        </div>
      )}
    </section>
  );
}

function MonitorMemoCard({ memo, released }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:shadow-md">
      <div className={`-mx-5 -mt-5 mb-5 h-1 ${released ? "bg-gradient-to-r from-sky-700 to-emerald-500" : "bg-gradient-to-r from-amber-500 to-slate-300"}`} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {getMemoReference(memo)}
          </p>
          <h2 className="mt-1 break-words text-lg font-black tracking-tight text-slate-950">
            {getMemoTitle(memo)}
          </h2>
          <div className="mt-3">
            <StatusBadge status={released ? memo.lifecycle_stage || memo.business_status : "AWAITING_FUND_RELEASE"} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton
            to={`/memos/${memo.id}/progress`}
            variant="purple"
            disabled={!released || canValidateMemo(memo)}
            title={!released ? "Progress reporting starts only after funds are released." : undefined}
          >
            {canValidateMemo(memo) ? "Submitted" : "Progress Report"}
          </ActionButton>
          <ActionButton to={`/memos/${memo.id}`} variant="ghost">
            View
          </ActionButton>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-black text-slate-800">
            Current Progress <span className="text-2xl text-slate-950">{getMemoProgress(memo)}%</span>
          </p>
          <ProgressBar value={getMemoProgress(memo)} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 text-sm text-slate-700">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">30-day cycle</p>
          <p className="mt-1 font-black text-slate-950">
            {released ? getReportCycleText(memo) : "Starts after fund release"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
        <MonitorFact label="Beneficiary" value={memo.beneficiary_name || "N/A"} />
        <MonitorFact
          label="Assigned Validator"
          value={getOrganizationLabelFromMemo(memo, "validator_branch", "validator_branch_name", [])}
        />
        <MonitorFact label="Release Status" value={memo.fund_release_status || "N/A"} />
        <MonitorFact label="Last Report" value={getLastReportText(memo)} />
      </div>

      {canValidateMemo(memo) && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          Submitted for validation
        </div>
      )}

      {!released && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          Assigned to your monitor unit. Progress reporting starts after CAB funds release.
        </div>
      )}

      {released && !canValidateMemo(memo) && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          Follow-up alert: released funds are visible. Submit progress updates until completion reaches 100%.
        </div>
      )}
    </div>
  );
}

function MonitorKpi({ label, value, tone }) {
  const toneClass = {
    slate: "from-slate-50 to-white text-slate-950",
    blue: "from-blue-50 to-white text-blue-950",
    purple: "from-violet-50 to-white text-violet-950",
    green: "from-emerald-50 to-white text-emerald-950",
  }[tone] || "from-slate-50 to-white text-slate-950";

  return (
    <div className={`rounded-3xl border border-slate-200/70 bg-gradient-to-br ${toneClass} p-4 shadow-sm`}>
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function hasReleasedFunds(memo) {
  const releaseStatus = String(memo.fund_release_status || "").toUpperCase();
  const lifecycle = String(memo.lifecycle_stage || "").toUpperCase();
  const totalReleased = Number(memo.total_released_amount || 0);

  return (
    totalReleased > 0 ||
    ["PARTIALLY_FUNDED", "WAITING_PAYMENT", "PAID"].includes(releaseStatus) ||
    ["FUNDS_RELEASED", "IN_PROGRESS", "VALIDATION_REJECTED", "AWAITING_VALIDATION"].includes(lifecycle)
  );
}

function MonitorFact({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-900">{value}</p>
    </div>
  );
}

function normalizeCode(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return normalized;
}

function getLastReportText(memo) {
  if (!memo.latest_progress_date && memo.latest_progress_percent === undefined) {
    return "No report yet";
  }

  const progress = memo.latest_progress_percent ?? getMemoProgress(memo);
  const date = memo.latest_progress_date ? formatDate(memo.latest_progress_date) : "date N/A";

  return `${progress}% on ${date}`;
}

function getReportCycleText(memo) {
  const dueDate = memo.next_report_due_date || memo.nextReportDueDate;

  if (dueDate) {
    return `${formatDate(dueDate)} - ${getCountdownText(dueDate)}`;
  }

  return "requires backend due-date field";
}

function getCountdownText(dateValue) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return "N/A";

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  if (diffDays === 0) return "due today";
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
}
