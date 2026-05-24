export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="relative min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white px-5 py-5 shadow-sm shadow-slate-900/5 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#071f3f] via-sky-700 to-emerald-600" />
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
            Command View
          </p>
          <h1 className="mt-1 break-words text-2xl font-black tracking-tight text-slate-950 xl:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        {action && <div className="min-w-0 shrink-0">{action}</div>}
      </div>
    </div>
  );
}
