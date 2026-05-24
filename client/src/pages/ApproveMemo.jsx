import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import TextAreaField from "../components/TextAreaField";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import SectionCard from "../components/SectionCard";

export default function ApproveMemo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitApproval = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post(`/memos/${id}/approve`, {
        remarks,
      });

      navigate(`/memos/${id}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve memo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback={`/memos/${id}`} />
      <SectionCard
        title="Approve Memo"
        subtitle="Approve this memo for onward processing."
        className="max-w-3xl"
      >
      <ErrorBox message={error} className="mb-5" />

      <form onSubmit={submitApproval} className="space-y-5">
        <TextAreaField
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          label="Approval Remarks"
          placeholder="Optional approval remarks"
        />

        <div className="flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={loading}>
            {loading ? "Approving..." : "Approve Memo"}
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
