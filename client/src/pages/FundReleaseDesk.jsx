import { useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SearchBox from "../components/SearchBox";
import SelectField from "../components/SelectField";
import StatusBadge from "../components/StatusBadge";
import useMemos from "../hooks/useMemos";
import { formatDate, formatMoney, safeNumber } from "../utils/format";
import {
  getMemoReference,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";

const STATUS_FILTERS = [
  { value: "ALL", label: "All release statuses" },
  { value: "AWAITING_FUND_RELEASE", label: "Approved / awaiting fund release" },
  { value: "PARTIALLY_FUNDED", label: "Partially funded" },
  { value: "WAITING_PAYMENT", label: "Waiting payment" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Fully funded / Paid" },
];

const STATUS_ORDER = {
  AWAITING_FUND_RELEASE: 1,
  PARTIALLY_FUNDED: 2,
  WAITING_PAYMENT: 3,
  REJECTED: 4,
  PAID: 5,
  NOT_READY: 6,
};

export default function FundReleaseDesk() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const query = useMemo(() => ({
    approval_status: "APPROVED",
    fund_release_status: statusFilter === "ALL" ? "" : statusFilter,
    search,
    page,
    limit: 25,
  }), [page, search, statusFilter]);
  const { memos, pagination, loading, error } = useMemos(query);

  const releaseMemos = memos
    .map((memo) => ({
      ...memo,
      releaseStatus: getReleaseStatus(memo),
    }))
    .filter((memo) => {
      const matchesStatus =
        statusFilter === "ALL" || memo.releaseStatus === statusFilter;
      const matchesSearch = !search.trim() || getSearchText(memo).includes(search.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const statusDiff =
        (STATUS_ORDER[a.releaseStatus] || 99) - (STATUS_ORDER[b.releaseStatus] || 99);
      if (statusDiff !== 0) return statusDiff;
      return String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""));
    });

  return (
    <div className="space-y-5">
      <BackButton fallback="/memos" />
      <PageHeader
        title="Fund Release Desk"
        subtitle="Search, review, and process fund release status across approved memos."
      />

      <ErrorBox message={error} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <SearchBox
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            className="md:w-full"
            placeholder="Search reference, heading, beneficiary, branch, category, workflow, status, currency, amount, state, location, or zone..."
          />

          <SelectField
            name="release_status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            label="Release Status"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      {loading ? (
        <LoadingBox message="Loading memos for fund release..." />
      ) : releaseMemos.length === 0 ? (
        <EmptyState
          title="No memos match this release view."
          message="Adjust search or release status filter."
        />
      ) : (
        <div className="space-y-4">
          {releaseMemos.map((memo) => {
            const readOnly = isReleaseReadOnly(memo);
            const remainingBalance = safeNumber(memo.remaining_balance);

            return (
              <div
                key={memo.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      {getMemoReference(memo)}
                    </p>
                    <h2 className="mt-1 break-words text-lg font-bold text-slate-900">
                      {getMemoTitle(memo)}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ReleaseStatusBadge status={memo.releaseStatus} />
                      <StatusBadge status={memo.business_status || memo.lifecycle_stage} />
                    </div>
                  </div>

                  <ActionButton
                    to={`/fund-release/${memo.id}`}
                    disabled={readOnly}
                    variant={readOnly ? "ghost" : "primary"}
                  >
                    {readOnly ? getReleaseLabel(memo.releaseStatus) : "Release Fund"}
                  </ActionButton>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Metric label="Requested" value={formatMoney(memo.amount, memo.currency)} />
                  <Metric label="Released" value={formatMoney(memo.total_released_amount, memo.currency)} />
                  <Metric label="Balance" value={formatMoney(remainingBalance, memo.currency)} />
                  <Metric
                    label="Next Payment"
                    value={
                      memo.next_payment_date
                        ? `${formatDate(memo.next_payment_date)} (${getCountdownText(memo.next_payment_date)})`
                        : "N/A"
                    }
                  />
                </div>
              </div>
            );
          })}
          <PaginationControls pagination={pagination} page={page} setPage={setPage} />
        </div>
      )}
    </div>
  );
}

function PaginationControls({ pagination, page, setPage }) {
  if (!pagination) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-600">Page {pagination.page} of {pagination.pageCount}</p>
      <div className="flex gap-2">
        <ActionButton type="button" variant="ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          Previous
        </ActionButton>
        <ActionButton type="button" variant="ghost" disabled={page >= pagination.pageCount} onClick={() => setPage((current) => Math.min(pagination.pageCount, current + 1))}>
          Next
        </ActionButton>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 min-w-0 overflow-hidden break-words text-sm font-semibold leading-tight text-slate-900">{value}</p>
    </div>
  );
}

function ReleaseStatusBadge({ status }) {
  const label = getReleaseLabel(status);
  const className =
    status === "PAID"
      ? "bg-emerald-100 text-emerald-800"
      : status === "REJECTED"
        ? "bg-red-100 text-red-800"
        : status === "PARTIALLY_FUNDED" || status === "WAITING_PAYMENT"
          ? "bg-amber-100 text-amber-800"
          : "bg-blue-100 text-blue-800";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function getReleaseStatus(memo) {
  const status = String(memo.fund_release_status || "").toUpperCase();
  const business = String(memo.business_status || "").toUpperCase();
  const latestDecision = String(memo.latest_release_decision || "").toUpperCase();
  const remainingBalance = safeNumber(memo.remaining_balance);
  const totalReleased = safeNumber(memo.total_released_amount);
  const amount = safeNumber(memo.amount);

  if (status) return status;
  if (latestDecision === "REJECTED" || business.includes("REJECTED")) return "REJECTED";
  if (remainingBalance <= 0 && amount > 0) return "PAID";
  if (
    totalReleased > 0 ||
    latestDecision === "PARTIAL" ||
    business === "PARTIALLY FUNDED" ||
    business === "PARTIALLY_FUNDED"
  ) {
    return "PARTIALLY_FUNDED";
  }
  if (memo.next_payment_date) return "WAITING_PAYMENT";
  return "AWAITING_FUND_RELEASE";
}

function getReleaseLabel(status) {
  return {
    AWAITING_FUND_RELEASE: "Awaiting Fund Release",
    PARTIALLY_FUNDED: "Partially Funded",
    WAITING_PAYMENT: "Waiting Payment",
    PAID: "Paid",
    REJECTED: "Rejected",
    NOT_READY: "Not Ready",
  }[status] || status || "Not Ready";
}

function isReleaseReadOnly(memo) {
  const amount = safeNumber(memo.amount);
  const released = safeNumber(memo.total_released_amount);
  const remaining = safeNumber(memo.remaining_balance, Math.max(amount - released, 0));
  const fullyReleased = amount > 0 && (released >= amount || remaining <= 0);

  return fullyReleased || ["PAID", "REJECTED", "NOT_READY"].includes(memo.releaseStatus);
}

function getSearchText(memo) {
  return [
    memo.reference_no,
    memo.heading,
    memo.title,
    memo.description,
    memo.beneficiary_name,
    memo.branch_dru,
    memo.category,
    getMemoWorkflowType(memo),
    memo.lifecycle_stage,
    memo.business_status,
    memo.approval_status,
    memo.currency,
    memo.amount,
    memo.state,
    memo.location,
    memo.geopolitical_zone,
    memo.releaseStatus,
    getReleaseLabel(memo.releaseStatus),
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();
}

function getCountdownText(dateValue) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return "N/A";

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  if (diffDays === 0) return "due today";
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
}
