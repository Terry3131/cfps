import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import SectionCard from "../components/SectionCard";
import useDashboardSummary from "../hooks/useDashboardSummary";
import { safeNumber } from "../utils/format";

export default function DashboardSummary({ title = "Dashboard Summary" }) {
  const { summary, loading, error } = useDashboardSummary();

  if (loading) {
    return <LoadingBox message="Loading dashboard summary..." />;
  }

  if (error) {
    return <ErrorBox message={error} />;
  }

  const workflowTotals = summary.workflow_totals || {};
  const heavy = workflowTotals.HEAVY_WORKFLOW || {};
  const light = workflowTotals.LIGHT_WORKFLOW || {};

  const cards = [
    {
      label: "Total Memos",
      value: safeNumber(summary.total_memos),
      note: "All backend memo records",
    },
    {
      label: "Approved Memos",
      value: safeNumber(summary.approved_memos),
      note: "Approval status approved",
    },
    {
      label: "Released Ledger",
      value: formatPlainNumber(summary.total_released_amount),
      note: "Recorded release amount total",
    },
    {
      label: "Awaiting Validation",
      value: safeNumber(summary.awaiting_validation_memos),
      note: "Current validation queue",
    },
    {
      label: "Completed",
      value: safeNumber(summary.completed_memos),
      note: "Completed lifecycle records",
    },
  ];

  const splitRows = [
    {
      label: "Heavy Workflow",
      count: safeNumber(heavy.total_memos),
      amount: safeNumber(heavy.total_amount),
      released: safeNumber(heavy.total_released_amount),
    },
    {
      label: "Light Workflow",
      count: safeNumber(light.total_memos),
      amount: safeNumber(light.total_amount),
      released: safeNumber(light.total_released_amount),
    },
  ];

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden print:bg-white">
      <section className="min-w-0 rounded-2xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-sky-50/50 p-5 shadow-sm print:shadow-none">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          Backend Summary
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live operational totals from backend memo and release records.
        </p>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 print:break-inside-avoid print:shadow-none"
          >
            <p className="truncate text-xs font-black uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 min-w-0 overflow-hidden break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl xl:text-3xl">
              {card.value}
            </p>
            <p className="mt-3 line-clamp-2 break-words text-xs leading-snug text-slate-500">{card.note}</p>
          </div>
        ))}
      </section>

      <SectionCard
        title="Workflow Type Split"
        subtitle="Heavy operational workflows and light controlled approvals are reported separately."
      >
        <div className="space-y-4">
          {splitRows.map((row) => (
            <div key={row.label} className="print:break-inside-avoid">
              <div className="flex min-w-0 items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800">{row.label}</p>
                  <p className="break-words text-xs text-slate-500">
                    {row.count} memo{row.count === 1 ? "" : "s"} | {formatPlainNumber(row.amount)} recorded | {formatPlainNumber(row.released)} released
                  </p>
                </div>
                <span className="min-w-0 overflow-hidden break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                  {row.count}
                </span>
              </div>
              <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-4 bg-[#071f3f]"
                  style={{
                    width: `${percentageOfMax(row.count, splitRows.map((item) => item.count))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function formatPlainNumber(value) {
  return safeNumber(value).toLocaleString();
}

function percentageOfMax(value, values) {
  const max = Math.max(...values.map((item) => safeNumber(item)), 0);

  if (max <= 0) return 0;

  return Math.max(4, Math.round((safeNumber(value) / max) * 100));
}
