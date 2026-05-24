export default function EmptyStateCard({
  title = "No data available.",
  message = "Records will appear here when available.",
  action,
  className = "",
}) {
  return (
    <div className={`bg-white border border-dashed border-slate-200 rounded-2xl p-6 text-center ${className}`}>
      <h3 className="font-bold text-slate-800">
        {title}
      </h3>

      {message && (
        <p className="text-sm text-slate-500 mt-2">
          {message}
        </p>
      )}

      {action && (
        <div className="mt-4 flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}