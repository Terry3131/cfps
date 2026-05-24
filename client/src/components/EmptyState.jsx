export default function EmptyState({
  title = "No records found.",
  message = "",
  children,
  className = "",
}) {
  return (
    <div className={`rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 shadow-sm ${className}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-400">
        NIL
      </div>
      <p className="text-base font-bold tracking-tight text-slate-800">{title}</p>

      {message && <p className="mx-auto mt-2 max-w-xl text-sm leading-6">{message}</p>}

      {children}
    </div>
  );
}
