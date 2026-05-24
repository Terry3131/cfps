import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import SearchBox from "../components/SearchBox";
import SectionCard from "../components/SectionCard";
import StatusBadge from "../components/StatusBadge";
import API from "../api/api";
import useMemos from "../hooks/useMemos";
import useOrganizationalUnits from "../hooks/useOrganizationalUnits";
import { formatDate, formatMoney, safeNumber } from "../utils/format";
import {
  getMemoAmount,
  getMemoReference,
  getMemoStatus,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";
import { getOrganizationLabelFromMemo } from "../utils/organizationalUnits";

const CURRENCIES = ["NGN", "USD", "EUR", "GBP", "OTHERS"];
const WORKFLOW_OPTIONS = [
  {
    key: "HEAVY_WORKFLOW",
    label: "Heavy Operations",
    description: "Operational risk and funding",
  },
  {
    key: "LIGHT_WORKFLOW",
    label: "Light / Controlled",
    description: "Approval throughput",
  },
];

export default function CASDashboard({
  title = "CAS Dashboard",
  subtitle = "Real memo analytics for operational concentration, funding exposure, workflow separation, and branch review.",
  showCasAdminPanel = false,
  initialProjectorMode = false,
  lockProjectorMode = false,
}) {
  const { memos, loading, error } = useMemos();
  const navigate = useNavigate();

  const [activeWorkflow, setActiveWorkflow] = useState("HEAVY_WORKFLOW");
  const [briefingMode, setBriefingMode] = useState(false);
  const [projectorMode] = useState(initialProjectorMode);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [beneficiaryFilter, setBeneficiaryFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortMode, setSortMode] = useState("date_desc");
  const [activeAnchor, setActiveAnchor] = useState("executive-metrics");
  const [showTrackedProjects, setShowTrackedProjects] = useState(false);
  const [showRejectedDetails, setShowRejectedDetails] = useState(false);
  const [reportState, setReportState] = useState({
    memoId: null,
    loading: false,
    error: "",
    reports: [],
  });
  const [executiveProject, setExecutiveProject] = useState({
    memoId: null,
    loading: false,
    error: "",
    memo: null,
    reports: [],
  });

  const stateOptions = useMemo(() => {
    return uniqueValues(memos.map((memo) => getMemoState(memo)));
  }, [memos]);

  const filteredMemos = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const stateTerm = stateFilter.trim().toLowerCase();
    const locationTerm = locationFilter.trim().toLowerCase();
    const beneficiaryTerm = beneficiaryFilter.trim().toLowerCase();

    return memos.filter((memo) => {
      const state = getMemoState(memo);
      const location = getMemoLocation(memo);
      const beneficiary = getMemoBeneficiary(memo);

      const commandText = [
        getMemoReference(memo),
        getMemoTitle(memo),
        memo?.description,
        memo?.beneficiary_name,
        memo?.branch_dru,
        state,
        location,
        memo?.geopolitical_zone,
        memo?.currency,
        memo?.category,
        getMemoWorkflowType(memo),
        getMemoStatus(memo),
        getValidationEvent(memo),
        memo?.lifecycle_stage,
        memo?.business_status,
        memo?.approval_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm || commandText.includes(searchTerm);
      const matchesState = !stateTerm || state.toLowerCase() === stateTerm;
      const matchesLocation =
        !locationTerm || location.toLowerCase().includes(locationTerm);
      const matchesBeneficiary =
        !beneficiaryTerm || beneficiary.toLowerCase().includes(beneficiaryTerm);
      const matchesDate = isWithinDateRange(getMemoDate(memo), startDate, endDate);

      return (
        matchesSearch &&
        matchesState &&
        matchesLocation &&
        matchesBeneficiary &&
        matchesDate
      );
    });
  }, [
    memos,
    search,
    stateFilter,
    locationFilter,
    beneficiaryFilter,
    startDate,
    endDate,
  ]);

  const visibleMemos = useMemo(() => {
    return filteredMemos.filter(
      (memo) => getMemoWorkflowType(memo) === activeWorkflow
    );
  }, [filteredMemos, activeWorkflow]);

  const sortedVisibleMemos = useMemo(() => {
    return [...visibleMemos].sort((a, b) => compareDashboardMemos(a, b, sortMode));
  }, [sortMode, visibleMemos]);

  const currencySummary = useMemo(() => {
    return CURRENCIES.map((currency) => {
      const rows = visibleMemos.filter(
        (memo) => normalizeCurrency(memo.currency) === currency
      );
      const total = rows.reduce(
        (sum, memo) => sum + safeNumber(getMemoAmount(memo)),
        0
      );

      return {
        currency,
        count: rows.length,
        total,
      };
    });
  }, [visibleMemos]);

  const workflowSummary = useMemo(() => {
    return WORKFLOW_OPTIONS.map((option) => {
      const rows = filteredMemos.filter(
        (memo) => getMemoWorkflowType(memo) === option.key
      );

      return {
        label: option.label,
        key: option.key,
        count: rows.length,
      };
    });
  }, [filteredMemos]);

  const stateSummary = useMemo(() => {
    return groupDistribution(visibleMemos, getMemoState).slice(0, 8);
  }, [visibleMemos]);

  const locationSummary = useMemo(() => {
    return groupDistribution(visibleMemos, getMemoLocation).slice(0, 8);
  }, [visibleMemos]);

  const geopoliticalZoneSummary = useMemo(() => {
    return groupDistribution(visibleMemos, getMemoGeopoliticalZone).slice(0, 8);
  }, [visibleMemos]);

  const beneficiarySummary = useMemo(() => {
    return groupExposure(visibleMemos, getMemoBeneficiary).slice(0, 8);
  }, [visibleMemos]);

  const branchSummary = useMemo(() => {
    return groupExposure(visibleMemos, getMemoBranchLabel).slice(
      0,
      8
    );
  }, [visibleMemos]);

  const kpis = useMemo(() => {
    const completed = visibleMemos.filter(isCompletedMemo).length;
    const stalled = visibleMemos.filter(isStalledMemo).length;
    const awaitingValidation = visibleMemos.filter(isAwaitingValidationMemo).length;
    const beneficiaries = new Set(
      visibleMemos
        .map((memo) => getMemoBeneficiary(memo))
        .filter((value) => value && value !== "N/A")
    ).size;
    const exposure = collectCurrencyTotals(visibleMemos);

    if (activeWorkflow === "HEAVY_WORKFLOW") {
      return [
        { label: "Operational Records", value: visibleMemos.length, note: "Heavy workflow only", tone: "blue" },
        { label: "Recorded Exposure", value: exposure, note: "Stored currencies preserved", valueType: "currency", tone: "teal" },
        { label: "Stalled Execution", value: stalled, note: "Operational watch indicators", tone: stalled > 0 ? "red" : "slate" },
        { label: "Awaiting Validation", value: awaitingValidation, note: "Validator queue pressure", tone: "purple" },
      ];
    }

    return [
      { label: "Controlled Approvals", value: visibleMemos.length, note: "Light workflow only", tone: "blue" },
      { label: "Recorded Value", value: exposure, note: "No exchange conversion", valueType: "currency", tone: "teal" },
      { label: "Completed Actions", value: completed, note: "Administrative throughput", tone: "green" },
      { label: "Beneficiaries", value: beneficiaries, note: "Beneficiary names only", tone: "slate" },
    ];
  }, [visibleMemos, activeWorkflow]);

  const executiveMetrics = useMemo(() => {
    const ongoing = visibleMemos.filter(isOngoingMemo).length;
    const completed = visibleMemos.filter(isCompletedMemo).length;
    const tracked = visibleMemos.filter(isTrackedProject).length;
    const awaitingValidation = visibleMemos.filter(isAwaitingValidationMemo).length;
    const validationApproved = visibleMemos.filter(isValidationApproved).length;
    const validationRejected = visibleMemos.filter(isValidationRejected).length;

    return [
      { label: "Ongoing Projects", value: ongoing, note: "Active heavy workflow records" },
      { label: "Completed Projects", value: completed, note: "Completed or archived records" },
      { label: "Projects Being Tracked", value: tracked, note: "Heavy workflow active tracking" },
      { label: "Awaiting Validation", value: awaitingValidation, note: "Tracker submitted 100%" },
      {
        label: "Trackers Defaulting",
        valueType: "unavailable",
        unavailableTitle: "Awaiting backend due-date field",
        note: "Requires next_report_due_date",
      },
      {
        label: "Validators Defaulting",
        valueType: "unavailable",
        unavailableTitle: "Awaiting backend due-date field",
        note: "Requires validation_due_date",
      },
      { label: "Validation Approved", value: validationApproved, note: "Completed validation outcomes" },
      { label: "Validation Rejected", value: validationRejected, note: "Rejected validation outcomes" },
    ];
  }, [visibleMemos]);

  const trackedProjects = useMemo(() => {
    return visibleMemos.filter(isTrackedProject);
  }, [visibleMemos]);

  const financeMemos = useMemo(() => {
    return visibleMemos;
  }, [visibleMemos]);

  const rejectedFinanceMemos = useMemo(() => {
    return financeMemos.filter(isFinanceRejectedMemo);
  }, [financeMemos]);

  const financeSummary = useMemo(() => {
    return {
      totalMemoCount: financeMemos.length,
      totalRequested: collectCurrencyTotals(financeMemos),
      totalReleased: collectReleasedCurrencyTotals(financeMemos),
      totalPending: collectPendingCurrencyTotals(financeMemos),
      rejectedCount: rejectedFinanceMemos.length,
    };
  }, [financeMemos, rejectedFinanceMemos]);

  const loadProgressReports = async (memo) => {
    setReportState({
      memoId: memo.id,
      loading: true,
      error: "",
      reports: [],
    });

    try {
      const response = await API.get(`/memos/${memo.id}/progress-reports`);
      const reports = response?.data?.data || [];

      setReportState({
        memoId: memo.id,
        loading: false,
        error: "",
        reports: Array.isArray(reports) ? reports : [],
      });
    } catch (err) {
      setReportState({
        memoId: memo.id,
        loading: false,
        error: err?.response?.data?.message || "Failed to load progress reports.",
        reports: [],
      });
    }
  };

  const executiveMatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];

    return memos
      .filter((memo) => getCommandSearchText(memo).includes(term))
      .slice(0, 5);
  }, [memos, search]);

  const loadExecutiveProjectDetail = async (memo) => {
    setExecutiveProject({
      memoId: memo.id,
      loading: true,
      error: "",
      memo: null,
      reports: [],
    });

    try {
      const [memoResponse, reportsResponse] = await Promise.all([
        API.get(`/memos/${memo.id}`),
        API.get(`/memos/${memo.id}/progress-reports`),
      ]);

      setExecutiveProject({
        memoId: memo.id,
        loading: false,
        error: "",
        memo: memoResponse?.data?.data || null,
        reports: reportsResponse?.data?.data || [],
      });
    } catch (err) {
      setExecutiveProject({
        memoId: memo.id,
        loading: false,
        error: err?.response?.data?.message || "Failed to load project history.",
        memo: null,
        reports: [],
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStateFilter("");
    setLocationFilter("");
    setBeneficiaryFilter("");
    setStartDate("");
    setEndDate("");
    setSortMode("date_desc");
  };

  const applyView = () => {
    setActiveAnchor("command-results");
    document.getElementById("command-results")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return <LoadingBox message="Loading CAS intelligence dashboard..." />;
  }

  if (error) {
    return <ErrorBox message={error} />;
  }

  return (
    <div
      className={`cas-dashboard max-w-full overflow-x-hidden ${projectorMode ? "cas-projector space-y-8" : "space-y-5"} print:bg-white`}
    >
      {!projectorMode && <BackButton fallback="/memos" />}
      <section
        className={`cas-hero rounded-2xl border p-5 shadow-sm print:shadow-none sm:p-6 ${
          projectorMode
            ? "border-slate-700 bg-slate-950 text-white shadow-xl"
            : "border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-sky-50/60 shadow-md shadow-slate-900/8"
        }`}
      >
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-wider ${
                projectorMode ? "text-slate-300" : "text-slate-500"
              }`}
            >
              CAS Executive Analytics
            </p>
            <h1
              className={`mt-2 font-black leading-tight ${
                projectorMode
                  ? "text-3xl text-white sm:text-4xl"
                  : "text-2xl text-slate-950 sm:text-3xl"
              }`}
            >
              {title}
            </h1>
            <p
              className={`mt-2 max-w-4xl text-sm leading-6 ${
                projectorMode ? "text-slate-200" : "text-slate-500"
              }`}
            >
              {subtitle}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wide">
              <span className={projectorMode ? "rounded-full border border-slate-600 px-3 py-1 text-slate-200" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"}>
                {filteredMemos.length} filtered records
              </span>
              <span className={projectorMode ? "rounded-full border border-slate-600 px-3 py-1 text-slate-200" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"}>
                {activeWorkflow === "HEAVY_WORKFLOW" ? "Heavy workflow scope" : "Light workflow scope"}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end print:hidden">
            {!lockProjectorMode && (
              <button
                type="button"
                onClick={() => navigate("/projector")}
                className={`inline-flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  projectorMode
                    ? "border-cyan-300 bg-cyan-300 text-slate-950"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-900 hover:bg-slate-50"
                }`}
                aria-pressed={projectorMode}
              >
                <span>Executive Projector Mode</span>
                <span
                  className={`relative h-5 w-10 rounded-full transition ${
                    projectorMode ? "bg-slate-950" : "bg-slate-300"
                  }`}
                  aria-hidden="true"
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                      projectorMode ? "left-5" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setBriefingMode((value) => !value)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                briefingMode
                  ? "bg-red-700 text-white"
                  : "bg-slate-100 text-slate-800 hover:bg-slate-200"
              }`}
            >
              {briefingMode ? "Briefing Redaction Active" : "Briefing Redaction"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:bg-slate-50"
            >
              Print / PDF
            </button>
          </div>
        </div>

        {briefingMode && (
          <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 print:border-black print:bg-white print:text-black">
            Briefing redaction active. Beneficiary names and sensitive drilldown labels are redacted for display.
          </div>
        )}
      </section>

      <nav className="cas-command-tabs print:hidden" aria-label="CAS dashboard sections">
        <ShortcutLink href="#executive-metrics" icon="EM" label="Executive Metrics" subtitle="Command health" active={activeAnchor === "executive-metrics"} onClick={() => setActiveAnchor("executive-metrics")} />
        <ShortcutLink href="#financial-summary" icon="FS" label="Statistical Financial Summary" subtitle="Funds position" active={activeAnchor === "financial-summary"} onClick={() => setActiveAnchor("financial-summary")} />
        <ShortcutLink href="#operational-intelligence" icon="OI" label="Operational Intelligence" subtitle="Workflow, expense, beneficiary" active={activeAnchor === "operational-intelligence"} onClick={() => setActiveAnchor("operational-intelligence")} />
      </nav>

      <SectionCard
        title="Executive Project Search"
        subtitle="Command lookup with real memo finance, progress, release, and validation fields."
        className="cas-section-card"
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071f3f] text-xs font-black text-white">
              QS
            </div>
            <div className="min-w-0 flex-1">
              <SearchBox
                value={search}
                onChange={setSearch}
                className="cas-command-search md:w-full"
                placeholder="Search any project here"
              />
              <p className="mt-2 text-xs font-medium text-slate-500">
                Searches memo reference, heading, beneficiary name, branch/unit, location, workflow, status, and recorded currency fields.
              </p>
            </div>
          </div>
        </div>

        {executiveMatches.length > 0 && (
          <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {executiveMatches.map((memo) => (
              <div
                key={memo.id}
                className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold text-slate-900">
                    {getMemoReference(memo)} - {getMemoTitle(memo)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {memo.lifecycle_stage || memo.business_status || "N/A"} | {formatMoney(memo.amount, memo.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loadExecutiveProjectDetail(memo)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-900"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {executiveProject.memoId && (
          <ExecutiveProjectHistory state={executiveProject} />
        )}
      </SectionCard>

      <SectionCard
        title="Heavy vs Light Workflow Split"
        subtitle="Operational projects and controlled approvals are separated before executive interpretation."
        className="cas-section-card"
      >
        <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
          Analytics scoped to {activeWorkflow === "HEAVY_WORKFLOW" ? "Heavy Operations" : "Light / Controlled"}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
          {WORKFLOW_OPTIONS.map((option) => {
            const active = activeWorkflow === option.key;

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setActiveWorkflow(option.key)}
                className={`workflow-command-tab rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-[#071f3f] bg-[#071f3f] text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black uppercase tracking-wide">
                    {option.label}
                  </p>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {workflowSummary.find((row) => row.key === option.key)?.count || 0}
                  </span>
                </div>
                <p className={`mt-1 text-xs ${active ? "text-slate-200" : "text-slate-500"}`}>
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <DashboardKpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="financial-summary"
        title="Financial Intelligence"
        subtitle="Finance totals use the same active workflow and filters as the KPI, chart, ranking, and table views."
        className="cas-section-card"
      >
        <div className="mb-5 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <FinanceCard label="Total Memo Count" value={financeSummary.totalMemoCount} />
          <FinanceCard label="Total Funds Requested" value={financeSummary.totalRequested} valueType="currency" />
          <FinanceCard label="Total Funds Released" value={financeSummary.totalReleased} valueType="currency" />
          <FinanceCard label="Total Funds Pending" value={financeSummary.totalPending} valueType="currency" />
          <div className="cas-kpi-card min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total Rejected Memos
            </p>
            <p className="mt-2 min-w-0 overflow-hidden break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              {financeSummary.rejectedCount}
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

        {showRejectedDetails && (
          <RejectedMemoList memos={rejectedFinanceMemos} />
        )}
      </SectionCard>

      <SectionCard
        id="executive-metrics"
        title="Operational Tracking"
        subtitle="Real memo fields only; defaulting counts wait for backend due-date fields."
        className="cas-section-card"
      >
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {executiveMetrics.map((metric) => (
            <DashboardKpiCard key={metric.label} kpi={{ ...metric, tone: "slate" }} />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowTrackedProjects((value) => !value)}
          className="mt-5 rounded-lg bg-[#071f3f] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
        >
          Projects Being Tracked
        </button>
      </SectionCard>

      <SectionCard
        title="Trackers and Validators"
        subtitle="Every filter below drives the KPIs, charts, rankings, and command table."
        className="cas-section-card"
      >
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-4">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search reference, heading, beneficiary, branch, state, location, currency, category, workflow, or status..."
              className="cas-command-search md:w-full"
            />
          </div>

          <Field label="Start Date">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="cas-filter-input mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            />
          </Field>

          <Field label="End Date">
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="cas-filter-input mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            />
          </Field>

          <Field label="State">
            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
              className="cas-filter-input mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="">
                {stateOptions.length
                  ? "All states"
                  : "State field requires backend data"}
              </option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Location">
            <input
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              placeholder="Search location text"
              className="cas-filter-input mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            />
          </Field>

          <Field label="Beneficiary" className="lg:col-span-2">
            <input
              value={beneficiaryFilter}
              onChange={(event) => setBeneficiaryFilter(event.target.value)}
              placeholder="Search beneficiary name"
              className="cas-filter-input mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            />
          </Field>

          <Field label="Sort Group">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value)}
              className="cas-filter-input mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="date_desc">Date range / newest</option>
              <option value="date_asc">Date range / oldest</option>
              <option value="branch">Branch</option>
              <option value="currency">Currency</option>
            </select>
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 lg:col-span-2">
            <p className="text-sm font-semibold text-slate-800">
              {visibleMemos.length} {activeWorkflow === "HEAVY_WORKFLOW" ? "heavy" : "light"} memo{visibleMemos.length === 1 ? "" : "s"} in view
            </p>
            <p className="mt-1 text-xs text-slate-500">
              State and location values are backend-driven. No fake geographic dataset is generated.
            </p>
          </div>

          <div className="cas-filter-actions flex flex-col gap-2 sm:flex-row lg:col-span-2 lg:items-end lg:justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-50"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={applyView}
              className="rounded-lg bg-[#071f3f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
            >
              Apply view
            </button>
          </div>
        </div>
      </SectionCard>

      <section id="operational-intelligence" className="space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Operational Intelligence</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Workflow, Expense, Beneficiary and Branch Intelligence</h2>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          id="currency-expenses"
          title="Financial Intelligence by Currency"
          subtitle="Recorded totals and memo counts by stored currency. No exchange conversion is applied."
          className="cas-section-card"
        >
          <div className="space-y-3">
            {currencySummary.map((item) => (
              <CurrencyExposureRow
                key={item.currency}
                currency={item.currency}
                amount={item.total}
                count={item.count}
                percent={percentageOfMax(
                  item.total,
                  currencySummary.map((currency) => currency.total)
                )}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Workflow Type Split"
          subtitle="Filtered heavy and light counts before active workflow focus is applied."
          className="cas-section-card"
        >
          <WorkflowSplitBar
            rows={workflowSummary}
            activeWorkflow={activeWorkflow}
          />
        </SectionCard>

        <SectionCard
          id="state-expenses"
          title="Geographic Intelligence by State"
          subtitle="Ranked state distribution from real backend fields only."
          className="cas-section-card"
        >
          <RankedInsightList
            rows={stateSummary}
            emptyTitle="No records available for current filters."
          />
        </SectionCard>

        <SectionCard
          title="Geographic Intelligence by Location"
          subtitle="Operational location density from memo location text."
          className="cas-section-card"
        >
          <RankedInsightList
            rows={locationSummary}
            emptyTitle="No records available for current filters."
          />
        </SectionCard>

        <SectionCard
          id="zone-expenses"
          title="Geographic Intelligence by Zone"
          subtitle="Derived from stored memo geopolitical zone field only."
          className="cas-section-card"
        >
          <RankedInsightList
            rows={geopoliticalZoneSummary}
            emptyTitle="No records available for current filters."
          />
        </SectionCard>

        <SectionCard
          title="Beneficiary Intelligence"
          subtitle="Beneficiary exposure by project count, completion efficiency, stalled work, and recorded amount."
          className="cas-section-card"
        >
          <ExposureList
            rows={beneficiarySummary}
            emptyTitle="No beneficiary values found."
            briefingMode={briefingMode}
          />
        </SectionCard>

        </div>
      </section>

      {showCasAdminPanel && <CasAdminPanel />}

      {showTrackedProjects && (
        <SectionCard
          title="Operational Tracking Queue"
          subtitle="Active heavy workflow projects with submitted progress report history."
          className="cas-section-card"
        >
          {trackedProjects.length === 0 ? (
            <EmptyState
              title="No tracked projects in view."
              message="Use the Heavy Operations workflow view or adjust filters."
              className="shadow-none"
            />
          ) : (
            <div className="space-y-4">
              {trackedProjects.map((memo) => (
                <div
                  key={memo.id}
                  className="border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {getMemoTitle(memo)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {getMemoReference(memo)} | Progress {safeNumber(memo.progress_percent)}% | {getReportCycleText(memo)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadProgressReports(memo)}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-900"
                    >
                      Progress Report
                    </button>
                  </div>

                  {reportState.memoId === memo.id && (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      {reportState.loading ? (
                        <p className="text-sm text-slate-500">Loading progress reports...</p>
                      ) : reportState.error ? (
                        <ErrorBox message={reportState.error} />
                      ) : reportState.reports.length === 0 ? (
                        <p className="text-sm text-slate-500">No progress reports submitted so far.</p>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-800">
                            Next 30-day report: {getReportsDueText(reportState.reports)}
                          </p>
                          {reportState.reports.map((report) => (
                            <div
                              key={report.id}
                              className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                            >
                              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                <p className="font-semibold text-slate-900">
                                  {safeNumber(report.progress_percent)}% on {formatDate(report.report_date)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {report.reported_by_name || "Tracker"}
                                </p>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-slate-700">
                                {report.status_note || "No narrative provided."}
                              </p>
                              {report.evidence_url && (
                                <a
                                  href={report.evidence_url}
                                  className="mt-2 inline-block text-xs font-semibold text-blue-700"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Evidence
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard
        id="command-results"
        title="Command Search Results"
        subtitle="Filtered memo intelligence view."
        className="cas-section-card"
      >
        {visibleMemos.length === 0 ? (
          <EmptyState
            title="No matching memos."
            message="Adjust command search, workflow view, date range, or filters."
            className="shadow-none"
          />
        ) : (
          <CommandTable
            memos={sortedVisibleMemos}
            briefingMode={briefingMode}
          />
        )}
      </SectionCard>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function ShortcutLink({ href, icon, label, subtitle, active, onClick }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex min-w-[10rem] shrink-0 items-center gap-3 rounded-2xl border px-3 py-3 text-left transition sm:min-w-[11rem] ${
        active
          ? "border-[#071f3f] bg-[#071f3f] text-white shadow-lg shadow-slate-900/10"
          : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black ${
        active ? "bg-white text-[#071f3f]" : "bg-slate-900 text-white"
      }`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{label}</span>
        {subtitle && (
          <span className={`mt-0.5 block truncate text-[11px] font-semibold ${
            active ? "text-slate-200" : "text-slate-500"
          }`}>
            {subtitle}
          </span>
        )}
      </span>
    </a>
  );
}

function DashboardKpiCard({ kpi }) {
  return (
    <div className={`cas-kpi-card cas-kpi-card-${kpi.tone || "slate"} min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 print:break-inside-avoid`}>
      <div className="flex items-start justify-between gap-3">
        <p className="break-words text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {kpi.label}
        </p>
        <span className="cas-kpi-accent" aria-hidden="true" />
      </div>
      <div className="mt-3 min-w-0">
        {kpi.valueType === "unavailable" ? (
          <UnavailableMetric
            title={kpi.unavailableTitle || "Awaiting backend field"}
            note={kpi.note}
          />
        ) : kpi.valueType === "currency" ? (
          <CurrencyStack totals={kpi.value} />
        ) : (
          <p className="min-w-0 overflow-hidden break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            {kpi.value}
          </p>
        )}
      </div>
      <p className="mt-3 line-clamp-2 break-words text-[11px] leading-snug text-slate-500">
        {kpi.note}
      </p>
    </div>
  );
}

function UnavailableMetric({ title, note }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2">
      <p className="text-sm font-black leading-snug text-slate-800">
        {title}
      </p>
      <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500">
        {note}
      </p>
    </div>
  );
}

function CasAdminPanel() {
  const { units } = useOrganizationalUnits("");
  const [auditRows, setAuditRows] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [userForm, setUserForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "VIEWER",
    branch_dru: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const branches = units.filter((unit) => unit.unit_type === "HQ_BRANCH");
  const directOffices = units.filter((unit) => unit.unit_type === "DIRECT_TO_CAS_OFFICE");

  const loadAudit = async () => {
    setLoadingAudit(true);
    setError("");

    try {
      const response = await API.get("/dashboard/recent-activity");
      setAuditRows(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load audit trail.");
    } finally {
      setLoadingAudit(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await API.post("/users", {
        ...userForm,
        branch_dru: userForm.branch_dru || null,
      });
      setMessage("User created.");
      setUserForm({
        full_name: "",
        username: "",
        password: "",
        role: "VIEWER",
        branch_dru: "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create user.");
    }
  };

  const updateUserForm = (event) => {
    const { name, value } = event.target;
    setUserForm((current) => ({ ...current, [name]: value }));
  };

  return (
    <SectionCard
      title="CAS Administration"
      subtitle="Audit visibility, user creation, and organizational unit reference for HQ branches and Direct-to-CAS offices."
    >
      <ErrorBox message={error} className="mb-4" />
      {message && <div className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">{message}</div>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <form onSubmit={createUser} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="font-bold text-slate-900">Create User</p>
          <input name="full_name" value={userForm.full_name} onChange={updateUserForm} required placeholder="Full name" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <input name="username" value={userForm.username} onChange={updateUserForm} required placeholder="Username" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <input name="password" value={userForm.password} onChange={updateUserForm} required type="password" placeholder="Password" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select name="role" value={userForm.role} onChange={updateUserForm} className="rounded-lg border border-slate-300 px-3 py-2">
              {["VIEWER", "CAS", "CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "SUPER_ADMIN"].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select name="branch_dru" value={userForm.branch_dru} onChange={updateUserForm} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">No unit</option>
              {[...branches, ...directOffices].map((unit) => (
                <option key={unit.code} value={unit.code}>{unit.code} - {unit.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Create User
          </button>
        </form>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-slate-900">Audit Trail</p>
            <button type="button" onClick={loadAudit} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold">
              {loadingAudit ? "Loading..." : "Load Audit"}
            </button>
          </div>
          {auditRows.length === 0 ? (
            <p className="text-sm text-slate-500">No audit rows loaded.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {auditRows.slice(0, 10).map((row) => (
                <div key={row.id} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-900">{row.action}</p>
                  <p className="text-xs text-slate-500">{row.user_name || row.username || "System"} | {formatDate(row.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <UnitList title="HQ Branches" units={branches} />
        <UnitList title="Direct-to-CAS Offices" units={directOffices} />
      </div>
    </SectionCard>
  );
}

function UnitList({ title, units }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="font-bold text-slate-900">{title}</p>
      {units.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No active units found.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {units.map((unit) => (
            <div key={unit.code} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm">
              <p className="font-semibold text-slate-900">{unit.code}</p>
              <p className="text-xs text-slate-500">{unit.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanceCard({ label, value, valueType = "text" }) {
  return (
    <div className="cas-kpi-card min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 print:break-inside-avoid">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-3 min-w-0">
        {valueType === "currency" ? (
          <CurrencyStack totals={value} compact />
        ) : (
          <p className="min-w-0 overflow-hidden break-words text-2xl font-black leading-tight text-slate-950">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}

function CurrencyStack({ totals = {}, compact = false }) {
  const rows = CURRENCIES.map((currency) => ({
    currency,
    total: safeNumber(totals[currency]),
  })).filter((item) => item.total > 0);

  if (!rows.length) {
    return (
      <p className="text-sm font-semibold text-slate-500">
        No recorded amount
      </p>
    );
  }

  return (
    <div className={`currency-stack ${compact ? "currency-stack-compact" : ""}`}>
      {rows.map((item) => (
        <div key={item.currency} className="currency-row">
          <span className="currency-pill">{item.currency}</span>
          <span className="currency-value">
            {formatCurrencyAmount(item.total)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CurrencyExposureRow({ currency, amount, count, percent }) {
  return (
    <div className="currency-exposure-row print:break-inside-avoid">
      <div className="flex min-w-0 items-center gap-3">
        <span className="currency-pill">{currency}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-black text-slate-900">
              {currency} exposure
            </p>
            <span className="shrink-0 text-xs font-semibold text-slate-500">
              {count} memo{count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-2.5 rounded-full bg-[#071f3f]"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>
      <span className="currency-exposure-value">
        {formatCurrencyAmount(amount)}
      </span>
    </div>
  );
}

function WorkflowSplitBar({ rows, activeWorkflow }) {
  if (!rows.some((row) => row.count > 0)) {
    return (
      <EmptyState
        title="No records available for current filters."
        message="No workflow records match the current command view."
        className="shadow-none"
      />
    );
  }

  const total = rows.reduce((sum, row) => sum + safeNumber(row.count), 0);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <div className="flex h-4">
          {rows.map((row) => {
            const percent = total > 0 ? (safeNumber(row.count) / total) * 100 : 0;
            const heavy = row.key === "HEAVY_WORKFLOW";

            return (
              <div
                key={row.key}
                className={heavy ? "bg-[#071f3f]" : "bg-teal-600"}
                style={{ width: `${Math.max(percent, row.count > 0 ? 4 : 0)}%` }}
                title={`${row.label}: ${row.count}`}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const active = row.key === activeWorkflow;
          const heavy = row.key === "HEAVY_WORKFLOW";

          return (
            <div
              key={row.key}
              className={`rounded-2xl border p-4 print:break-inside-avoid ${
                active
                  ? "border-[#071f3f] bg-slate-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    {row.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {heavy ? "Operational projects" : "Controlled approvals"}
                  </p>
                </div>
                <span className="text-2xl font-black text-slate-950">
                  {row.count}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={heavy ? "h-2 rounded-full bg-[#071f3f]" : "h-2 rounded-full bg-teal-600"}
                  style={{ width: `${total > 0 ? Math.max(4, Math.round((row.count / total) * 100)) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankedInsightList({ rows, emptyTitle }) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        message="No records available for current filters."
        className="shadow-none"
      />
    );
  }

  const counts = rows.map((row) => row.count);

  return (
    <div className="ranked-insight-list">
      {rows.map((row, index) => (
        <RankedInsightRow
          key={row.label}
          row={row}
          rank={index + 1}
          percent={percentageOfMax(row.count, counts)}
        />
      ))}
    </div>
  );
}

function RankedInsightRow({ row, rank, percent }) {
  return (
    <div className="ranked-insight-row print:break-inside-avoid">
      <span className="rank-badge">{rank}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-black text-slate-900" title={row.label}>
            {row.label}
          </p>
          <span className="shrink-0 text-xs font-bold text-slate-500">
            {row.count} memo{row.count === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-2.5 rounded-full bg-teal-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 truncate text-xs font-semibold text-slate-500">
          {row.heavyCount} heavy | {row.lightCount} light | {row.stalledCount} stalled
        </p>
      </div>
    </div>
  );
}

function RiskBadge({ stalledCount }) {
  if (stalledCount > 1) {
    return (
      <span className="risk-badge risk-badge-stalled">
        Stalled
      </span>
    );
  }

  if (stalledCount === 1) {
    return (
      <span className="risk-badge risk-badge-watch">
        Watchlist
      </span>
    );
  }

  return (
    <span className="risk-badge risk-badge-clear">
      Clear Risk
    </span>
  );
}

function WorkflowBadge({ workflow }) {
  const heavy = workflow === "HEAVY_WORKFLOW";

  return (
    <span className={`workflow-badge ${heavy ? "workflow-badge-heavy" : "workflow-badge-light"}`}>
      {heavy ? "Heavy" : "Light"}
    </span>
  );
}

function CommandTable({ memos, briefingMode }) {
  return (
    <div>
      <div className="command-table-wrap">
        <table className="command-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Heading</th>
              <th>Beneficiary</th>
              <th>Branch / DRU</th>
              <th>State</th>
              <th>Location</th>
              <th>Currency</th>
              <th>Workflow</th>
              <th>Status</th>
              <th>Validation Event</th>
            </tr>
          </thead>

          <tbody>
            {memos.slice(0, 50).map((memo, index) => (
              <tr key={memo.id} className={index % 2 === 0 ? "command-row-even" : ""}>
                <td>
                  <span className="command-ref">{getMemoReference(memo)}</span>
                </td>
                <td>
                  <span className="command-title" title={getMemoTitle(memo)}>
                    {getMemoTitle(memo)}
                  </span>
                </td>
                <td>
                  <span className="command-muted" title={getMemoBeneficiary(memo)}>
                    {briefingMode ? "[REDACTED]" : getMemoBeneficiary(memo)}
                  </span>
                </td>
                <td>
                  <span className="command-branch" title={getMemoBranchLabel(memo)}>
                    {getMemoBranchLabel(memo)}
                  </span>
                </td>
                <td>{getMemoState(memo) || "N/A"}</td>
                <td>
                  <span className="command-branch" title={getMemoLocation(memo) || "N/A"}>
                    {getMemoLocation(memo) || "N/A"}
                  </span>
                </td>
                <td>
                  <span className="currency-pill">{normalizeCurrency(memo.currency)}</span>
                </td>
                <td>
                  <WorkflowBadge workflow={getMemoWorkflowType(memo)} />
                </td>
                <td>
                  <StatusBadge status={getMemoStatus(memo)} />
                </td>
                <td>
                  <span className="command-muted">
                    {getValidationEvent(memo) || "N/A"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {memos.length > 50 && (
        <p className="mt-3 text-xs font-semibold text-slate-500">
          Showing first 50 matching records. Use filters to narrow results.
        </p>
      )}
    </div>
  );
}

function RejectedMemoList({ memos }) {
  if (!memos.length) {
    return (
      <p className="mt-4 text-sm text-slate-500">
        No rejected memos in this date range.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      {memos.map((memo) => (
        <div
          key={memo.id}
          className="border border-red-100 bg-red-50 p-3 text-sm"
        >
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

function ExecutiveProjectHistory({ state }) {
  if (state.loading) {
    return <p className="mt-4 text-sm text-slate-500">Loading project history...</p>;
  }

  if (state.error) {
    return <ErrorBox message={state.error} />;
  }

  if (!state.memo) return null;

  const memo = state.memo;
  const reports = Array.isArray(state.reports) ? state.reports : [];
  const releaseHistory = Array.isArray(memo.release_history) ? memo.release_history : [];

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-500">
            {getMemoReference(memo)}
          </p>
          <h3 className="mt-1 break-words text-lg font-black text-slate-950">
            {getMemoTitle(memo)}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Created: {formatDate(memo.created_at)}
          </p>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Progress</span>
              <span>{safeNumber(memo.progress_percent)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-3 bg-[#071f3f]"
                style={{ width: `${Math.min(100, Math.max(0, safeNumber(memo.progress_percent)))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm">
          <HistoryMetric label="Requested" value={formatMoney(memo.amount, memo.currency)} />
          <HistoryMetric label="Released" value={formatMoney(memo.total_released_amount, memo.currency)} />
          <HistoryMetric label="Pending" value={formatMoney(memo.remaining_balance, memo.currency)} />
          <HistoryMetric label="Validation" value={getValidationEvent(memo) || "Validation history requires backend support."} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <HistoryList
          title="Release History"
          empty="No release history available."
          rows={releaseHistory.map((release) => ({
            id: release.id,
            title: `${release.decision_type} - ${formatMoney(release.released_amount, memo.currency)}`,
            meta: formatDate(release.released_at || release.created_at),
            body: release.remarks || release.rejection_reason || "",
          }))}
        />

        <HistoryList
          title="Progress Reports"
          empty="No progress reports submitted."
          rows={reports.map((report) => ({
            id: report.id,
            title: `${safeNumber(report.progress_percent)}% - ${formatDate(report.report_date)}`,
            meta: report.reported_by_name || "Tracker",
            body: report.status_note || "",
          }))}
        />
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500">
        Validation history requires backend support.
      </p>
    </div>
  );
}

function HistoryMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function HistoryList({ title, empty, rows }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-sm font-bold text-slate-900">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm font-semibold text-slate-900">{row.title}</p>
              <p className="text-xs text-slate-500">{row.meta}</p>
              {row.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{row.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExposureList({ rows, emptyTitle, briefingMode }) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        message="No records available for current filters."
        className="shadow-none"
      />
    );
  }

  return (
    <div className="beneficiary-leaderboard">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className="beneficiary-row print:break-inside-avoid"
        >
          <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3">
            <span className="rank-badge">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-900" title={row.label}>
                {briefingMode ? "[REDACTED]" : row.label}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                {row.count} project{row.count === 1 ? "" : "s"} | {row.completedCount} complete | {row.stalledCount} stalled | {row.efficiency}% efficiency
              </p>
            </div>
          </div>
          <div className="beneficiary-finance">
            <CurrencyStack totals={row.totalsByCurrency} compact />
            <RiskBadge stalledCount={row.stalledCount} />
          </div>
        </div>
      ))}
    </div>
  );
}

function normalizeCurrency(value) {
  const currency = String(value || "NGN").toUpperCase();

  if (["NGN", "USD", "EUR", "GBP"].includes(currency)) {
    return currency;
  }

  return "OTHERS";
}

function getMemoState(memo) {
  return (
    memo?.state ||
    memo?.project_state ||
    memo?.location_state ||
    memo?.delivery_state ||
    ""
  );
}

function getMemoLocation(memo) {
  return (
    memo?.location ||
    memo?.project_location ||
    memo?.site_location ||
    memo?.delivery_location ||
    ""
  );
}

function getMemoGeopoliticalZone(memo) {
  return memo?.geopolitical_zone || "";
}

function getMemoBeneficiary(memo) {
  return memo?.beneficiary_name || "N/A";
}

function getMemoBranchLabel(memo) {
  return getOrganizationLabelFromMemo(memo, "branch_dru", "branch_dru_name", []);
}

function getMemoDate(memo) {
  return memo?.created_at || memo?.updated_at || memo?.approved_at || "";
}

function getValidationEvent(memo) {
  const progress = Number(memo?.progress_percent ?? 0);
  const lifecycle = String(memo?.lifecycle_stage || "").toUpperCase();
  const status = String(memo?.validation_status || memo?.approval_status || memo?.business_status || "").toUpperCase();

  if (status === "VALIDATED" || lifecycle === "VALIDATED") {
    return "Validation approved";
  }

  if (progress >= 100 && (status === "COMPLETED" || lifecycle === "COMPLETED")) {
    return "Validation approved";
  }

  if (status === "REJECTED" || status === "VALIDATION_REJECTED" || lifecycle === "REJECTED") {
    return "Validation rejected";
  }

  if (progress >= 100 && lifecycle === "AWAITING_VALIDATION") {
    return "Awaiting validation";
  }

  if (progress >= 100) {
    return "Tracker submitted 100%";
  }

  return "";
}

function getCommandSearchText(memo) {
  return [
    getMemoReference(memo),
    getMemoTitle(memo),
    memo?.description,
    memo?.beneficiary_name,
    memo?.branch_dru,
    getMemoState(memo),
    getMemoLocation(memo),
    memo?.geopolitical_zone,
    memo?.currency,
    memo?.amount,
    memo?.category,
    getMemoWorkflowType(memo),
    getMemoStatus(memo),
    memo?.lifecycle_stage,
    memo?.business_status,
    memo?.approval_status,
    memo?.fund_release_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isOngoingMemo(memo) {
  const lifecycle = String(memo?.lifecycle_stage || "").toUpperCase();
  const business = String(memo?.business_status || "").toUpperCase();

  return (
    getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" &&
    !memo?.is_completed &&
    !["COMPLETED", "ARCHIVED"].includes(lifecycle) &&
    !["COMPLETED", "ARCHIVED"].includes(business)
  );
}

function isTrackedProject(memo) {
  const lifecycle = String(memo?.lifecycle_stage || "").toUpperCase();

  return (
    getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" &&
    Boolean(memo?.primary_monitor_branch) &&
    !memo?.is_completed &&
    [
      "ASSIGNED",
      "COMMENCED",
      "IN_PROGRESS",
      "VALIDATION_REJECTED",
      "AWAITING_VALIDATION",
      "FUNDS_RELEASED",
    ].includes(lifecycle)
  );
}

function isValidationApproved(memo) {
  const event = getValidationEvent(memo);
  return event === "Validation approved";
}

function isValidationRejected(memo) {
  const event = getValidationEvent(memo);
  const business = String(memo?.business_status || "").toUpperCase();
  return event === "Validation rejected" || business === "VALIDATION_REJECTED";
}

function getReportCycleText(memo) {
  const dueDate = memo?.next_report_due_date || memo?.nextReportDueDate;

  if (!dueDate) {
    return "requires backend due-date field";
  }

  return `${formatDate(dueDate)} - ${getCountdownText(dueDate)}`;
}

function getReportsDueText(reports = []) {
  const latest = [...reports]
    .filter((report) => report.report_date)
    .sort((a, b) => Date.parse(b.report_date) - Date.parse(a.report_date))[0];

  if (!latest) {
    return "requires backend report history endpoint";
  }

  const latestDate = new Date(`${String(latest.report_date).slice(0, 10)}T00:00:00Z`);
  latestDate.setUTCDate(latestDate.getUTCDate() + 30);

  return `${formatDate(latestDate.toISOString())} - ${getCountdownText(latestDate.toISOString())}`;
}

function getCountdownText(dateValue) {
  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return "N/A";

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  if (diffDays === 0) return "due today";
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
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

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value)))].sort();
}

function groupDistribution(items, getLabel) {
  const map = new Map();

  items.forEach((item) => {
    const label = getLabel(item) || "";
    if (!label) return;

    const row = map.get(label) || {
      label,
      count: 0,
      heavyCount: 0,
      lightCount: 0,
      stalledCount: 0,
    };

    row.count += 1;

    if (getMemoWorkflowType(item) === "HEAVY_WORKFLOW") {
      row.heavyCount += 1;
    } else {
      row.lightCount += 1;
    }

    if (isStalledMemo(item)) {
      row.stalledCount += 1;
    }

    map.set(label, row);
  });

  return [...map.values()].sort(
    (a, b) => b.count - a.count || b.stalledCount - a.stalledCount
  );
}

function groupExposure(items, getLabel) {
  const map = new Map();

  items.forEach((item) => {
    const label = getLabel(item) || "";
    if (!label || label === "N/A") return;

    const row = map.get(label) || {
      label,
      count: 0,
      completedCount: 0,
      stalledCount: 0,
      totalsByCurrency: {},
    };

    const currency = normalizeCurrency(item.currency);
    row.count += 1;
    row.completedCount += isCompletedMemo(item) ? 1 : 0;
    row.stalledCount += isStalledMemo(item) ? 1 : 0;
    row.totalsByCurrency[currency] =
      (row.totalsByCurrency[currency] || 0) + safeNumber(getMemoAmount(item));

    map.set(label, row);
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      efficiency: row.count
        ? Math.round((row.completedCount / row.count) * 100)
        : 0,
      sortScore: Math.max(0, ...Object.values(row.totalsByCurrency)),
    }))
    .sort((a, b) => b.sortScore - a.sortScore || b.count - a.count);
}

function collectCurrencyTotals(items) {
  return items.reduce((totals, memo) => {
    const currency = normalizeCurrency(memo.currency);

    return {
      ...totals,
      [currency]: (totals[currency] || 0) + safeNumber(getMemoAmount(memo)),
    };
  }, {});
}

function collectReleasedCurrencyTotals(items) {
  return items.reduce((totals, memo) => {
    const currency = normalizeCurrency(memo.currency);

    return {
      ...totals,
      [currency]: (totals[currency] || 0) + safeNumber(memo.total_released_amount),
    };
  }, {});
}

function collectPendingCurrencyTotals(items) {
  return items.reduce((totals, memo) => {
    const currency = normalizeCurrency(memo.currency);
    const remaining = memo.remaining_balance !== undefined
      ? safeNumber(memo.remaining_balance)
      : Math.max(0, safeNumber(memo.amount) - safeNumber(memo.total_released_amount));

    return {
      ...totals,
      [currency]: (totals[currency] || 0) + remaining,
    };
  }, {});
}

function formatCurrencyAmount(amount) {
  return safeNumber(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isCompletedMemo(memo) {
  const lifecycle = String(memo?.lifecycle_stage || "").toUpperCase();

  return lifecycle === "COMPLETED" || memo?.is_completed === true;
}

function isAwaitingValidationMemo(memo) {
  const lifecycle = String(memo?.lifecycle_stage || "").toUpperCase();
  return safeNumber(memo?.progress_percent) >= 100 && lifecycle === "AWAITING_VALIDATION";
}

function isStalledMemo(memo) {
  const state = [
    getMemoStatus(memo),
    memo?.lifecycle_stage,
    memo?.business_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  return (
    memo?.is_stalled === true ||
    state.includes("STALLED") ||
    state.includes("OVERDUE") ||
    state.includes("DELAY")
  );
}

function isFinanceRejectedMemo(memo) {
  const releaseStatus = String(memo?.fund_release_status || "").toUpperCase();
  const decision = String(memo?.latest_release_decision || "").toUpperCase();
  const business = String(memo?.business_status || "").toUpperCase();

  return (
    releaseStatus === "REJECTED" ||
    decision === "REJECTED" ||
    business.includes("REJECTED")
  );
}

function percentageOfMax(value, values) {
  const max = Math.max(...values.map((item) => safeNumber(item)), 0);

  if (max <= 0) return 0;

  return Math.max(4, Math.round((safeNumber(value) / max) * 100));
}

function compareDashboardMemos(a, b, sortMode) {
  if (sortMode === "date_asc") {
    return Date.parse(getMemoDate(a) || "") - Date.parse(getMemoDate(b) || "");
  }

  if (sortMode === "branch") {
    return getMemoBranchLabel(a).localeCompare(getMemoBranchLabel(b));
  }

  if (sortMode === "currency") {
    return normalizeCurrency(a.currency).localeCompare(normalizeCurrency(b.currency));
  }

  return Date.parse(getMemoDate(b) || "") - Date.parse(getMemoDate(a) || "");
}
