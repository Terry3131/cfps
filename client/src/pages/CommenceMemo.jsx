import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import FormField from "../components/FormField";
import TextAreaField from "../components/TextAreaField";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import SectionCard from "../components/SectionCard";
import useFormState from "../hooks/useFormState";

export default function CommenceMemo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { form, updateField } = useFormState({
    commencement_date: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitCommencement = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post(`/memos/${id}/commencement`, form);
      navigate(`/memos/${id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to commence memo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback={`/memos/${id}`} />
      <SectionCard
        title="Commence Memo"
        subtitle="Record project commencement details."
        className="max-w-3xl"
      >
      <ErrorBox message={error} className="mb-5" />

      <form onSubmit={submitCommencement} className="space-y-5">
        <FormField
          name="commencement_date"
          type="date"
          value={form.commencement_date}
          onChange={updateField}
          label="Commencement Date"
          required
        />

        <TextAreaField
          name="remarks"
          value={form.remarks}
          onChange={updateField}
          label="Remarks"
          placeholder="Remarks"
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Commencement"}
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
