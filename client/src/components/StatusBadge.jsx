export default function StatusBadge({ status }) {
  const value = String(status || "UNKNOWN").toUpperCase();

  const styles = {
    REGISTERED: "border-slate-200 bg-slate-100 text-slate-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    APPROVED: "border-blue-200 bg-blue-50 text-blue-700",
    ASSIGNED: "border-sky-200 bg-sky-50 text-sky-700",

    AWAITING_FUND_RELEASE: "border-amber-200 bg-amber-50 text-amber-700",
    FUNDS_RELEASED: "border-teal-200 bg-teal-50 text-teal-700",
    COMMENCED: "border-indigo-200 bg-indigo-50 text-indigo-700",
    IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-700",
    AWAITING_VALIDATION: "border-violet-200 bg-violet-50 text-violet-700",
    VALIDATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",

    REJECTED: "border-red-200 bg-red-50 text-red-700",
    ARCHIVED: "border-zinc-300 bg-zinc-100 text-zinc-700",
    LOCKED: "border-zinc-300 bg-zinc-100 text-zinc-700",

    FAILED: "border-red-200 bg-red-50 text-red-700",
    CONFLICT: "border-rose-200 bg-rose-50 text-rose-700",
    SYNCED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    QUEUED: "border-yellow-200 bg-yellow-50 text-yellow-700",

    UNKNOWN: "border-slate-200 bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm ${
        styles[value] || styles.UNKNOWN
      }`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
