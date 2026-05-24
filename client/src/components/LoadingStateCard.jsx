export default function LoadingStateCard({
  message = "Loading...",
  className = "",
}) {
  return (
    <div className={`bg-white border border-slate-100 rounded-2xl p-6 text-slate-500 ${className}`}>
      <div className="animate-pulse space-y-3">
        <div className="h-3 bg-slate-200 rounded w-1/3" />
        <div className="h-8 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-full" />
      </div>

      <p className="text-sm mt-4">
        {message}
      </p>
    </div>
  );
}