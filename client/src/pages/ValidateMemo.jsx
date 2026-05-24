import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import SectionCard from "../components/SectionCard";
import SelectField from "../components/SelectField";
import TextAreaField from "../components/TextAreaField";
import useFormState from "../hooks/useFormState";
import useMemoDetails from "../hooks/useMemoDetails";
import { getUser } from "../auth/authStore";
import {
  canUserValidateMemo,
  canValidateMemo,
  getValidationReadinessMessage,
} from "../utils/memoFields";

export default function ValidateMemo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const { memo, loading: memoLoading, error: memoError } = useMemoDetails(id);
  const readyForValidation = canUserValidateMemo(user, memo);
  const accessError = isForbiddenMemoError(memoError)
    ? "This memo is not assigned to your validation unit."
    : memoError;

  const { form, updateField } = useFormState({
    is_valid: "true",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitValidation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!readyForValidation) {
      setError(canValidateMemo(memo) ? "This memo is not assigned to your validation unit." : getValidationReadinessMessage(memo));
      setLoading(false);
      return;
    }

    try {
      await API.post(`/memos/${id}/validate`, {
        is_valid: form.is_valid === "true",
        validation_note: form.remarks,
      });

      navigate("/validation", {
        state: {
          message: form.is_valid === "true"
            ? "Memo validation approved."
            : "Memo validation rejected.",
        },
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to validate memo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback={`/memos/${id}`} />
      <SectionCard
        title="Validate Memo"
        subtitle="Review and submit validation outcome for this memo."
        className="max-w-3xl"
      >
      <ErrorBox message={accessError || error} className="mb-5" />

      {memoLoading && (
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          Loading memo validation context...
        </div>
      )}

      {!memoLoading && !accessError && !readyForValidation && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {getValidationReadinessMessage(memo)}
        </div>
      )}

      <form onSubmit={submitValidation} className="space-y-5">
        <SelectField
          name="is_valid"
          value={form.is_valid}
          onChange={updateField}
          label="Validation Decision"
          disabled={memoLoading || Boolean(accessError) || !readyForValidation}
        >
          <option value="true">Validated</option>
          <option value="false">Not Validated</option>
        </SelectField>

        <TextAreaField
          name="remarks"
          value={form.remarks}
          onChange={updateField}
          label="Validation Remarks"
          placeholder="Validation remarks"
          disabled={memoLoading || Boolean(accessError) || !readyForValidation}
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={memoLoading || Boolean(accessError) || loading || !readyForValidation}>
            {loading ? "Saving..." : "Submit Validation"}
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

function isForbiddenMemoError(message) {
  return String(message || "").toLowerCase().includes("forbidden");
}
