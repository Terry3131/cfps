import { safeNumber } from "../utils/format";

export default function ProgressCircle({ value = 0, size = 96 }) {
  const safePercent = Math.min(100, Math.max(0, Math.round(safeNumber(value))));

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-slate-900"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#0f172a ${safePercent}%, #e2e8f0 0)`,
      }}
    >
      <div
        className="bg-white rounded-full flex items-center justify-center"
        style={{
          width: size - 18,
          height: size - 18,
        }}
      >
        {safePercent}%
      </div>
    </div>
  );
}
