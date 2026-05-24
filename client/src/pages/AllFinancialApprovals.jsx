import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SearchBox from "../components/SearchBox";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import API from "../api/api";
import useMemos from "../hooks/useMemos";
import {
  getMemoAmount,
  getMemoLifecycleStage,
  getMemoReference,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";
import { formatDate, formatMoney, safeNumber } from "../utils/format";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Approved amount high-low" },
  { value: "amount_asc", label: "Approved amount low-high" },
  { value: "released_desc", label: "Released amount high-low" },
  { value: "balance_desc", label: "Remaining balance high-low" },
  { value: "status_az", label: "Status A-Z" },
  { value: "beneficiary_az", label: "Beneficiary A-Z" },
  { value: "workflow_type", label: "Workflow type" },
];

const COLUMN_OPTIONS = [
  ["reference", "Reference"],
  ["heading", "Heading"],
  ["beneficiary", "Beneficiary"],
  ["category", "Category"],
  ["workflow", "Workflow"],
  ["approvedAmount", "Approved Amount"],
  ["releasedAmount", "Released Amount"],
  ["remainingBalance", "Remaining Balance"],
  ["releaseStatus", "Release Status"],
  ["tracker", "Tracker"],
  ["validator", "Validator"],
  ["dateApproved", "Date Approved"],
  ["state", "State"],
  ["location", "Location"],
  ["geopoliticalZone", "Geopolitical Zone"],
];

const DEFAULT_COLUMNS = Object.fromEntries(COLUMN_OPTIONS.map(([key]) => [key, true]));

const DEFAULT_ADVANCED_FILTERS = {
  geopoliticalZone: "",
  state: "",
  start_date: "",
  end_date: "",
  sortBy: "",
};

