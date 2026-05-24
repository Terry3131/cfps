import { safeNumber } from "../utils/format";

export default function ProgressBar({ value }) {
  const safeValue = Math.min(100, Math.max(0, Math.round(safeNumber(value))));

  return (
    <div className="mt-3 h-3 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner">
      <div
        className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-sky-700 via-teal-600 to-emerald-500 pr-1 text-[9px] font-black leading-none text-white transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      >
        {safeValue >= 12 ? `${safeValue}%` : ""}
      </div>
    </div>
  );
}
