import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FormField from "../components/FormField";
import OrganizationalUnitSelect from "../components/OrganizationalUnitSelect";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import SectionCard from "../components/SectionCard";
import API from "../api/api";
import useFormState from "../hooks/useFormState";

export default function AssignMemo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { form, updateField } = useFormState({
    primary_monitor_branch: "",
    validator_branch: "",
    assigned_to_user_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post(`/memos/${id}/assign`, {
        primary_monitor_branch: form.primary_monitor_branch,
        validator_branch: form.validator_branch,
        assigned_to_user_id: form.assigned_to_user_id || null,
      });

      navigate(`/memos/${id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to assign memo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback={`/memos/${id}`} />
      <SectionCard
        title="Assign Memo"
        subtitle="Select monitor and validator branches for this memo."
        className="max-w-3xl"
      >
      <ErrorBox message={error} className="mb-5" />

      <form onSubmit={submitAssignment} className="space-y-5">
        <OrganizationalUnitSelect
          name="primary_monitor_branch"
          value={form.primary_monitor_branch}
          onChange={updateField}
          label="Primary Monitor Branch"
          required
        />

        <OrganizationalUnitSelect
          name="validator_branch"
          value={form.validator_branch}
          onChange={updateField}
          label="Validator Branch"
          required
        />

        <FormField
          name="assigned_to_user_id"
          value={form.assigned_to_user_id}
          onChange={updateField}
          label="Assigned User ID"
          placeholder="Optional user id"
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={loading}>
            {loading ? "Assigning..." : "Assign Memo"}
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