export default function AllFinancialApprovals() {
  const location = useLocation();
  const { memos, loading, error } = useMemos();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [openMemoId, setOpenMemoId] = useState("");
  const [detailsByMemoId, setDetailsByMemoId] = useState({});
  const [detailsLoadingId, setDetailsLoadingId] = useState("");
  const [detailsErrorByMemoId, setDetailsErrorByMemoId] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_COLUMNS);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showAdvancedSort, setShowAdvancedSort] = useState(false);
  const [advancedDraft, setAdvancedDraft] = useState(DEFAULT_ADVANCED_FILTERS);
  const [advancedFilters, setAdvancedFilters] = useState(DEFAULT_ADVANCED_FILTERS);
  const memoRows = useMemo(() => normalizeMemoRows(memos), [memos]);
  const geopoliticalZoneOptions = useMemo(
    () => getUniqueFieldOptions(memoRows, "geopolitical_zone"),
    [memoRows]
  );
  const stateOptions = useMemo(
    () => getUniqueFieldOptions(memoRows, "state"),
    [memoRows]
  );

  const filteredMemos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = normalizedQuery
      ? memoRows.filter((memo) => getMemoSearchText(memo).includes(normalizedQuery))
      : memoRows;

    const advancedRows = applyAdvancedFilters(rows, advancedFilters);

    return applyAdvancedSort(sortMemos(advancedRows, sortBy), advancedFilters.sortBy);
  }, [advancedFilters, memoRows, query, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filteredMemos.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filteredMemos.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openDetails = async (memo) => {
    if (openMemoId === memo.id) {
      setOpenMemoId("");
      return;
    }

    setOpenMemoId(memo.id);

    if (detailsByMemoId[memo.id] || detailsLoadingId === memo.id) {
      return;
    }

    try {
      setDetailsLoadingId(memo.id);
      setDetailsErrorByMemoId((current) => ({ ...current, [memo.id]: "" }));

      const [memoRes, progressRes] = await Promise.all([
        API.get(`/memos/${memo.id}`),
        API.get(`/memos/${memo.id}/progress-reports`),
      ]);

      setDetailsByMemoId((current) => ({
        ...current,
        [memo.id]: {
          memo: unwrapData(memoRes),
          progressReports: Array.isArray(unwrapData(progressRes)) ? unwrapData(progressRes) : [],
        },
      }));
    } catch (err) {
      setDetailsErrorByMemoId((current) => ({
        ...current,
        [memo.id]: err?.response?.data?.message || "Failed to load memo details.",
      }));
    } finally {
      setDetailsLoadingId("");
    }
  };

  const resetSearch = (value) => {
    setQuery(value);
    setPage(1);
  };

  const updateSort = (value) => {
    setSortBy(value);
    setPage(1);
  };

  const toggleColumn = (key) => {
    setVisibleColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  const updateAdvancedDraft = (field, value) => {
    setAdvancedDraft((current) => ({ ...current, [field]: value }));
  };

  const applyAdvancedFiltersFromDraft = () => {
    setAdvancedFilters(advancedDraft);
    setPage(1);
  };

  const resetAdvancedFilters = () => {
    setAdvancedDraft(DEFAULT_ADVANCED_FILTERS);
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
    setPage(1);
  };

  const openPrintOptions = () => {
    setShowPrintOptions(true);
  };

  const printNow = () => {
    window.print();
  };

  return (
    <div className="financial-approvals-page max-w-full space-y-5 overflow-x-hidden">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          .financial-approvals-controls,
          .financial-approvals-controls *,
          .financial-approvals-no-print {
            display: none !important;
          }
          .financial-approvals-page {
            color: #000 !important;
            font-size: 10px !important;
            overflow: visible !important;
          }
          .financial-approvals-print-area,
          .financial-approvals-print-area * {
            box-shadow: none !important;
            overflow: visible !important;
          }
          .financial-approvals-print-area {
            border: 1px solid #000 !important;
          }
          .financial-approval-row {
            break-inside: avoid;
            border-bottom: 1px solid #000 !important;
            box-shadow: none !important;
          }
          .financial-approval-row [class*="rounded"] {
            border-radius: 0 !important;
          }
          .financial-approval-row .truncate {
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: normal !important;
          }
        }
      `}</style>
      <PageHeader
        title="All Financial Approvals"
        subtitle="CAS command view of approved financial memoranda, funding posture, monitoring status, and validation state."
      />

      <section className="rounded-2xl border border-[#071f3f]/15 bg-[#071f3f] p-4 text-white shadow-xl shadow-slate-900/10 sm:p-5">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-100">Financial Command Register</p>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-200">
              {filteredMemos.length} record{filteredMemos.length === 1 ? "" : "s"} visible across the current CAS memo list.
            </p>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-full xl:max-w-md">
            <Metric label="Approvals" value={memoRows.length} />
            <Metric label="Released" value={formatCompactMoney(sumBy(filteredMemos, "total_released_amount"))} />
            <Metric label="Balance" value={formatCompactMoney(sumBy(filteredMemos, "remaining_balance"))} />
            <Metric label="Page" value={`${safePage}/${pageCount}`} />
          </div>
        </div>
      </section>

      <SectionCard bodyClassName="p-4 sm:p-5" className="financial-approvals-controls rounded-2xl">
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(12rem,17rem)_auto_auto] xl:items-center">
          <SearchBox
            value={query}
            onChange={resetSearch}
            placeholder="Type to search any financial approval"
            className="md:w-full"
          />

          <label className="block min-w-0">
            <span className="sr-only">Sort approvals</span>
            <select
              value={sortBy}
              onChange={(event) => updateSort(event.target.value)}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm outline-none transition focus:border-[#071f3f] focus:ring-4 focus:ring-blue-950/10"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <ActionButton
            type="button"
            onClick={() => setShowAdvancedSort((current) => !current)}
            variant="ghost"
            className="min-h-12 whitespace-nowrap"
          >
            Advanced Sort
          </ActionButton>

          <ActionButton type="button" onClick={openPrintOptions} variant="slate" className="min-h-12 whitespace-nowrap">
            Print
          </ActionButton>
        </div>

        {showAdvancedSort && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-5">
              <label className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">Geopolitical Zone</span>
                <select
                  value={advancedDraft.geopoliticalZone}
                  onChange={(event) => updateAdvancedDraft("geopoliticalZone", event.target.value)}
                  disabled={geopoliticalZoneOptions.length === 0}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">{geopoliticalZoneOptions.length ? "All zones" : "No zone values"}</option>
                  {geopoliticalZoneOptions.map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">State</span>
                <select
                  value={advancedDraft.state}
                  onChange={(event) => updateAdvancedDraft("state", event.target.value)}
                  disabled={stateOptions.length === 0}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">{stateOptions.length ? "All states" : "No state values"}</option>
                  {stateOptions.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={advancedDraft.start_date}
                  onChange={(event) => updateAdvancedDraft("start_date", event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                />
              </label>

              <label className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">End Date</span>
                <input
                  type="date"
                  value={advancedDraft.end_date}
                  onChange={(event) => updateAdvancedDraft("end_date", event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                />
              </label>

              <label className="min-w-0">
                <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">Sort Focus</span>
                <select
                  value={advancedDraft.sortBy}
                  onChange={(event) => updateAdvancedDraft("sortBy", event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
                >
                  <option value="">Use current sort</option>
                  <option value="geopolitical_zone" disabled={geopoliticalZoneOptions.length === 0}>Geopolitical Zone A-Z</option>
                  <option value="state" disabled={stateOptions.length === 0}>State A-Z</option>
                  <option value="date_desc">Date newest</option>
                  <option value="date_asc">Date oldest</option>
                </select>
              </label>
            </div>

            {(geopoliticalZoneOptions.length === 0 || stateOptions.length === 0) && (
              <p className="mt-3 text-xs font-bold text-slate-500">
                Zone or state controls are disabled when those fields are not present in the current memo data.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton type="button" onClick={applyAdvancedFiltersFromDraft} variant="primary">
                Apply
              </ActionButton>
              <ActionButton type="button" onClick={resetAdvancedFilters} variant="ghost">
                Reset
              </ActionButton>
            </div>
          </div>
        )}

        {showPrintOptions && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Print Options</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Choose the columns to include before printing the current filtered result.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton type="button" onClick={printNow} variant="primary">
                  Print Now
                </ActionButton>
                <ActionButton type="button" onClick={() => setShowPrintOptions(false)} variant="ghost">
                  Cancel
                </ActionButton>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {COLUMN_OPTIONS.map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={() => toggleColumn(key)}
                    className="h-3.5 w-3.5 accent-[#071f3f]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <ErrorBox message={error} />

      {loading ? (
        <LoadingBox message="Loading financial approvals..." />
      ) : pageItems.length === 0 ? (
        <EmptyState
          title="No financial approvals found."
          message="Adjust search terms or sorting to inspect available memo approvals."
        />
      ) : (
        <SectionCard bodyClassName="p-0" className="financial-approvals-print-area rounded-2xl">
          <div className="divide-y divide-slate-100">
            {pageItems.map((memo) => {
              const details = detailsByMemoId[memo.id];
              const detailsError = detailsErrorByMemoId[memo.id];
              const isOpen = openMemoId === memo.id;

              return (
                <div key={memo.id} className="financial-approval-row min-w-0 bg-white">
                  <div className="grid min-w-0 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] lg:items-center lg:px-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-xs font-black uppercase tracking-wide text-slate-500">
                          {visibleColumns.reference ? getMemoReference(memo) : "Reference hidden"}
                        </span>
                        <StatusBadge status={getMemoLifecycleStage(memo)} />
                      </div>
                      {visibleColumns.heading && <p className="mt-2 truncate text-base font-black tracking-tight text-slate-950">
                        {getMemoTitle(memo)}
                      </p>}
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                        {memo.description || memo.beneficiary_name || "No description available"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
                        {visibleColumns.workflow && <span>{getMemoWorkflowType(memo).replace("_", " ")}</span>}
                        {visibleColumns.category && <span>{memo.category || "N/A"}</span>}
                        {visibleColumns.state && <span>{memo.state || "No state"}</span>}
                        {visibleColumns.location && <span>{memo.location || "No location"}</span>}
                        {visibleColumns.geopoliticalZone && <span>{memo.geopolitical_zone || "No zone"}</span>}
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                      {visibleColumns.approvedAmount && <FinanceCell label="Approved" value={formatMoney(getMemoAmount(memo), memo.currency)} />}
                      {visibleColumns.releasedAmount && <FinanceCell label="Released" value={formatMoney(memo.total_released_amount, memo.currency)} />}
                      {visibleColumns.remainingBalance && <FinanceCell label="Balance" value={formatMoney(memo.remaining_balance, memo.currency)} />}
                      {visibleColumns.releaseStatus && <FinanceCell label="Release" value={getMemoReleaseStatus(memo)} />}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                      <ActionButton
                        to={`/memos/${memo.id}`}
                        state={{ from: location.pathname }}
                        variant="ghost"
                        className="w-full whitespace-nowrap"
                      >
                        View Details
                      </ActionButton>
                      <ActionButton
                        onClick={() => openDetails(memo)}
                        variant={isOpen ? "slate" : "primary"}
                        className="w-full whitespace-nowrap"
                      >
                        {isOpen ? "Hide Status" : "Status View"}
                      </ActionButton>
                    </div>
                  </div>

                  <div className="grid gap-2 px-4 pb-4 text-xs sm:grid-cols-2 lg:grid-cols-4 lg:px-5">
                    {visibleColumns.beneficiary && <InlineStatus label="Beneficiary" value={memo.beneficiary_name || "N/A"} />}
                    {visibleColumns.dateApproved && <InlineStatus label="Approved" value={formatDate(getMemoApprovalDate(memo))} />}
                    {visibleColumns.tracker && <InlineStatus label="Tracker" value={getMemoMonitorStatus(memo)} />}
                    {visibleColumns.validator && <InlineStatus label="Validator" value={getMemoValidatorStatus(memo)} />}
                  </div>

                  {isOpen && (
                    <MemoExpandedPanel
                      memo={details?.memo || memo}
                      progressReports={details?.progressReports || []}
                      loading={detailsLoadingId === memo.id}
                      error={detailsError}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-slate-600">
              Page {safePage} of {pageCount}
            </p>
            <div className="flex gap-2">
              <ActionButton
                variant="ghost"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={safePage <= 1}
              >
                Previous
              </ActionButton>
              <ActionButton
                variant="ghost"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={safePage >= pageCount}
              >
                Next
              </ActionButton>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function MemoExpandedPanel({ memo, progressReports, loading, error }) {
  const releaseHistory = Array.isArray(memo.release_history) ? memo.release_history : [];

  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 lg:px-5">
      {loading && <LoadingBox message="Loading full memo status..." className="mb-4" />}
      <ErrorBox message={error} className="mb-4" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailCell label="Created" value={formatDate(memo.created_at)} />
        <DetailCell label="Approved" value={formatDate(getMemoApprovalDate(memo))} />
        <DetailCell label="Lifecycle" value={memo.lifecycle_stage || "N/A"} />
        <DetailCell label="Business Status" value={memo.business_status || "N/A"} />
        <DetailCell label="Funds Released" value={formatMoney(memo.total_released_amount, memo.currency)} />
        <DetailCell label="Remaining Balance" value={formatMoney(memo.remaining_balance, memo.currency)} />
        <DetailCell label="Tracker Branch" value={memo.primary_monitor_branch || "N/A"} />
        <DetailCell label="Progress" value={`${safeNumber(memo.progress_percent)}%`} />
        <DetailCell label="Validator Branch" value={memo.validator_branch || "N/A"} />
        <DetailCell label="Validator Status" value={getMemoValidatorStatus(memo)} />
        <DetailCell label="Release Status" value={getMemoReleaseStatus(memo)} />
        <DetailCell label="Beneficiary" value={memo.beneficiary_name || "N/A"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Release History</p>
          {releaseHistory.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">No release history available.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {releaseHistory.map((release) => (
                <div key={release.id || `${release.released_at}-${release.released_amount}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-black text-slate-900">{getMemoReleaseStatus(release)}</p>
                  <p className="mt-1 break-words text-xs font-semibold text-slate-600">
                    {formatMoney(release.released_amount, memo.currency)} | {formatDate(release.released_at || release.created_at)}
                  </p>
                  {release.remarks && <p className="mt-1 break-words text-xs text-slate-500">{release.remarks}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Progress Reports</p>
          {progressReports.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500">No progress reports available.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {progressReports.map((report) => (
                <div key={report.id || `${report.report_date}-${report.progress_percent}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-black text-slate-900">{safeNumber(report.progress_percent)}%</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{formatDate(report.report_date || report.created_at)}</p>
                  {report.status_note && <p className="mt-1 break-words text-xs text-slate-500">{report.status_note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Full Description</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
          {memo.description || "N/A"}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/10 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-sky-100">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function FinanceCell({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-950" title={String(value || "")}>{value}</p>
    </div>
  );
}

function InlineStatus({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <span className="font-black uppercase tracking-wide text-slate-400">{label}: </span>
      <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}

function DetailCell({ label, value }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value || "N/A"}</p>
    </div>
  );
}

function getMemoApprovalDate(memo) {
  return memo?.approved_at || memo?.approval_date || memo?.approvedAt || "";
}

function getMemoReleaseStatus(memo) {
  const releaseStatus = String(memo?.fund_release_status || "").toUpperCase();
  const decision = String(memo?.latest_release_decision || memo?.decision_type || "").toUpperCase();
  const business = String(memo?.business_status || "").toUpperCase();

  if (decision === "REJECTED" || releaseStatus === "REJECTED" || business.includes("REJECTED")) return "REJECTED";
  if (decision === "FULL" || releaseStatus === "PAID") return "FULL / PAID";
  if (decision === "PARTIAL" || releaseStatus === "PARTIALLY_FUNDED") return "PARTIAL";
  if (safeNumber(memo?.remaining_balance) <= 0 && safeNumber(memo?.total_released_amount) > 0) return "PAID";

  return releaseStatus.replaceAll("_", " ") || decision || "PENDING";
}

function getMemoMonitorStatus(memo) {
  const progress = safeNumber(memo?.progress_percent);
  const branch = memo?.primary_monitor_branch || "No tracker";

  if (progress >= 100) return `${branch} | 100% submitted`;
  if (progress > 0) return `${branch} | ${progress}%`;

  return `${branch} | pending`;
}

function getMemoValidatorStatus(memo) {
  const lifecycle = String(memo?.lifecycle_stage || "").toUpperCase();
  const branch = memo?.validator_branch || "No validator";

  if (lifecycle === "COMPLETED" || memo?.is_completed) return `${branch} | validated`;
  if (lifecycle === "AWAITING_VALIDATION") return `${branch} | awaiting validation`;
  if (String(memo?.business_status || "").toUpperCase() === "VALIDATION_REJECTED") return `${branch} | rejected`;

  return `${branch} | pending`;
}

function getMemoSearchText(memo) {
  return [
    memo?.reference_no,
    memo?.heading,
    memo?.title,
    memo?.description,
    memo?.beneficiary_name,
    memo?.branch_dru,
    memo?.category,
    getMemoWorkflowType(memo),
    memo?.lifecycle_stage,
    memo?.business_status,
    memo?.approval_status,
    memo?.fund_release_status,
    memo?.currency,
    memo?.amount,
    memo?.total_released_amount,
    memo?.remaining_balance,
    memo?.state,
    memo?.location,
    memo?.geopolitical_zone,
    memo?.primary_monitor_branch,
    memo?.validator_branch,
  ]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" ")
    .toLowerCase();
}

function applyAdvancedFilters(rows, filters) {
  const startTime = getDateBoundary(filters.start_date, "start");
  const endTime = getDateBoundary(filters.end_date, "end");

  return normalizeMemoRows(rows).filter((memo) => {
    if (filters.geopoliticalZone && memo.geopolitical_zone !== filters.geopoliticalZone) return false;
    if (filters.state && memo.state !== filters.state) return false;

    const memoTime = getMemoFilterTime(memo);
    if (startTime && (!memoTime || memoTime < startTime)) return false;
    if (endTime && (!memoTime || memoTime > endTime)) return false;

    return true;
  });
}

function applyAdvancedSort(rows, sortBy) {
  const list = normalizeMemoRows(rows);

  if (sortBy === "geopolitical_zone") {
    return list.sort((a, b) =>
      String(a.geopolitical_zone || "").localeCompare(String(b.geopolitical_zone || "")) ||
      String(a.state || "").localeCompare(String(b.state || "")) ||
      getMemoTime(b) - getMemoTime(a)
    );
  }

  if (sortBy === "state") {
    return list.sort((a, b) =>
      String(a.state || "").localeCompare(String(b.state || "")) ||
      String(a.geopolitical_zone || "").localeCompare(String(b.geopolitical_zone || "")) ||
      getMemoTime(b) - getMemoTime(a)
    );
  }

  if (sortBy === "date_asc") {
    return list.sort((a, b) => getMemoFilterTime(a) - getMemoFilterTime(b));
  }

  if (sortBy === "date_desc") {
    return list.sort((a, b) => getMemoFilterTime(b) - getMemoFilterTime(a));
  }

  return list;
}

function sortMemos(rows, sortBy) {
  const list = normalizeMemoRows(rows);

  return list.sort((a, b) => {
    if (sortBy === "oldest") return getMemoTime(a) - getMemoTime(b);
    if (sortBy === "amount_desc") return safeNumber(getMemoAmount(b)) - safeNumber(getMemoAmount(a));
    if (sortBy === "amount_asc") return safeNumber(getMemoAmount(a)) - safeNumber(getMemoAmount(b));
    if (sortBy === "balance_desc") return safeNumber(b.remaining_balance) - safeNumber(a.remaining_balance);
    if (sortBy === "released_desc") return safeNumber(b.total_released_amount) - safeNumber(a.total_released_amount);
    if (sortBy === "status_az") return String(getMemoLifecycleStage(a)).localeCompare(String(getMemoLifecycleStage(b)));
    if (sortBy === "beneficiary_az") return String(a.beneficiary_name || "").localeCompare(String(b.beneficiary_name || ""));
    if (sortBy === "workflow_type") return String(getMemoWorkflowType(a)).localeCompare(String(getMemoWorkflowType(b)));

    return getMemoTime(b) - getMemoTime(a);
  });
}

function getMemoTime(memo) {
  const value = getMemoApprovalDate(memo) || memo?.updated_at || memo?.created_at;
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function getMemoFilterTime(memo) {
  const value = getMemoApprovalDate(memo) || memo?.created_at;
  const date = value ? new Date(value) : null;

  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function getDateBoundary(value, boundary) {
  if (!value) return 0;

  const date = new Date(`${value}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`);

  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getUniqueFieldOptions(rows, field) {
  return Array.from(
    new Set(
      normalizeMemoRows(rows)
        .map((memo) => memo?.[field])
        .filter((value) => value !== null && value !== undefined && String(value).trim() !== "")
        .map((value) => String(value).trim())
    )
  ).sort((a, b) => a.localeCompare(b));
}

function sumBy(rows, field) {
  return normalizeMemoRows(rows).reduce((sum, memo) => sum + safeNumber(memo?.[field]), 0);
}

function formatCompactMoney(value) {
  return formatMoney(value, "NGN");
}

function unwrapData(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function normalizeMemoRows(memos) {
  return Array.isArray(memos) ? memos.filter((memo) => memo && typeof memo === "object") : [];
}
