import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import FormField from "../components/FormField";
import TextAreaField from "../components/TextAreaField";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import SectionCard from "../components/SectionCard";
import { todayInputValue } from "../utils/date";
import { toNumber } from "../utils/format";
import useFormState from "../hooks/useFormState";
import useMemoDetails from "../hooks/useMemoDetails";
import { canValidateMemo } from "../utils/memoFields";

export default function UpdateProgress() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { memo } = useMemoDetails(id);
  const submittedForValidation = canValidateMemo(memo);

  const { form, updateField } = useFormState({
    progress_percent: "",
    status_note: "",
    evidence_url: "",
    report_date: todayInputValue(),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitProgress = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const progressValue = toNumber(form.progress_percent);

      if (progressValue < 0 || progressValue > 100) {
        setError("Progress percentage must be between 0 and 100.");
        setLoading(false);
        return;
      }

      await API.post(`/memos/${id}/progress`, {
        progress_percent: progressValue,
        status_note: form.status_note,
        evidence_url: form.evidence_url,
        report_date: form.report_date,
      });

      navigate(`/memos/${id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback={`/memos/${id}`} />
      <SectionCard
        title="Update Progress"
        subtitle="Update work progress for this memo."
        className="max-w-3xl"
      >
      <ErrorBox message={error} className="mb-5" />

      {submittedForValidation && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Submitted for validation
        </div>
      )}

      <form onSubmit={submitProgress} className="space-y-5">
        <FormField
          name="progress_percent"
          type="number"
          min="0"
          max="100"
          value={form.progress_percent}
          onChange={updateField}
          label="Progress Percentage"
          placeholder="0 - 100"
          required
          disabled={submittedForValidation}
        />

        <FormField
          name="report_date"
          type="date"
          value={form.report_date}
          onChange={updateField}
          label="Report Date"
          required
          disabled={submittedForValidation}
        />

        <FormField
          name="evidence_url"
          value={form.evidence_url}
          onChange={updateField}
          label="Evidence URL"
          placeholder="Optional document or evidence URL"
          disabled={submittedForValidation}
        />

        <TextAreaField
          name="status_note"
          value={form.status_note}
          onChange={updateField}
          label="Status Note"
          placeholder="Progress status note"
          disabled={submittedForValidation}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={loading || submittedForValidation}>
            {submittedForValidation
              ? "Submitted for Validation"
              : loading
                ? "Saving..."
                : "Update Progress"}
          </ActionButton>

          <ActionButton to={`/memos/${id}`} variant="ghost">
            Cancel
          </ActionButton>
        </div>
      </form>
      </SectionCard>
    </div>
  );
}
