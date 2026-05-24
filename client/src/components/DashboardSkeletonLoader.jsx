function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}

export default function DashboardSkeletonLoader({ title = "Loading dashboard" }) {
  return (
    <div className="space-y-5">
      <div className="border border-slate-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="h-3 w-40" />
        <SkeletonBlock className="mt-3 h-7 w-80 max-w-full" />
        <SkeletonBlock className="mt-3 h-4 w-[32rem] max-w-full" />
        <span className="sr-only">{title}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="border border-slate-200 bg-white p-4 shadow-sm">
            <SkeletonBlock className="h-9 w-24" />
            <SkeletonBlock className="mt-4 h-3 w-32" />
            <SkeletonBlock className="mt-4 h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
        <div className="space-y-5">
          <SkeletonBlock className="h-72 border border-slate-200 bg-slate-200" />
          <SkeletonBlock className="h-72 border border-slate-200 bg-slate-200" />
        </div>
        <SkeletonBlock className="h-96 border border-slate-200 bg-slate-200" />
      </div>
    </div>
  );
}
