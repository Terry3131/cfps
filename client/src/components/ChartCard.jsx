export default function ChartCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}) {
  return (
    <section className={`bg-white rounded-2xl shadow border border-slate-100 ${className}`}>
      {(title || subtitle || action) && (
        <div className="p-5 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && (
              <h2 className="font-bold text-slate-900">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className="p-5 min-h-[220px]">
        {children || (
          <div className="h-full min-h-[180px] rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
            Chart content will appear here.
          </div>
        )}
      </div>
    </section>
  );
}