import EmptyState from "./EmptyState";
import ErrorBox from "./ErrorBox";
import LoadingBox from "./LoadingBox";

export default function ChartShell({
  title,
  subtitle,
  loading = false,
  error = "",
  empty = false,
  emptyTitle = "No chart data available.",
  emptyMessage = "Chart data will appear here when available.",
  action,
  children,
  className = "",
  height = "min-h-[260px]",
}) {
  return (
    <section className={`min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex min-w-0 flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
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

          {action && <div className="min-w-0 shrink-0">{action}</div>}
        </div>
      )}

      <div className={`min-w-0 max-w-full p-5 ${height}`}>
        {loading ? (
          <LoadingBox message="Loading chart..." className="shadow-none border border-slate-100" />
        ) : error ? (
          <ErrorBox message={error} />
        ) : empty ? (
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            className="shadow-none border border-dashed border-slate-200"
          />
        ) : (
          children || (
            <div className="h-full min-h-[220px] rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400">
              Chart content will appear here.
            </div>
          )
        )}
      </div>
    </section>
  );
}
