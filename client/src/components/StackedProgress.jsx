import { safeNumber } from "../utils/format";

export default function StackedProgress({ notStarted, inProgress, completed }) {
  const safeNotStarted = safeNumber(notStarted);
  const safeInProgress = safeNumber(inProgress);
  const safeCompleted = safeNumber(completed);

  const total = safeNotStarted + safeInProgress + safeCompleted;

  const notStartedPercent =
    total > 0 ? Math.round((safeNotStarted / total) * 100) : 0;

  const inProgressPercent =
    total > 0 ? Math.round((safeInProgress / total) * 100) : 0;

  const completedPercent =
    total > 0 ? Math.round((safeCompleted / total) * 100) : 0;

  return (
    <div className="w-full h-7 rounded-lg overflow-hidden bg-slate-200 flex mt-5 text-xs font-semibold text-white">
      <div
        className="bg-slate-400 flex items-center justify-center"
        style={{ width: `${notStartedPercent}%` }}
      >
        {notStartedPercent > 0 ? `${notStartedPercent}% Not Started` : ""}
      </div>

      <div
        className="bg-yellow-500 flex items-center justify-center"
        style={{ width: `${inProgressPercent}%` }}
      >
        {inProgressPercent > 0 ? `${inProgressPercent}% In Progress` : ""}
      </div>

      <div
        className="bg-green-600 flex items-center justify-center"
        style={{ width: `${completedPercent}%` }}
      >
        {completedPercent > 0 ? `${completedPercent}% Completed` : ""}
      </div>
    </div>
  );
}
