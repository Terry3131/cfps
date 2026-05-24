import { useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import SelectField from "../components/SelectField";
import API from "../api/api";
import useDashboardSummary from "../hooks/useDashboardSummary";
import useFormState from "../hooks/useFormState";
import useMemos from "../hooks/useMemos";
import useOrganizationalUnits from "../hooks/useOrganizationalUnits";
import useReportExport from "../hooks/useReportExport";
import { formatDate, formatMoney, safeNumber } from "../utils/format";
import {
  getMemoAmount,
  getMemoProgress,
  getMemoReference,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";

const SECTION_LABELS = {
  "executive-metrics": "Executive Metrics",
  "financial-summary": "Statistical Financial Summary",
  expenses: "Operational Intelligence",
  geography: "Geography",
  beneficiaries: "Operational Intelligence",
  workflow: "Operational Intelligence",
  "operational-intelligence": "Operational Intelligence",
  validation: "Trackers and Validators",
  reports: "Reports / Export",
  admin: "Administration",
};

export default function CommandDashboard({
  command = "CAS",
  section = "executive-metrics",
  showAdmin = false,
}) {
  const normalizedSection = section || "executive-metrics";
  const { memos, loading, error } = useMemos();
  const { summary, loading: summaryLoading, error: summaryError } = useDashboardSummary();
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const memoRows = useMemo(() => normalizeMemoRows(memos), [memos]);
  const visibleMemos = useMemo(
    () => filterByDate(memoRows, dateRange.start, dateRange.end),
    [dateRange.end, dateRange.start, memoRows]
  );
  const analytics = useMemo(() => buildAnalytics(visibleMemos, summary), [visibleMemos, summary]);

  if (loading || summaryLoading) {
    return <LoadingBox message={`Loading ${command} command dashboard...`} />;
  }

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden">
      {normalizedSection !== "financial-summary" && (
        <PageHeader
          title={`${command} ${SECTION_LABELS[normalizedSection] || "Dashboard"}`}
          subtitle="Executive command intelligence split into focused, briefing-safe pages."
        />
      )}

      <ErrorBox message={error || summaryError} />

      {normalizedSection === "executive-metrics" && (
        <ExecutiveMetrics analytics={analytics} />
      )}
      {normalizedSection === "financial-summary" && (
        <FinancialSummary
          analytics={analytics}
          command={command}
          dateRange={dateRange}
          memos={visibleMemos}
          setDateRange={setDateRange}
        />
      )}
      {["expenses", "beneficiaries", "workflow", "operational-intelligence"].includes(normalizedSection) && <OperationalIntelligence analytics={analytics} />}
      {normalizedSection === "geography" && <Geography analytics={analytics} />}
      {normalizedSection === "validation" && <Validation analytics={analytics} />}
      {normalizedSection === "reports" && <ReportsAndExport command={command} />}
      {normalizedSection === "admin" && showAdmin && <CommandAdmin command={command} />}
      {normalizedSection === "admin" && !showAdmin && (
        <EmptyState title="Administration is not enabled for this command role." />
      )}
    </div>
  );
}

function ExecutiveMetrics({ analytics }) {
  return (
    <>
      <KpiGrid
        items={[
          ["Total Memos", analytics.totalMemos, "All visible backend memo records"],
          ["Active Projects", analytics.activeProjects, "Open heavy workflow projects"],
          ["Stalled Projects", analytics.stalledProjects, "Rejected or overdue monitor posture"],
          ["Awaiting Validation", analytics.awaitingValidation, "Tracker submitted 100%"],
          ["Released Funds", moneyByCurrency(analytics.releasedByCurrency), "Recorded releases"],
          ["Overdue Tracker Reports", analytics.overdueMonitoring, "Due-date field based"],
        ]}
      />
      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <BarChart title="Operational Tracking" rows={analytics.workflowRows} />
        <DonutChart title="Validation Outcome" rows={analytics.validationRows} />
      </section>
    </>
  );
}

function FinancialSummary({ analytics, command, dateRange, memos, setDateRange }) {
  const [draftRange, setDraftRange] = useState(dateRange);
  const releaseRatio = percentage(totalValues(analytics.releasedByCurrency), totalValues(analytics.requestedByCurrency));
  const pendingRatio = percentage(totalValues(analytics.pendingByCurrency), totalValues(analytics.requestedByCurrency));
  const currencyDistribution = financialCurrencyRows(analytics.requestedByCurrency);
  const fundingComparisonRows = financialCurrencyRows(analytics.requestedByCurrency).map((row) => ({
    ...row,
    requested: safeNumber(analytics.requestedByCurrency[row.label]),
    released: safeNumber(analytics.releasedByCurrency[row.label]),
    pending: safeNumber(analytics.pendingByCurrency[row.label]),
  }));
  const topFinancialRows = [...memos]
    .sort((a, b) => safeNumber(getMemoAmount(b)) - safeNumber(getMemoAmount(a)))
    .slice(0, 12);

  const updateDraft = (field, value) => {
    setDraftRange((current) => ({ ...current, [field]: value }));
  };

  const applyRange = () => {
    setDateRange(draftRange);
  };

  const resetRange = () => {
    const nextRange = { start: "", end: "" };
    setDraftRange(nextRange);
    setDateRange(nextRange);
  };

  const setQuickRange = (range) => {
    const nextRange = getQuickRange(range);
    setDraftRange(nextRange);
    setDateRange(nextRange);
  };

  return (
    <div className="cas-financial max-w-full space-y-4 overflow-x-hidden">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-[#071f3f] text-white shadow-xl shadow-slate-900/15 print:bg-white print:text-slate-950">
        <div className="border-l-4 border-emerald-400 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(14,165,233,0.08)_45%,rgba(15,23,42,0.16))] px-5 py-5 lg:px-6">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Statistical Financial Summary</h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-200">
                Currency-preserved funding, releases, pending exposure, and memo concentration.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-full xl:max-w-md">
              <HeroStat label="Records" value={analytics.totalMemos} />
              <HeroStat label="Released" value={`${releaseRatio}%`} />
              <HeroStat label="Pending" value={`${pendingRatio}%`} />
              <HeroStat label="Refresh" value={new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:max-w-xl">
            <CompactDateField
              label="Start Date"
              value={draftRange.start}
              onChange={(event) => updateDraft("start", event.target.value)}
            />
            <CompactDateField
              label="End Date"
              value={draftRange.end}
              onChange={(event) => updateDraft("end", event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["Today", "7 Days", "30 Days", "90 Days", "Year"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setQuickRange(label)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#071f3f]"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={applyRange}
              className="rounded-xl bg-[#071f3f] px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-[#0b2d55]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetRange}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600 transition hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100"
            >
              Export
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
        <FinancialKpiCard
          label="Funds Requested"
          values={analytics.requestedByCurrency}
          note="Total memo exposure"
          progress={100}
          tone="sky"
        />
        <FinancialKpiCard
          label="Funds Released"
          values={analytics.releasedByCurrency}
          note={`${releaseRatio}% release coverage`}
          progress={releaseRatio}
          tone="emerald"
        />
        <FinancialKpiCard
          label="Funds Pending"
          values={analytics.pendingByCurrency}
          note={`${pendingRatio}% awaiting release`}
          progress={pendingRatio}
          tone="amber"
        />
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Release Decisions</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <DecisionTile label="Partial" value={analytics.partialFunding} tone="amber" />
            <DecisionTile label="Full" value={analytics.fullFunding} tone="emerald" />
            <DecisionTile label="Rejected" value={analytics.rejectedMemos} tone="red" />
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            Status counts are derived from existing release and memo status fields.
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FinancialDonut title="Currency Distribution" rows={currencyDistribution} />
        <FundingComparisonChart rows={fundingComparisonRows} />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <FinancialMemoTable rows={topFinancialRows} />
        <ReleaseTrendPanel rows={analytics.releaseTrendRows} />
      </section>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function CompactDateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-4 focus:ring-sky-100"
      />
    </label>
  );
}

function FinancialKpiCard({ label, values, note, progress, tone }) {
  const toneClass = {
    sky: "from-sky-500 to-blue-700",
    emerald: "from-emerald-500 to-teal-700",
    amber: "from-amber-400 to-orange-600",
  }[tone] || "from-slate-500 to-slate-700";

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-xs font-bold text-slate-400">{note}</p>
        </div>
        <span className={`h-9 w-9 shrink-0 rounded-2xl bg-gradient-to-br ${toneClass} shadow-lg shadow-slate-900/10`} />
      </div>
      <CurrencyMiniStack values={values} />
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClass}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
    </div>
  );
}

function CurrencyMiniStack({ values }) {
  const rows = financialCurrencyRows(values);

  if (rows.length === 0) {
    return <p className="mt-4 text-lg font-black text-slate-950">{formatMoney(0, "NGN")}</p>;
  }

  return (
    <div className="mt-4 grid gap-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[3.6rem_minmax(0,1fr)] items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-center text-[10px] font-black text-slate-500">
            {row.label}
          </span>
          <span className="min-w-0 truncate text-right text-lg font-black tabular-nums tracking-tight text-slate-950" title={row.value.toLocaleString()}>
            {compactAmount(row.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function DecisionTile({ label, value, tone }) {
  const toneClass = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
  }[tone] || "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border px-3 py-3 text-center ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-black">{safeNumber(value).toLocaleString()}</p>
    </div>
  );
}

function FinancialDonut({ title, rows }) {
  const total = rows.reduce((sum, row) => sum + safeNumber(row.value), 0);
  const palette = ["#38bdf8", "#34d399", "#f59e0b", "#a78bfa", "#ef4444"];
  let start = 0;
  const gradient = total > 0
    ? rows.map((row, index) => {
        const value = safeNumber(row.value);
        const end = start + (value / total) * 100;
        const part = `${palette[index % palette.length]} ${start}% ${end}%`;
        start = end;
        return part;
      }).join(", ")
    : "#e2e8f0 0% 100%";

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">Requested funding by stored currency. No exchange conversion.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500">
          {rows.length} currencies
        </span>
      </div>
      {rows.length === 0 || total <= 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full shadow-inner" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</span>
              <span className="text-lg font-black text-slate-950">{compactAmount(total)}</span>
            </div>
          </div>
          <div className="grid gap-2">
            {rows.map((row, index) => (
              <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-800">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="text-sm font-black tabular-nums text-slate-950">{compactAmount(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function FundingComparisonChart({ rows }) {
  const max = Math.max(...rows.flatMap((row) => [row.requested, row.released, row.pending]), 0);

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xl font-bold tracking-tight text-slate-950">Released vs Pending</p>
      <p className="mt-1 text-sm text-slate-500">Currency-separated release position against requested exposure.</p>
      {rows.length === 0 || max <= 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">{row.label}</span>
                <span className="truncate text-sm font-black text-slate-950">Requested {compactAmount(row.requested)}</span>
              </div>
              <MetricBar label="Released" value={row.released} max={max} tone="bg-emerald-500" />
              <MetricBar label="Pending" value={row.pending} max={max} tone="bg-amber-500" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MetricBar({ label, value, max, tone }) {
  const width = max > 0 ? Math.max(3, (safeNumber(value) / max) * 100) : 0;

  return (
    <div className="mt-2 grid grid-cols-[5rem_minmax(0,1fr)_5.5rem] items-center gap-2 text-xs">
      <span className="font-bold text-slate-500">{label}</span>
      <div className="h-2.5 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-right font-black tabular-nums text-slate-800">{compactAmount(value)}</span>
    </div>
  );
}

function FinancialMemoTable({ rows }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xl font-bold tracking-tight text-slate-950">High-Value Financial Register</p>
          <p className="mt-1 text-sm text-slate-500">Top memo exposure within the active date filter.</p>
        </div>
        <span className="w-max rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-500">
          Top {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
          <div className="max-h-[30rem] overflow-y-auto">
          <table className="w-full min-w-[62rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {["Reference", "Beneficiary", "Currency", "Requested", "Released", "Pending", "Status"].map((heading) => (
                  <th key={heading} className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-3 py-3 text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((memo, index) => {
                const requested = safeNumber(getMemoAmount(memo));
                const released = safeNumber(memo.total_released_amount);
                const pending = Math.max(requested - released, 0);
                return (
                  <tr key={memo.id || getMemoReference(memo)} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}>
                    <td className="border-b border-slate-100 px-3 py-3 font-black text-slate-950">{getMemoReference(memo)}</td>
                    <td className="max-w-[18rem] border-b border-slate-100 px-3 py-3">
                      <span className="block truncate font-bold text-slate-800">{memo.beneficiary_name || "N/A"}</span>
                      <span className="block truncate text-xs font-semibold text-slate-500">{memo.heading || memo.description || "Untitled memo"}</span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">{memo.currency || "NGN"}</span>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 font-black tabular-nums text-slate-950">{formatMoney(requested, memo.currency || "NGN")}</td>
                    <td className="border-b border-slate-100 px-3 py-3 font-black tabular-nums text-emerald-700">{formatMoney(released, memo.currency || "NGN")}</td>
                    <td className="border-b border-slate-100 px-3 py-3 font-black tabular-nums text-amber-700">{formatMoney(pending, memo.currency || "NGN")}</td>
                    <td className="border-b border-slate-100 px-3 py-3"><FinancialStatusPill status={memo.fund_release_status || memo.business_status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </section>
  );
}

function FinancialStatusPill({ status }) {
  const normalized = String(status || "NOT_READY").toUpperCase();
  const tone = normalized.includes("PAID") || normalized.includes("RELEASED")
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : normalized.includes("REJECTED")
      ? "border-red-200 bg-red-50 text-red-700"
      : normalized.includes("PARTIAL") || normalized.includes("WAITING")
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${tone}`}>
      {normalized.replace(/_/g, " ")}
    </span>
  );
}

function ReleaseTrendPanel({ rows }) {
  const max = Math.max(...rows.map((row) => safeNumber(row.value)), 0);

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xl font-bold tracking-tight text-slate-950">Release Activity Trend</p>
      <p className="mt-1 text-sm text-slate-500">Based on latest release dates returned by the backend.</p>
      {rows.length === 0 || max <= 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="mt-5 flex h-72 items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4">
          {rows.map((row) => {
            const height = Math.max(8, (safeNumber(row.value) / max) * 100);
            return (
              <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full rounded-t-xl bg-gradient-to-t from-[#071f3f] to-sky-500" style={{ height: `${height}%` }} title={`${row.label}: ${row.value.toLocaleString()}`} />
                <span className="w-full truncate text-center text-[10px] font-bold text-slate-500">{row.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Expenses({ analytics }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <BarChart title="Expenses by Currency" rows={analytics.currencyRows} formatValue={formatCurrencyRowMoney} />
      <BarChart title="Expenses by Category" rows={analytics.categoryRows} formatValue={formatPlainMoney} />
      <BarChart title="Expenses by State" rows={analytics.stateExpenseRows} formatValue={formatPlainMoney} />
      <DonutChart title="Expenses by Geopolitical Zone" rows={analytics.zoneExpenseRows} />
    </section>
  );
}

function OperationalIntelligence({ analytics }) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Operational Intelligence</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Workflow, expenditure, and beneficiary concentration</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
          Consolidated executive view of workflow split, currency exposure, beneficiary analytics, and branch expenditure from existing memo fields.
        </p>
      </section>
      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <DonutChart title="Heavy vs Light Workflow Split" rows={analytics.workflowRows} />
        <BarChart title="Completed vs Ongoing" rows={analytics.completionRows} />
        <BarChart title="Expenses by Currency" rows={analytics.currencyRows} formatValue={formatCurrencyRowMoney} />
        <BarChart title="Expenses by Category" rows={analytics.categoryRows} formatValue={formatPlainMoney} />
        <BarChart title="Beneficiary Funding Exposure" rows={analytics.beneficiaryAmountRows} formatValue={formatPlainMoney} />
        <BarChart title="Branch Expenditure" rows={analytics.branchExpenseRows} formatValue={formatPlainMoney} />
        <BarChart title="Heavy Operational Projects" rows={analytics.heavyStageRows} />
        <InsightList title="Completed / Rejected by Beneficiary" rows={analytics.beneficiaryStatusRows} />
      </section>
    </div>
  );
}

function Geography({ analytics }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <BarChart title="Projects by State" rows={analytics.stateRows} />
      <BarChart title="Projects by Location" rows={analytics.locationRows} />
      <DonutChart title="Geopolitical Zone Distribution" rows={analytics.zoneRows} />
      <InsightList title="Geographic Watch List" rows={analytics.locationRows.slice(0, 6)} />
    </section>
  );
}

function Beneficiaries({ analytics }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <BarChart title="Top Beneficiaries" rows={analytics.beneficiaryRows} />
      <BarChart title="Beneficiary Funding Exposure" rows={analytics.beneficiaryAmountRows} formatValue={formatPlainMoney} />
      <InsightList title="Completed / Stalled by Beneficiary" rows={analytics.beneficiaryStatusRows} />
    </section>
  );
}

function Workflow({ analytics }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <DonutChart title="Heavy vs Light Workflow Split" rows={analytics.workflowRows} />
      <BarChart title="Completed vs Ongoing" rows={analytics.completionRows} />
      <BarChart title="Heavy Operational Projects" rows={analytics.heavyStageRows} />
      <BarChart title="Light Controlled Approvals" rows={analytics.lightStageRows} />
    </section>
  );
}

function Validation({ analytics }) {
  const [openMetric, setOpenMetric] = useState("");

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Trackers and Validators</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Tracker report pressure, validation queue, and completion integrity</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
          Counts are calculated from real memo lifecycle, funding, tracker, and validator assignment fields. Missing due dates, reasons, and evidence are marked explicitly.
        </p>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {analytics.trackerValidatorMetrics.map((metric) => (
          <TrackerMetricCard
            key={metric.key}
            metric={metric}
            open={openMetric === metric.key}
            onToggle={() => setOpenMetric((current) => current === metric.key ? "" : metric.key)}
          />
        ))}
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <DonutChart title="Validation Outcome" rows={analytics.validationRows} />
        <BarChart title="Tracker / Validator Assignment Lines" rows={analytics.monitorValidatorRows} />
      </section>
    </div>
  );
}

function TrackerMetricCard({ metric, open, onToggle }) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{metric.label}</p>
          <p className="mt-2 break-words text-3xl font-black leading-tight text-slate-950">{metric.value}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600 hover:bg-slate-100"
        >
          {open ? "Hide" : "View"}
        </button>
      </div>
      <p className="mt-2 text-xs font-semibold leading-snug text-slate-500">{metric.note}</p>
      {open && (
        <div className="mt-3 space-y-2">
          {metric.rows.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">No matching records.</p>
          ) : metric.rows.slice(0, 8).map((row, index) => (
            <div key={`${metric.key}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="truncate font-black text-slate-900">{row.title}</p>
              <p className="mt-1 break-words font-semibold text-slate-500">{row.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsAndExport({ command }) {
  const { form, resetForm, updateField } = useFormState({
    format: "pdf",
    start_date: "",
    end_date: "",
  });
  const { loading, error, downloadMemoReport } = useReportExport();
  const [backupState, setBackupState] = useState({ loading: false, restoring: false, error: "", message: "" });
  const [restoreFile, setRestoreFile] = useState(null);

  const downloadReport = async (event) => {
    event.preventDefault();
    await downloadMemoReport(form);
  };

  const downloadBackup = async () => {
    try {
      setBackupState({ loading: true, restoring: false, error: "", message: "" });
      const res = await API.get("/system/backup", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cfps-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupState({ loading: false, restoring: false, error: "", message: "Backup downloaded successfully." });
    } catch (err) {
      setBackupState({ loading: false, restoring: false, error: err?.response?.data?.message || "Backup failed.", message: "" });
    }
  };

  const restoreBackup = async () => {
    if (!restoreFile) {
      setBackupState({ loading: false, restoring: false, error: "Select a backup file first.", message: "" });
      return;
    }

    if (!window.confirm("Restore this backup? This will replace database table contents in the backup file.")) return;

    try {
      setBackupState({ loading: false, restoring: true, error: "", message: "" });
      const text = await restoreFile.text();
      await API.post("/system/restore", JSON.parse(text));
      setBackupState({ loading: false, restoring: false, error: "", message: "Backup restored successfully." });
    } catch (err) {
      setBackupState({ loading: false, restoring: false, error: err?.response?.data?.message || err?.message || "Restore failed.", message: "" });
    }
  };

  return (
    <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <SectionCard title="Report Export" subtitle={`Export memo reports for ${command} briefing workflows.`}>
        <ErrorBox message={error} className="mb-5" />
        <form onSubmit={downloadReport} className="space-y-4">
          <SelectField name="format" value={form.format} onChange={updateField} label="Export Format">
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </SelectField>
          <FormField name="start_date" type="date" value={form.start_date} onChange={updateField} label="Start Date" />
          <FormField name="end_date" type="date" value={form.end_date} onChange={updateField} label="End Date" />
          <div className="flex flex-wrap gap-2">
            <ActionButton type="submit" disabled={loading}>{loading ? "Downloading..." : "Download Report"}</ActionButton>
            <ActionButton type="button" variant="ghost" onClick={() => resetForm()}>Reset</ActionButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Backup / Restore" subtitle="Restricted system backup and guarded restore actions.">
        <ErrorBox message={backupState.error} className="mb-4" />
        {backupState.message && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {backupState.message}
          </div>
        )}
        <div className="space-y-4">
          <ActionButton type="button" onClick={downloadBackup} disabled={backupState.loading}>
            {backupState.loading ? "Preparing Backup..." : "Download Backup"}
          </ActionButton>
          <div>
            <label className="block text-sm font-bold text-slate-700">Restore Backup File</label>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => setRestoreFile(event.target.files?.[0] || null)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"
            />
          </div>
          <ActionButton type="button" variant="danger" onClick={restoreBackup} disabled={backupState.restoring}>
            {backupState.restoring ? "Restoring..." : "Restore Backup"}
          </ActionButton>
        </div>
      </SectionCard>
    </section>
  );
}

function CommandAdmin({ command }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
      <UserCreationPanel command={command} />
      <AuditPanel />
      <ReferencePanel />
    </section>
  );
}

function UserCreationPanel({ command }) {
  const { form, updateField, resetForm } = useFormState({
    full_name: "",
    username: "",
    password: "",
    role: "VIEWER",
    branch_dru: "",
  });
  const [state, setState] = useState({ loading: false, error: "", message: "" });

  const createUser = async (event) => {
    event.preventDefault();
    try {
      setState({ loading: true, error: "", message: "" });
      await API.post("/users", {
        ...form,
        branch_dru: form.branch_dru || null,
      });
      setState({ loading: false, error: "", message: "User created successfully." });
      resetForm();
    } catch (err) {
      setState({ loading: false, error: err?.response?.data?.message || "Failed to create user.", message: "" });
    }
  };

  return (
    <SectionCard title="User Account Creation" subtitle={`${command} authorized account provisioning.`}>
      <ErrorBox message={state.error} className="mb-4" />
      {state.message && <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{state.message}</div>}
      <form onSubmit={createUser} className="space-y-4">
        <FormField name="full_name" value={form.full_name} onChange={updateField} label="Full Name" required />
        <FormField name="username" value={form.username} onChange={updateField} label="Username" required />
        <FormField name="password" type="password" value={form.password} onChange={updateField} label="Password" required />
        <SelectField name="role" value={form.role} onChange={updateField} label="Role">
          {["VIEWER", "CAS", "AA_CAS", "PASO_CAS", "CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR"].map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </SelectField>
        <OrgUnitInput value={form.branch_dru} onChange={updateField} />
        <ActionButton type="submit" disabled={state.loading}>{state.loading ? "Creating..." : "Create User"}</ActionButton>
      </form>
    </SectionCard>
  );
}

function AuditPanel() {
  const [state, setState] = useState({ loading: false, error: "", rows: [] });

  const loadAudit = async () => {
    try {
      setState({ loading: true, error: "", rows: [] });
      const res = await API.get("/audit-logs");
      setState({ loading: false, error: "", rows: Array.isArray(res.data?.data) ? res.data.data.slice(0, 12) : [] });
    } catch (err) {
      setState({ loading: false, error: err?.response?.data?.message || "Failed to load audit logs.", rows: [] });
    }
  };

  return (
    <SectionCard title="Audit Trail" subtitle="Recent command activity visibility.">
      <ErrorBox message={state.error} className="mb-4" />
      <ActionButton type="button" variant="ghost" onClick={loadAudit} disabled={state.loading}>
        {state.loading ? "Loading..." : "Load Audit Trail"}
      </ActionButton>
      <div className="mt-4 space-y-2">
        {state.rows.length === 0 ? (
          <p className="text-sm text-slate-500">Audit records load on demand.</p>
        ) : state.rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">{row.action} | {row.entity_type}</p>
            <p className="text-xs text-slate-500">{row.username || row.user_name || "System"} | {formatDate(row.created_at)}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ReferencePanel() {
  const { units } = useOrganizationalUnits("");
  const assignable = units.filter((unit) => ["HQ_BRANCH", "DIRECT_TO_CAS_OFFICE"].includes(unit.unit_type));

  return (
    <SectionCard title="Branch / Direct-to-CAS Assignment" subtitle="Active units available for user assignment." className="xl:col-span-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {assignable.map((unit) => (
          <div key={unit.code} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-black text-slate-950">{unit.code}</p>
            <p className="text-xs text-slate-500">{unit.name} | {unit.unit_type}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function OrgUnitInput({ value, onChange }) {
  const { units } = useOrganizationalUnits("");
  const assignable = units.filter((unit) => ["HQ_BRANCH", "DIRECT_TO_CAS_OFFICE"].includes(unit.unit_type));
  return (
    <SelectField name="branch_dru" value={value} onChange={onChange} label="Branch / Direct-to-CAS Unit">
      <option value="">No unit</option>
      {assignable.map((unit) => (
        <option key={unit.code} value={unit.code}>{unit.code} - {unit.name}</option>
      ))}
    </SelectField>
  );
}

function KpiGrid({ items }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([label, value, note]) => (
        <div key={label} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 xl:text-3xl">{value}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">{note}</p>
        </div>
      ))}
    </section>
  );
}

function BarChart({ title, rows, formatValue = (value) => safeNumber(value).toLocaleString() }) {
  const max = Math.max(...rows.map((row) => safeNumber(row.value)), 0);

  return (
    <SectionCard title={title} subtitle="Real backend fields only.">
      {rows.length === 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 10).map((row) => {
            const width = max > 0 ? Math.max(4, (safeNumber(row.value) / max) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-bold text-slate-800">{row.label}</span>
                  <span className="min-w-0 break-words text-right font-black leading-tight text-slate-950">{formatValue(row.value, row)}</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#071f3f] to-sky-600" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function DonutChart({ title, rows }) {
  const total = rows.reduce((sum, row) => sum + safeNumber(row.value), 0);
  const palette = ["#071f3f", "#0369a1", "#059669", "#7c3aed", "#d97706", "#dc2626"];
  let start = 0;
  const gradient = total > 0
    ? rows.map((row, index) => {
        const value = safeNumber(row.value);
        const end = start + (value / total) * 100;
        const part = `${palette[index % palette.length]} ${start}% ${end}%`;
        start = end;
        return part;
      }).join(", ")
    : "#e2e8f0 0% 100%";

  return (
    <SectionCard title={title} subtitle="Distribution view.">
      {rows.length === 0 || total <= 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
          <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-xl font-black text-slate-950">
              {total}
            </div>
          </div>
          <div className="space-y-2">
            {rows.slice(0, 8).map((row, index) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-bold text-slate-800">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
                  <span className="truncate">{row.label}</span>
                </span>
                <span className="font-black text-slate-950">{safeNumber(row.value).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function InsightList({ title, rows }) {
  return (
    <SectionCard title={title} subtitle="Ranked operational list.">
      {rows.length === 0 ? (
        <EmptyState title="Awaiting backend data." />
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-bold text-slate-800">{index + 1}. {row.label}</span>
              <span className="font-black text-slate-950">{row.detail || safeNumber(row.value).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function buildAnalytics(memos, summary = {}) {
  const rows = normalizeMemoRows(memos);
  const heavy = rows.filter((memo) => getMemoWorkflowType(memo) === "HEAVY_WORKFLOW");
  const light = rows.filter((memo) => getMemoWorkflowType(memo) === "LIGHT_WORKFLOW");
  const requestedByCurrency = groupAmount(rows, getMemoCurrency, (memo) => getMemoAmount(memo));
  const releasedByCurrency = groupAmount(rows, getMemoCurrency, (memo) => memo.total_released_amount || 0);
  const pendingByCurrency = groupAmount(rows, getMemoCurrency, getRemainingBalance);
  const activeProjects = heavy.filter(isActiveProject);
  const awaitingValidationRows = rows.filter(isAwaitingValidationMemo);
  const validationApprovedRows = rows.filter(isCompletedMemo);
  const validationRejectedRows = rows.filter(isRejectedMemo);
  const waitingFundReleaseRows = rows.filter(isWaitingFundReleaseMemo);
  const partialFundingRows = rows.filter(isPartiallyFundedMemo);
  const fullyFundedRows = rows.filter(isFullyFundedMemo);
  const kivRows = rows.filter(isKivMemo);
  const waitingTrackerRows = rows.filter(isWaitingTrackerReportMemo);
  const completed100Rows = rows.filter((memo) => safeNumber(getMemoProgress(memo)) >= 100);
  const approvedRows = rows.filter(isApprovedMemo);
  const validationApproved = validationApprovedRows.length;
  const validationRejected = validationRejectedRows.length;

  return {
    totalMemos: rows.length,
    activeProjects: activeProjects.length,
    stalledProjects: validationRejected,
    awaitingValidation: awaitingValidationRows.length,
    overdueMonitoring: rows.filter(isOverdue).length,
    overdueValidation: awaitingValidationRows.filter(isOverdue).length,
    requestedByCurrency,
    releasedByCurrency,
    pendingByCurrency,
    partialFunding: partialFundingRows.length,
    fullFunding: fullyFundedRows.length,
    rejectedMemos: validationRejected,
    monitorSubmitted100: completed100Rows.length,
    validationApproved,
    validationRejected,
    trackerValidatorMetrics: buildTrackerValidatorMetrics({
      approvedRows,
      kivRows,
      waitingFundReleaseRows,
      partialFundingRows,
      waitingTrackerRows,
      awaitingValidationRows,
      validationApprovedRows,
      validationRejectedRows,
      completed100Rows,
    }),
    workflowRows: [
      { label: "Heavy Workflow", value: heavy.length },
      { label: "Light Workflow", value: light.length },
    ],
    validationRows: [
      { label: "Awaiting", value: awaitingValidationRows.length },
      { label: "Approved", value: validationApproved },
      { label: "Rejected", value: validationRejected },
    ],
    fundingRows: rowsFromObject(countBy(rows, (memo) => memo.fund_release_status || "NOT_READY")),
    releaseTrendRows: buildReleaseTrendRows(rows),
    currencyRows: rowsFromObject(requestedByCurrency),
    categoryRows: rowsFromObject(groupAmount(rows, (memo) => memo.category || "UNCATEGORIZED", (memo) => getMemoAmount(memo))),
    branchExpenseRows: rowsFromObject(groupAmount(rows, (memo) => memo.branch_dru || memo.primary_monitor_branch || "UNSPECIFIED", (memo) => getMemoAmount(memo))),
    stateExpenseRows: rowsFromObject(groupAmount(rows, (memo) => memo.state || "UNSPECIFIED", (memo) => getMemoAmount(memo))),
    zoneExpenseRows: rowsFromObject(groupAmount(rows, (memo) => memo.geopolitical_zone || "UNSPECIFIED", (memo) => getMemoAmount(memo))),
    stateRows: rowsFromObject(countBy(rows, (memo) => memo.state || "UNSPECIFIED")),
    locationRows: rowsFromObject(countBy(rows, (memo) => memo.location || "UNSPECIFIED")),
    zoneRows: rowsFromObject(countBy(rows, (memo) => memo.geopolitical_zone || "UNSPECIFIED")),
    beneficiaryRows: rowsFromObject(countBy(rows, (memo) => memo.beneficiary_name || "UNSPECIFIED")),
    beneficiaryAmountRows: rowsFromObject(groupAmount(rows, (memo) => memo.beneficiary_name || "UNSPECIFIED", (memo) => getMemoAmount(memo))),
    beneficiaryStatusRows: buildBeneficiaryStatusRows(rows),
    completionRows: [
      { label: "Completed", value: validationApprovedRows.length },
      { label: "Ongoing", value: rows.filter((memo) => !isCompletedMemo(memo)).length },
    ],
    heavyStageRows: rowsFromObject(countBy(heavy, (memo) => memo.lifecycle_stage || memo.business_status || "UNKNOWN")),
    lightStageRows: rowsFromObject(countBy(light, (memo) => memo.lifecycle_stage || memo.business_status || "UNKNOWN")),
    monitorValidatorRows: rowsFromObject(countBy(rows, (memo) => `${memo.primary_monitor_branch || "NO TRACKER"} / ${memo.validator_branch || "NO VALIDATOR"}`)),
    summary,
  };
}

function buildTrackerValidatorMetrics({
  approvedRows,
  kivRows,
  waitingFundReleaseRows,
  partialFundingRows,
  waitingTrackerRows,
  awaitingValidationRows,
  validationApprovedRows,
  validationRejectedRows,
  completed100Rows,
}) {
  return [
    {
      key: "approved",
      label: "Total Approved Memo Counts",
      value: approvedRows.length,
      note: "approval_status or business status is approved.",
      rows: approvedRows.map((memo) => memoMetricRow(memo, `Approved ${formatDate(memo.approved_at || memo.updated_at)}`)),
    },
    {
      key: "kiv",
      label: "KIV",
      value: kivRows.length,
      note: "status, business_status, or lifecycle_stage equals KIV.",
      rows: kivRows.map((memo) => memoMetricRow(memo, `Posted ${formatDate(memo.updated_at || memo.created_at)}`)),
    },
    {
      key: "waiting-fund-release",
      label: "Total Waiting Fund Release",
      value: waitingFundReleaseRows.length,
      note: "Approved records with no release or waiting fund-release status.",
      rows: waitingFundReleaseRows.map((memo) => memoMetricRow(memo, `Approved ${formatDate(memo.approved_at || memo.updated_at)} | ${memo.fund_release_status || "Waiting release"}`)),
    },
    {
      key: "partial",
      label: "Total Partially Funded",
      value: partialFundingRows.length,
      note: "Partial status or released amount with remaining balance.",
      rows: partialFundingRows.map((memo) => memoMetricRow(memo, `Released ${formatMoney(memo.total_released_amount, memo.currency)} | Balance ${formatMoney(getRemainingBalance(memo), memo.currency)}`)),
    },
    {
      key: "waiting-tracker",
      label: "Total Waiting Tracker Reports",
      value: waitingTrackerRows.length,
      note: "Funded heavy workflow records still waiting tracker progress.",
      rows: waitingTrackerRows.map((memo) => memoMetricRow(
        memo,
        `Date tasked: ${formatDate(memo.latest_release_date || memo.created_at)} | Date due: ${memo.next_report_due_date ? formatDate(memo.next_report_due_date) : "Requires backend field"} | Reports written: ${getReportsWrittenLabel(memo)} | Evidence: ${getEvidenceIndicatorLabel(memo)}`
      )),
    },
    {
      key: "waiting-validation",
      label: "Total Waiting Validation",
      value: awaitingValidationRows.length,
      note: "100% progress and lifecycle_stage awaiting validation.",
      rows: awaitingValidationRows.map((memo) => memoMetricRow(memo, `Validator: ${getAssignedValidatorLabel(memo)} | Date posted: ${formatDate(memo.updated_at)}`)),
    },
    {
      key: "validated",
      label: "Validated",
      value: validationApprovedRows.length,
      note: "Completed lifecycle or is_completed true.",
      rows: validationApprovedRows.map((memo) => memoMetricRow(memo, `Validated date: ${formatDate(memo.updated_at)}`)),
    },
    {
      key: "rejected",
      label: "Total Rejected",
      value: validationRejectedRows.length,
      note: "Business, lifecycle, validation, or release status contains rejected.",
      rows: validationRejectedRows.map((memo) => memoMetricRow(memo, `Date: ${formatDate(memo.updated_at)} | Reason/photos: Requires backend field`)),
    },
    {
      key: "completed100",
      label: "100% Completed",
      value: completed100Rows.length,
      note: "Progress percent at 100, separate from completed lifecycle.",
      rows: completed100Rows.map((memo) => memoMetricRow(memo, `Progress ${safeNumber(getMemoProgress(memo))}% | ${memo.lifecycle_stage || memo.business_status || "N/A"}`)),
    },
  ];
}

function memoMetricRow(memo, detail) {
  return {
    title: `${getMemoReference(memo)} | ${getMemoTitle(memo)}`,
    detail,
  };
}

function getAssignedValidatorLabel(memo) {
  return memo?.validator_name || memo?.assigned_validator_name || memo?.validator_branch || "Requires backend field";
}

function getReportsWrittenLabel(memo) {
  const count = memo?.progress_reports_count ?? memo?.progress_report_count ?? memo?.reports_written_count ?? memo?.reports_written;
  return count === null || count === undefined || count === "" ? "Requires backend field" : safeNumber(count).toLocaleString();
}

function getEvidenceIndicatorLabel(memo) {
  if (memo?.evidence_count !== null && memo?.evidence_count !== undefined && memo?.evidence_count !== "") {
    return `${safeNumber(memo.evidence_count).toLocaleString()} file(s)`;
  }

  if (memo?.has_evidence !== null && memo?.has_evidence !== undefined) {
    return memo.has_evidence ? "Available" : "None recorded";
  }

  if (memo?.evidence_url) {
    return "Available";
  }

  return "Requires backend field";
}

function isApprovedMemo(memo) {
  const status = normalizeStatus(`${memo?.approval_status || ""} ${memo?.business_status || ""}`);
  return status.includes("APPROVED");
}

function isActiveProject(memo) {
  return (
    getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" &&
    !isCompletedMemo(memo) &&
    !memo?.is_locked &&
    !isRejectedMemo(memo)
  );
}

function isCompletedMemo(memo) {
  return normalizeStatus(memo?.lifecycle_stage) === "COMPLETED" || memo?.is_completed === true;
}

function isAwaitingValidationMemo(memo) {
  return safeNumber(getMemoProgress(memo)) >= 100 && normalizeStatus(memo?.lifecycle_stage) === "AWAITING_VALIDATION";
}

function isRejectedMemo(memo) {
  return normalizeStatus(`${memo?.business_status || ""} ${memo?.lifecycle_stage || ""} ${memo?.validation_status || ""} ${memo?.fund_release_status || ""}`).includes("REJECTED");
}

function isKivMemo(memo) {
  return [memo?.status, memo?.business_status, memo?.lifecycle_stage].some((value) => normalizeStatus(value) === "KIV");
}

function isWaitingFundReleaseMemo(memo) {
  const fundStatus = normalizeStatus(memo?.fund_release_status);
  const released = safeNumber(memo?.total_released_amount);

  return isApprovedMemo(memo) && (released <= 0 || ["AWAITING_FUND_RELEASE", "WAITING_PAYMENT", "PENDING", "NOT_READY"].includes(fundStatus));
}

function isPartiallyFundedMemo(memo) {
  const fundStatus = normalizeStatus(memo?.fund_release_status);
  return fundStatus === "PARTIAL" || fundStatus === "PARTIALLY_FUNDED" || (safeNumber(memo?.total_released_amount) > 0 && getRemainingBalance(memo) > 0);
}

function isFullyFundedMemo(memo) {
  const fundStatus = normalizeStatus(memo?.fund_release_status);
  return ["PAID", "FULL", "FULLY_FUNDED"].includes(fundStatus) || (safeNumber(memo?.total_released_amount) > 0 && getRemainingBalance(memo) <= 0);
}

function isWaitingTrackerReportMemo(memo) {
  const lifecycle = normalizeStatus(memo?.lifecycle_stage);
  return (
    getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" &&
    !isCompletedMemo(memo) &&
    !isRejectedMemo(memo) &&
    safeNumber(memo?.total_released_amount) > 0 &&
    safeNumber(getMemoProgress(memo)) < 100 &&
    ["FUNDS_RELEASED", "COMMENCED", "IN_PROGRESS", "VALIDATION_REJECTED"].includes(lifecycle)
  );
}

function getRemainingBalance(memo) {
  if (memo?.remaining_balance !== null && memo?.remaining_balance !== undefined) {
    return Math.max(0, safeNumber(memo.remaining_balance));
  }

  return Math.max(0, safeNumber(getMemoAmount(memo)) - safeNumber(memo?.total_released_amount));
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function buildBeneficiaryStatusRows(memos) {
  const grouped = {};
  for (const memo of memos) {
    const key = memo.beneficiary_name || "UNSPECIFIED";
    grouped[key] ||= { completed: 0, rejected: 0 };
    if (isCompletedMemo(memo)) grouped[key].completed += 1;
    if (isRejectedMemo(memo)) grouped[key].rejected += 1;
  }
  return Object.entries(grouped).map(([label, value]) => ({
    label,
    value: value.completed + value.rejected,
    detail: `${value.completed} completed / ${value.rejected} rejected`,
  })).sort((a, b) => b.value - a.value).slice(0, 10);
}

function buildReleaseTrendRows(memos) {
  const grouped = {};

  for (const memo of memos) {
    if (!memo.latest_release_date || safeNumber(memo.total_released_amount) <= 0) continue;

    const label = String(memo.latest_release_date).slice(0, 10);
    grouped[label] = safeNumber(grouped[label]) + safeNumber(memo.total_released_amount);
  }

  return rowsFromObject(grouped).sort((a, b) => String(a.label).localeCompare(String(b.label))).slice(-10);
}

function countBy(items, keyFn) {
  return normalizeMemoRows(items).reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = safeNumber(acc[key]) + 1;
    return acc;
  }, {});
}

function groupAmount(items, keyFn, amountFn) {
  return normalizeMemoRows(items).reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = safeNumber(acc[key]) + safeNumber(amountFn(item));
    return acc;
  }, {});
}

function rowsFromObject(object) {
  return Object.entries(object || {})
    .map(([label, value]) => ({ label, value }))
    .filter((row) => row.label && row.label !== "UNSPECIFIED" ? true : safeNumber(row.value) > 0)
    .sort((a, b) => safeNumber(b.value) - safeNumber(a.value));
}

function filterByDate(memos, start, end) {
  return normalizeMemoRows(memos).filter((memo) => {
    const created = Date.parse(memo.created_at || memo.createdAt || "");
    if (!Number.isFinite(created)) return true;
    if (start && created < Date.parse(`${start}T00:00:00Z`)) return false;
    if (end && created > Date.parse(`${end}T23:59:59Z`)) return false;
    return true;
  });
}

function moneyByCurrency(values) {
  const currencies = ["NGN", "USD", "EUR", "GBP"];
  const source = values || {};
  const rows = currencies
    .map((currency) => ({ currency, value: safeNumber(source[currency]) }))
    .filter((row) => row.value > 0)
    .map((row) => formatMoney(row.value, row.currency));
  return rows.length > 0 ? rows.join(" / ") : formatMoney(0, "NGN");
}

function financialCurrencyRows(values) {
  const currencies = ["NGN", "USD", "EUR", "GBP"];

  return currencies
    .map((currency) => ({ label: currency, value: safeNumber(values?.[currency]) }))
    .filter((row) => row.value > 0);
}

function normalizeMemoRows(memos) {
  return Array.isArray(memos) ? memos.filter((memo) => memo && typeof memo === "object") : [];
}

function getMemoCurrency(memo) {
  const currency = String(memo?.currency || "NGN").trim().toUpperCase();
  return currency || "NGN";
}

function totalValues(values) {
  return Object.values(values || {}).reduce((sum, value) => sum + safeNumber(value), 0);
}

function percentage(value, total) {
  if (safeNumber(total) <= 0) return 0;
  return Math.round((safeNumber(value) / safeNumber(total)) * 100);
}

function compactAmount(value) {
  const numberValue = safeNumber(value);

  if (numberValue >= 1000000000) return `${(numberValue / 1000000000).toFixed(1)}B`;
  if (numberValue >= 1000000) return `${(numberValue / 1000000).toFixed(1)}M`;
  if (numberValue >= 1000) return `${(numberValue / 1000).toFixed(1)}K`;

  return numberValue.toLocaleString();
}

function getQuickRange(range) {
  const today = new Date();
  const end = toDateInputValue(today);

  if (range === "Today") {
    return { start: end, end };
  }

  if (range === "Year") {
    return { start: `${today.getFullYear()}-01-01`, end };
  }

  const days = Number.parseInt(range, 10);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - Math.max(days - 1, 0));

  return { start: toDateInputValue(startDate), end };
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function formatPlainMoney(value) {
  return formatMoney(value, "NGN");
}

function formatCurrencyRowMoney(value, row) {
  return formatMoney(value, row?.label || "NGN");
}

function isOverdue(memo) {
  const dueDate = memo.next_report_due_date || memo.nextReportDueDate;
  if (!dueDate) return false;
  return Date.parse(`${String(dueDate).slice(0, 10)}T23:59:59Z`) < Date.now();
}
