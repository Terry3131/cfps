export default function ProjectorModeBanner({
  active = false,
  redacted = false,
  operator = "Operator",
}) {
  if (!active && !redacted) return null;

  return (
    <div className="projector-mode-banner border border-red-700 bg-red-700 px-4 py-3 text-white shadow-sm print:border-black print:bg-white print:text-black">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-widest">
            {active ? "Briefing Mode Active" : "Briefing Safety Active"}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide">
            {redacted ? "Sensitive Data Redacted" : "Sensitive data visible"}
          </p>
        </div>
        <p className="text-xs font-bold uppercase tracking-wide">
          Operator: {operator}
        </p>
      </div>
    </div>
  );
}
