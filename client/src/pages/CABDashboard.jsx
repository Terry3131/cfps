import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SearchBox from "../components/SearchBox";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import useMemos from "../hooks/useMemos";
import { formatMoney, safeNumber } from "../utils/format";
import {
  getMemoReference,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "OTHERS"];

export default function CABDashboard() {
  const { memos, loading, error } = useMemos();
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showRejectedDetails, setShowRejectedDetails] = useState(false);

  const releaseRelevantMemos = useMemo(() => {
    return memos.filter((memo) => memo.approval_status === "APPROVED");
  }, [memos]);

  const dateFilteredMemos = useMemo(() => {
    return releaseRelevantMemos.filter((memo) => isWithinDateRange(getMemoDate(memo), startDate, endDate));
  }, [releaseRelevantMemos, startDate, endDate]);

  const visibleMemos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dateFilteredMemos;
    return dateFilteredMemos.filter((memo) => getSearchText(memo).includes(term));
  }, [dateFilteredMemos, search]);

  const rejectedMemos = useMemo(() => {
    return visibleMemos.filter(isRejectedMemo);
  }, [visibleMemos]);

  const summary = useMemo(() => ({
    totalMemoCount: visibleMemos.length,
    totalRequested: formatExposure(collectCurrencyTotals(visibleMemos, "amount")),
    totalReleased: formatExposure(collectCurrencyTotals(visibleMemos, "total_released_amount")),
    totalPending: formatExposure(collectPendingCurrencyTotals(visibleMemos)),
    rejectedCount: rejectedMemos.length,
  }), [visibleMemos, rejectedMemos]);

  const pendingReleaseMemos = useMemo(() => {
    return visibleMemos.filter((memo) => getReleaseStatus(memo) === "AWAITING_FUND_RELEASE");
  }, [visibleMemos]);

  const releasedMemos = useMemo(() => {
    return visibleMemos.filter((memo) =>
      ["PARTIALLY_FUNDED", "WAITING_PAYMENT", "PAID"].includes(getReleaseStatus(memo))
    );
  }, [visibleMemos]);

  if (loading) {
    return <LoadingBox message="Loading CAB finance dashboard..." />;
  }

  if (error) {
    return <ErrorBox message={error} />;
  }

  return (
    <div className="space-y-5">
      <BackButton fallback="/memos" />
      <PageHeader
        title="CAB Dashboard"
        subtitle="Finance summary, release status search, and rejected memo review."
      />

      <SectionCard
        title="Finance Summary"
        subtitle="No currency conversion is applied; totals are grouped by stored currency."
      >
        <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_12rem]">
          <SearchBox
            value={search}
            onChange={setSearch}
            className="md:w-full"
            placeholder="Search reference, heading, beneficiary, branch, status, currency, amount, state, location, or zone..."
          />

          <Field label="Start Date">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            />
          </Field>

          <Field label="End Date">
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <FinanceCard label="Total Memo Count" value={summary.totalMemoCount} />
          <FinanceCard label="Total Funds Requested" value={summary.totalRequested} />
          <FinanceCard label="Total Funds Released" value={summary.totalReleased} />
          <FinanceCard label="Total Funds Pending" value={summary.totalPending} />
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Rejected Memos
            </p>
            <p className="mt-2 min-w-0 overflow-hidden break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              {summary.rejectedCount}
            </p>
            <button
              type="button"
              onClick={() => setShowRejectedDetails((value) => !value)}
              className="mt-3 text-xs font-semibold text-blue-700 hover:text-blue-900"
            >
              View Details
            </button>
          </div>
        </div>

        {showRejectedDetails && <RejectedMemoList memos={rejectedMemos} />}
      </SectionCard>

      <SectionCard title="Memo Release Search" subtitle="Filtered CAB memo and release status view.">
        {visibleMemos.length === 0 ? (
          <EmptyState
            title="No matching memos."
            message="Adjust search or date range."
            className="shadow-none"
          />
        ) : (
          <div className="space-y-6">
            <ReleaseTable
              title="Approved Pending Release"
              memos={pendingReleaseMemos}
              empty="No approved memos are pending release in this view."
            />
            <ReleaseTable
              title="Released / Scheduled"
              memos={releasedMemos}
              empty="No released or scheduled memos in this view."
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function FinanceCard({ label, value }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 min-w-0 overflow-hidden break-words text-xl font-black leading-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function RejectedMemoList({ memos }) {
  if (!memos.length) {
    return <p className="mt-4 text-sm text-slate-500">No rejected memos in view.</p>;
  }

  return (
    <div className="mt-5 space-y-3">
      {memos.map((memo) => (
        <div key={memo.id} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
          <p className="font-bold text-red-900">
            {getMemoReference(memo)} - {getMemoTitle(memo)}
          </p>
          <p className="mt-1 text-red-800">
            {memo.business_status || memo.latest_release_decision || "Rejected"}
          </p>
        </div>
      ))}
    </div>
  );
}

function ReleaseTable({ title, memos, empty }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <span className="text-xs font-semibold text-slate-500">
          {memos.length} memo{memos.length === 1 ? "" : "s"}
        </span>
      </div>

      {memos.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          {empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-left">Heading</th>
                <th className="p-3 text-left">Beneficiary</th>
                <th className="p-3 text-left">Release Status</th>
                <th className="p-3 text-left">Requested</th>
                <th className="p-3 text-left">Released</th>
                <th className="p-3 text-left">Pending</th>
                <th className="p-3 text-left">Workflow</th>
              </tr>
            </thead>
            <tbody>
              {memos.slice(0, 75).map((memo) => (
                <tr key={memo.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{getMemoReference(memo)}</td>
                  <td className="p-3 text-slate-700">{getMemoTitle(memo)}</td>
                  <td className="p-3 text-slate-700">{memo.beneficiary_name || "N/A"}</td>
                  <td className="p-3">
                    <StatusBadge status={getReleaseStatus(memo)} />
                  </td>
                  <td className="p-3 text-slate-700">{formatMoney(memo.amount, memo.currency)}</td>
                  <td className="p-3 text-slate-700">{formatMoney(memo.total_released_amount, memo.currency)}</td>
                  <td className="p-3 text-slate-700">{formatMoney(getPendingAmount(memo), memo.currency)}</td>
                  <td className="p-3 text-slate-700">{getMemoWorkflowType(memo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function normalizeCurrency(value) {
  const currency = String(value || "NGN").toUpperCase();
  return ["NGN", "USD", "EUR", "GBP"].includes(currency) ? currency : "OTHERS";
}

function collectCurrencyTotals(items, field) {
  return items.reduce((totals, memo) => {
    const currency = normalizeCurrency(memo.currency);
    return {
      ...totals,
      [currency]: (totals[currency] || 0) + safeNumber(memo[field]),
    };
  }, {});
}

function collectPendingCurrencyTotals(items) {
  return items.reduce((totals, memo) => {
    const currency = normalizeCurrency(memo.currency);
    return {
      ...totals,
      [currency]: (totals[currency] || 0) + getPendingAmount(memo),
    };
  }, {});
}

function formatExposure(totalsByCurrency = {}) {
  const parts = CURRENCIES.map((currency) => ({
    currency,
    total: safeNumber(totalsByCurrency[currency]),
  }))
    .filter((item) => item.total > 0)
    .map((item) => formatMoney(item.total, item.currency));

  return parts.length ? parts.join(" | ") : "No recorded amount";
}

function getPendingAmount(memo) {
  if (memo.remaining_balance !== undefined) return safeNumber(memo.remaining_balance);
  return Math.max(0, safeNumber(memo.amount) - safeNumber(memo.total_released_amount));
}

function getReleaseStatus(memo) {
  const status = String(memo.fund_release_status || "").toUpperCase();
  const decision = String(memo.latest_release_decision || "").toUpperCase();
  const business = String(memo.business_status || "").toUpperCase();

  if (status) return status;
  if (decision === "REJECTED" || business.includes("REJECTED")) return "REJECTED";
  if (getPendingAmount(memo) <= 0 && safeNumber(memo.amount) > 0) return "PAID";
  if (safeNumber(memo.total_released_amount) > 0) return "PARTIALLY_FUNDED";
  return "AWAITING_FUND_RELEASE";
}

function isRejectedMemo(memo) {
  const status = getReleaseStatus(memo);
  return status === "REJECTED";
}

function getSearchText(memo) {
  return [
    memo.reference_no,
    memo.heading,
    memo.title,
    memo.beneficiary_name,
    memo.branch_dru,
    memo.category,
    memo.lifecycle_stage,
    memo.business_status,
    memo.approval_status,
    getReleaseStatus(memo),
    memo.currency,
    memo.amount,
    memo.state,
    memo.location,
    memo.geopolitical_zone,
    getMemoWorkflowType(memo),
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();
}

function getMemoDate(memo) {
  return memo?.created_at || memo?.updated_at || "";
}

function isWithinDateRange(dateValue, startDate, endDate) {
  if (!dateValue) return true;

  const value = Date.parse(dateValue);
  const start = startDate ? Date.parse(`${startDate}T00:00:00Z`) : null;
  const end = endDate ? Date.parse(`${endDate}T23:59:59Z`) : null;

  if (Number.isNaN(value)) return true;
  if (start !== null && value < start) return false;
  if (end !== null && value > end) return false;

  return true;
}
