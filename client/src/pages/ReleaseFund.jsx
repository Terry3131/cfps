import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import SectionCard from "../components/SectionCard";
import SelectField from "../components/SelectField";
import TextAreaField from "../components/TextAreaField";
import { formatDate, formatMoney, safeNumber, toNumber } from "../utils/format";
import useFormState from "../hooks/useFormState";
import useMemoDetails from "../hooks/useMemoDetails";

export default function ReleaseFund() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { memo, loading: memoLoading, error: memoError } = useMemoDetails(id);

  const { form, setForm } = useFormState({
    decision_type: "FULL",
    released_amount: "",
    next_payment_date: "",
    rejection_reason: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "decision_type" && value === "REJECTED"
        ? { released_amount: "", next_payment_date: "" }
        : {}),
    }));
  };

  const showAmountField = form.decision_type !== "REJECTED";
  const showNextPaymentDate = form.decision_type === "PARTIAL";
  const approvedAmount = safeNumber(memo?.amount);
  const totalReleasedAmount = safeNumber(memo?.total_released_amount);
  const remainingBalance = safeNumber(
    memo?.remaining_balance,
    Math.max(approvedAmount - totalReleasedAmount, 0)
  );
  const fullyReleasedOrLocked = Boolean(
    memo?.is_locked ||
      memo?.is_completed ||
      ["FUNDS RELEASED", "COMPLETED"].includes(String(memo?.business_status || "").toUpperCase()) ||
      String(memo?.fund_release_status || "").toUpperCase() === "PAID" ||
      remainingBalance <= 0
  );
  const latestNextPaymentDate = memo?.next_payment_date || memo?.next_release_date;
  const nextPaymentCountdown = useMemo(
    () => getCountdownText(latestNextPaymentDate),
    [latestNextPaymentDate]
  );

  useEffect(() => {
    if (form.decision_type === "FULL" && remainingBalance > 0) {
      setForm((prev) => ({
        ...prev,
        released_amount: String(remainingBalance),
        next_payment_date: "",
      }));
    }
  }, [remainingBalance, form.decision_type, setForm]);

  const submitRelease = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (fullyReleasedOrLocked) {
      setError("This memo is already fully released, completed, or locked.");
      setLoading(false);
      return;
    }

    if (showAmountField && toNumber(form.released_amount) <= 0) {
      setError("Released amount must be greater than zero.");
      setLoading(false);
      return;
    }

    if (form.decision_type === "FULL" && toNumber(form.released_amount) !== remainingBalance) {
      setError("Full release amount must equal the remaining balance.");
      setLoading(false);
      return;
    }

    if (form.decision_type === "PARTIAL") {
      const releaseAmount = toNumber(form.released_amount);

      if (releaseAmount > remainingBalance) {
        setError("Partial release amount cannot exceed the remaining balance.");
        setLoading(false);
        return;
      }

      if (releaseAmount < remainingBalance && !form.next_payment_date) {
        setError("Next payment date is required when partial release leaves a balance.");
        setLoading(false);
        return;
      }
    }

    if (form.decision_type === "REJECTED" && !form.rejection_reason.trim()) {
      setError("Rejection reason is required.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        decision_type: form.decision_type,
        remarks: form.remarks,
      };

      if (showAmountField) {
        payload.released_amount = toNumber(form.released_amount);
      }

      if (form.decision_type === "PARTIAL" && form.next_payment_date) {
        payload.next_payment_date = form.next_payment_date;
      }

      if (form.decision_type === "REJECTED") {
        payload.rejection_reason = form.rejection_reason;
      }

      await API.post(`/memos/${id}/release`, payload);

      navigate("/fund-release");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to release fund.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback="/fund-release" />
      <SectionCard
        title="Release Fund"
        subtitle="Record fund release decision for this memo."
        className="max-w-3xl"
      >
      {memoError && <ErrorBox message={memoError} className="mb-5" />}
      <ErrorBox message={error} className="mb-5" />
      {success && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {success}
        </div>
      )}

      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p>
          Approved Amount: <span className="font-semibold text-slate-900">{formatMoney(approvedAmount, memo?.currency)}</span>
        </p>
        <p className="mt-1">
          Total Released: <span className="font-semibold text-slate-900">{formatMoney(totalReleasedAmount, memo?.currency)}</span>
        </p>
        <p className="mt-1">
          Remaining Balance: <span className="font-semibold text-slate-900">{formatMoney(remainingBalance, memo?.currency)}</span>
        </p>
        {latestNextPaymentDate && (
          <p className="mt-1">
            Next payment date: <span className="font-semibold">{formatDate(latestNextPaymentDate)}</span>
            {nextPaymentCountdown && <span> ({nextPaymentCountdown})</span>}
          </p>
        )}
        {fullyReleasedOrLocked && (
          <p className="mt-2 font-medium text-amber-700">
            This memo is not editable in the Cash Release Desk.
          </p>
        )}
      </div>

      <form onSubmit={submitRelease} className="space-y-5">
        <SelectField
          name="decision_type"
          value={form.decision_type}
          onChange={updateField}
          label="Decision Type"
          disabled={loading || memoLoading || fullyReleasedOrLocked}
        >
          <option value="FULL">FULL</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="REJECTED">REJECTED</option>
        </SelectField>

        <p className="text-xs text-slate-500 -mt-2">
          REJECTED decisions will not require released amount.
        </p>

        {showAmountField && (
          <FormField
            name="released_amount"
            type="number"
            value={form.released_amount}
            onChange={updateField}
            label="Released Amount"
            placeholder="Released amount"
            required
            readOnly={form.decision_type === "FULL"}
            disabled={loading || memoLoading || fullyReleasedOrLocked}
            step="0.01"
            max={remainingBalance}
          />
        )}

        {showNextPaymentDate && (
          <FormField
            name="next_payment_date"
            type="date"
            value={form.next_payment_date}
            onChange={updateField}
            label="Next Payment Date"
            required
            disabled={loading || memoLoading || fullyReleasedOrLocked}
          />
        )}

        {form.decision_type === "REJECTED" && (
          <TextAreaField
            name="rejection_reason"
            value={form.rejection_reason}
            onChange={updateField}
            label="Rejection Reason"
            placeholder="Reason for rejection"
            required
            disabled={loading || memoLoading || fullyReleasedOrLocked}
          />
        )}

        <TextAreaField
          name="remarks"
          value={form.remarks}
          onChange={updateField}
          label="Remarks"
          placeholder="Remarks"
          disabled={loading || memoLoading || fullyReleasedOrLocked}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={loading || memoLoading || fullyReleasedOrLocked}>
            {loading ? "Releasing..." : "Release Fund"}
          </ActionButton>

          <ActionButton to="/fund-release" variant="ghost">
            Cancel
          </ActionButton>
        </div>
      </form>

      {Array.isArray(memo?.release_history) && memo.release_history.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <h2 className="text-sm font-bold text-slate-900">Release History</h2>
          <div className="mt-3 space-y-3">
            {memo.release_history.map((release) => (
              <div
                key={release.id}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-slate-900">
                    {release.decision_type} - {formatMoney(release.released_amount, memo.currency)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(release.released_at)}
                  </p>
                </div>
                {release.next_payment_date && (
                  <p className="mt-1 text-xs text-slate-600">
                    Next payment: {formatDate(release.next_payment_date)} ({getCountdownText(release.next_payment_date)})
                  </p>
                )}
                {release.remarks && (
                  <p className="mt-2 text-slate-700">{release.remarks}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </SectionCard>
    </div>
  );
}

function getCountdownText(dateValue) {
  if (!dateValue) return "";

  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return "";

  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  if (diffDays === 0) return "due today";
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
}
