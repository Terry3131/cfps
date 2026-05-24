export default function DashboardCard({
  title,
  value,
  subtitle,
  footer,
  children,
  className = "",
}) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow ${className}`}>
      {(title || value || subtitle) && (
        <div className="min-w-0 overflow-hidden">
          {title && (
            <p className="break-words text-sm font-semibold text-slate-600">
              {title}
            </p>
          )}

          {value !== undefined && value !== null && (
            <p className="mt-2 min-w-0 overflow-hidden break-words text-xl font-bold leading-tight text-slate-900 sm:text-2xl xl:text-3xl">
              {value}
            </p>
          )}

          {subtitle && (
            <p className="mt-2 line-clamp-2 break-words text-xs leading-snug text-slate-500">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {children && <div className="mt-4 min-w-0 max-w-full">{children}</div>}

      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </section>
  );
}
