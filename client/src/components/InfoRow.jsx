export default function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <span className="mt-1 block break-words font-bold text-slate-950">
        {value ?? "N/A"}
      </span>
    </div>
  );
}
