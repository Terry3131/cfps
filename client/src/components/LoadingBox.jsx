export default function LoadingBox({ message = "Loading...", className = "" }) {
  return (
    <div
      className={`rounded-3xl border border-slate-200/70 bg-white p-6 text-sm font-semibold text-slate-500 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#071f3f]" />
        {message}
      </div>
    </div>
  );
}
