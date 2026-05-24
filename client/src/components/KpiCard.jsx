export default function KpiCard({ label, value, description = "", icon = "" }) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#071f3f] via-sky-700 to-emerald-600 opacity-80" />
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
          {icon || label?.slice(0, 2)?.toUpperCase()}
        </span>
      </div>

      <p className="mt-3 min-w-0 overflow-hidden break-words text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl xl:text-[2rem]">
        {value}
      </p>

      {description && (
        <p className="mt-3 line-clamp-2 break-words text-xs font-medium leading-snug text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}
