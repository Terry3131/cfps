import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";
import { formatMoney } from "../utils/format";
import {
  getMemoAmount,
  getMemoReference,
  getMemoStatus,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";
import { getOrganizationLabelFromMemo } from "../utils/organizationalUnits";

export default function MemoTable({
  memos = [],
  actionLabel = "View",
  actionPath,
  renderActions,
  showCategory = true,
  organizationalUnits = [],
}) {
  if (memos.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5">
      <div className="max-h-[38rem] overflow-auto">
        <table className="w-full min-w-[62rem] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100/95 text-slate-600 backdrop-blur">
            <tr>
              <TableHead>Reference</TableHead>
              <TableHead>Heading</TableHead>
              <TableHead>Branch / DRU</TableHead>
              {showCategory && <TableHead>Category</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Workflow</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Action</TableHead>
            </tr>
          </thead>

          <tbody>
            {memos.map((memo) => (
              <tr
                key={memo.id}
                className="border-t border-slate-100 transition hover:bg-sky-50/60"
              >
                <td className="p-3">
                  <span className="inline-flex max-w-40 overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-900">
                    {getMemoReference(memo)}
                  </span>
                </td>

                <td className="max-w-72 p-3 font-semibold text-slate-800">
                  {getMemoTitle(memo)}
                </td>

                <td className="p-3 text-slate-700">
                  {getOrganizationLabelFromMemo(memo, "branch_dru", "branch_dru_name", organizationalUnits)}
                </td>

                {showCategory && (
                  <td className="p-3 text-slate-700">
                    {memo.category || "N/A"}
                  </td>
                )}

                <td className="p-3">
                  <StatusBadge status={getMemoStatus(memo)} />
                </td>

                <td className="p-3 text-slate-700">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" 
                      ? "border border-blue-200 bg-blue-50 text-blue-700" 
                      : "border border-teal-200 bg-teal-50 text-teal-700"
                  }`}>
                    {getMemoWorkflowType(memo) === "HEAVY_WORKFLOW" ? "Heavy" : "Light"}
                  </span>
                </td>

                <td className="p-3 text-slate-700">
                  {formatMoney(getMemoAmount(memo), memo.currency)}
                </td>

                <td className="p-3">
                  {renderActions ? (
                    renderActions(memo)
                  ) : (
                    <ActionButton
                      to={actionPath ? actionPath(memo) : `/memos/${memo.id}`}
                      variant="link"
                    >
                      {actionLabel}
                    </ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHead({ children }) {
  return (
    <th className="whitespace-nowrap p-3 text-left text-[11px] font-black uppercase tracking-wide">
      {children}
    </th>
  );
}
