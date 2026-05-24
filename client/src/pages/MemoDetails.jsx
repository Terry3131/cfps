import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ConfirmButton from "../components/ConfirmButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import ProgressBar from "../components/ProgressBar";
import ProgressCircle from "../components/ProgressCircle";
import RoleGuard from "../components/RoleGuard";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import API from "../api/api";
import { getUser } from "../auth/authStore";
import { canAccessPath, getDefaultRoute } from "../auth/roleAccess";
import { formatDate, formatMoney } from "../utils/format";
import {
  getMemoAmount,
  getMemoProgress,
  getMemoReference,
  getMemoStatus,
  getMemoTitle,
  canShowApprove,
  canShowAssign,
  canShowCommence,
  canShowProgress,
  canShowValidate,
  canShowArchive,
  isHeavyWorkflow,
  getMemoWorkflowType,
  isMonitorSubmitted100,
  canUserValidateMemo,
  getValidationReadinessMessage,
} from "../utils/memoFields";
import { getOrganizationLabelFromMemo } from "../utils/organizationalUnits";
import useMemoDetails from "../hooks/useMemoDetails";
import useOrganizationalUnits from "../hooks/useOrganizationalUnits";

export default function MemoDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const [archiving, setArchiving] = useState(false);
  const {
    memo,
    loading,
    error,
    setError,
  } = useMemoDetails(id);
  const { units: organizationalUnits } = useOrganizationalUnits("");

  const archiveMemo = async () => {
    try {
      setArchiving(true);
      setError("");

      await API.post(`/memos/${id}/archive`);
      navigate("/memos");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to archive memo.");
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return <LoadingBox message="Loading memo details..." />;
  }

  if (error && !memo) {
    return <ErrorBox message={error} />;
  }

  if (!memo) {
    return (
      <EmptyState
        title="Memo not found."
        message="The selected memo could not be found."
      />
    );
  }

  const workflowType = getMemoWorkflowType(memo);
  const heavyWorkflow = isHeavyWorkflow(memo);
  const backFallback = getMemoBackFallback(user?.role, location.state?.from);
  const successMessage = location.state?.message;

  return (
    <div className="space-y-5">
      <BackButton fallbackPath={backFallback} fromPath={location.state?.from} />
      <SectionCard bodyClassName="p-5 sm:p-6" className="overflow-visible">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Operational Summary
            </p>
            <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950">
              {getMemoTitle(memo)}
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {getMemoReference(memo)}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={getMemoStatus(memo)} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                {workflowType === "HEAVY_WORKFLOW" ? "Heavy Workflow" : "Light Workflow"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canShowApprove(memo) && (
              <RoleGuard roles={["SUPER_ADMIN", "REGISTRY"]}>
                <ActionButton to={`/memos/${memo.id}/approve`} variant="success">
                  Approve
                </ActionButton>
              </RoleGuard>
            )}

            {canShowAssign(memo) && (
              <RoleGuard roles={["SUPER_ADMIN", "REGISTRY"]}>
                <ActionButton to={`/memos/${memo.id}/assign`} variant="blue">
                  Assign
                </ActionButton>
              </RoleGuard>
            )}

            {canShowCommence(memo) && (
              <RoleGuard roles={["SUPER_ADMIN", "MONITOR"]}>
                <ActionButton to={`/memos/${memo.id}/commence`} variant="emerald">
                  Commence
                </ActionButton>
              </RoleGuard>
            )}

            {canShowProgress(memo) && (
              <RoleGuard roles={["SUPER_ADMIN", "MONITOR"]}>
                <ActionButton to={`/memos/${memo.id}/progress`} variant="purple">
                  Progress
                </ActionButton>
              </RoleGuard>
            )}

            {heavyWorkflow && canShowValidate(memo) && canUserValidateMemo(user, memo) && (
              <RoleGuard roles={["SUPER_ADMIN", "VALIDATOR"]}>
                <ActionButton to={`/memos/${memo.id}/validate`} variant="orange">
                  Validate
                </ActionButton>
              </RoleGuard>
            )}

            <RoleGuard roles={["SUPER_ADMIN", "CAS", "REGISTRY", "MONITOR", "VALIDATOR"]}>
              <ActionButton to={`/memos/${memo.id}/attachments`} variant="slate">
                Attachments
              </ActionButton>
            </RoleGuard>

            {canShowArchive(memo) && (
              <RoleGuard roles={["SUPER_ADMIN", "REGISTRY"]}>
                <ConfirmButton
                  message="Archive this completed memo?"
                  onConfirm={archiveMemo}
                  disabled={archiving}
                  className="text-sm bg-zinc-800 text-white px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {archiving ? "Archiving..." : "Archive"}
                </ConfirmButton>
              </RoleGuard>
            )}

            <ActionButton to={backFallback} variant="ghost">
              Back
            </ActionButton>
          </div>
        </div>

        {successMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {successMessage}
          </div>
        )}

        <ErrorBox message={error} className="mt-5" />

        {heavyWorkflow && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3 text-sm font-semibold text-slate-700">
            {isMonitorSubmitted100(memo)
              ? "Submitted for validation"
              : getValidationReadinessMessage(memo)}
          </div>
        )}
      </SectionCard>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          title="Financial Intelligence"
          subtitle="Approved memo value and currency posture."
          className="xl:col-span-1"
        >
          <div className="rounded-3xl border border-[#071f3f]/10 bg-gradient-to-br from-[#071f3f] to-[#0b3a68] p-5 text-white shadow-lg shadow-blue-950/15">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-100">Approved Amount</p>
            <p className="mt-3 break-words text-3xl font-black tracking-tight xl:text-4xl">
              {formatMoney(getMemoAmount(memo), memo.currency)}
            </p>
            <p className="mt-3 text-sm font-semibold text-sky-100">
              Currency: {memo.currency || "N/A"}
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            <MemoMetric label="Category" value={memo.category || "N/A"} />
            <MemoMetric label="Workflow Type" value={workflowType === "HEAVY_WORKFLOW" ? "Heavy Workflow" : "Light Workflow"} />
          </div>
        </SectionCard>

        <SectionCard
          title="Assignment Chain"
          subtitle="Owning branch, monitor unit, and validation line."
          className="xl:col-span-2"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MemoMetric
              label="Branch / DRU"
              value={getOrganizationLabelFromMemo(memo, "branch_dru", "branch_dru_name", organizationalUnits)}
            />
            <MemoMetric
              label="Beneficiary"
              value={memo.beneficiary_name || memo.beneficiary || memo.contractor_name || "N/A"}
            />
            <MemoMetric
              label="Primary Monitor"
              value={getOrganizationLabelFromMemo(memo, "primary_monitor_branch", "primary_monitor_branch_name", organizationalUnits)}
            />
            <MemoMetric
              label="Validator Branch"
              value={getOrganizationLabelFromMemo(memo, "validator_branch", "validator_branch_name", organizationalUnits)}
            />
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Timeline" subtitle="Record creation and latest update metadata.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MemoMetric label="Created At" value={formatDate(memo.created_at || memo.createdAt)} />
          <MemoMetric label="Updated At" value={formatDate(memo.updated_at || memo.updatedAt)} />
        </div>
      </SectionCard>

      {heavyWorkflow ? (
        <SectionCard
          title="Workflow Status"
          subtitle="Monitor progress and validation readiness."
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
            <ProgressCircle value={getMemoProgress(memo)} />
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-500">Current Progress</p>
                  <p className="mt-1 text-3xl font-black text-slate-950">{getMemoProgress(memo)}%</p>
                </div>
                <StatusBadge status={memo.lifecycle_stage || getMemoStatus(memo)} />
              </div>
              <ProgressBar value={getMemoProgress(memo)} />
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Simplified Workflow"
          subtitle="This memo uses a light workflow."
        >
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Heavy operational workflow panels are intentionally hidden for this category.
            </p>

            <p>
              Monitoring, progress escalation, validation routing, and roadmap tracking are not required.
            </p>

            <p>
              Fund release completion may automatically complete the workflow depending on backend release doctrine.
            </p>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Operational Note" subtitle="Memo description and contextual remarks.">
        <p className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700">
          {memo.description || "N/A"}
        </p>
      </SectionCard>
    </div>
  );
}

function MemoMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value ?? "N/A"}</p>
    </div>
  );
}

function getMemoBackFallback(role, requestedPath) {
  const normalizedRequestedPath = normalizeStatePath(requestedPath);

  if (normalizedRequestedPath && canAccessPath(role, normalizedRequestedPath)) {
    return normalizedRequestedPath;
  }

  if (role === "CAS") return "/cas/financial-approvals";
  if (role === "SUPER_ADMIN") return "/cas/financial-approvals";
  if (role === "AA_CAS") return "/aa-cas/dashboard";
  if (role === "PASO_CAS") return "/paso-cas/dashboard";
  if (role === "MONITOR") return "/monitor/dashboard";
  if (role === "VALIDATOR") return "/validation";
  if (role === "VIEWER") return "/notifications";

  return getDefaultRoute(role);
}

function normalizeStatePath(value) {
  if (!value) return "";
  if (typeof value === "string") return value;

  const pathname = value.pathname || "";
  const search = value.search || "";
  const hash = value.hash || "";

  return pathname ? `${pathname}${search}${hash}` : "";
}
