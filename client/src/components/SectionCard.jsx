export default function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
  id,
}) {
  return (
    <section
      id={id}
      className={`min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5 transition duration-200 hover:shadow-md hover:shadow-slate-900/8 ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="flex min-w-0 items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/80 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {subtitle}
              </p>
            )}
          </div>

          {action && <div className="min-w-0 shrink-0">{action}</div>}
        </div>
      )}

      <div className={`min-w-0 max-w-full ${bodyClassName || "p-5 sm:p-6"}`}>
        {children}
      </div>
    </section>
  );
}
