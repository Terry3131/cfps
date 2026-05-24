import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FormField from "../components/FormField";
import TextAreaField from "../components/TextAreaField";
import SelectField from "../components/SelectField";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import SectionCard from "../components/SectionCard";
import CategorySelect from "../components/CategorySelect";
import OrganizationalUnitSelect from "../components/OrganizationalUnitSelect";
import API from "../api/api";
import { toNumber } from "../utils/format";
import { unwrapResponse } from "../utils/unwrap";
import useFormState from "../hooks/useFormState";
import useCategories from "../hooks/useCategories";
import { NIGERIAN_STATES, getGeopoliticalZone } from "../utils/nigeriaGeo";

export default function CreateMemo() {
  const navigate = useNavigate();
  const { categories } = useCategories();

  const { form, updateField } = useFormState({
    memo_status: "DRAFT",
    reference_no: "",
    heading: "",
    category: "",
    branch_dru: "",
    beneficiary_name: "",
    amount: "",
    currency: "NGN",
    movement_type: "LOCAL",
    state: "",
    location: "",
    geopolitical_zone: "",
    description: "",
    primary_monitor_branch: "",
    validator_branch: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCategory = categories.find((item) => item.code === form.category);

  const workflowType = String(
    selectedCategory?.workflow_type || "LIGHT_WORKFLOW"
  ).toUpperCase();

  const isDraft = form.memo_status === "DRAFT";
  const isKiv = form.memo_status === "KIV";
  const isApproved = form.memo_status === "APPROVED";
  const isHeavyWorkflow = workflowType === "HEAVY_WORKFLOW";
  const isLightWorkflow = workflowType === "LIGHT_WORKFLOW";
  const showAssignmentFields = isApproved && isHeavyWorkflow;
  const showMovementType = [
    "MEDICAL",
    "TRAVEL",
    "OPERATIONS",
    "TRAINING",
    "PROCUREMENT",
  ].includes(String(form.category || "").toUpperCase());
  const isForeignMovement = showMovementType && form.movement_type === "FOREIGN";

  const workflowLabel = isHeavyWorkflow ? "Heavy Workflow" : "Light Workflow";
  const geopoliticalZone = isForeignMovement ? "" : getGeopoliticalZone(form.state);

  const updateMemoField = (event) => {
    const { name, value } = event.target;

    if (name === "state") {
      updateField({
        target: {
          name: "geopolitical_zone",
          value: getGeopoliticalZone(value),
        },
      });
    }

    updateField(event);
  };

  const submitMemo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!form.category) {
        setError("Please select a category.");
        setLoading(false);
        return;
      }

      if (!form.currency) {
        setError("Please select a currency.");
        setLoading(false);
        return;
      }

      if (toNumber(form.amount) <= 0) {
        setError("Amount must be greater than zero.");
        setLoading(false);
        return;
      }

      if (showAssignmentFields && !form.primary_monitor_branch) {
        setError("Please select Primary Monitor.");
        setLoading(false);
        return;
      }

      if (showAssignmentFields && !form.validator_branch) {
        setError("Please select Final Validator.");
        setLoading(false);
        return;
      }

      const payload = {
        reference_no: form.reference_no,
        heading: form.heading,
        category: form.category,
        branch_dru: form.branch_dru,
        beneficiary_name: form.beneficiary_name,
        amount: toNumber(form.amount),
        currency: form.currency,
        movement_type: showMovementType ? form.movement_type : null,
        state: isForeignMovement ? null : form.state || null,
        location: form.location || null,
        geopolitical_zone: isForeignMovement ? null : form.geopolitical_zone || geopoliticalZone || null,
        description: form.description,
        business_status: isApproved ? "DRAFT" : form.memo_status,
      };

      const res = await API.post("/memos", payload);
      const createdMemo = unwrapResponse(res);
      const memoId = createdMemo?.id || createdMemo?.memo?.id;

      if (!memoId) {
        throw new Error("Created memo ID was not returned by backend.");
      }

      if (isApproved) {
        await API.post(`/memos/${memoId}/approve`, {
          remarks: "Approved during memo creation.",
        });
      }

      if (showAssignmentFields) {
        await API.post(`/memos/${memoId}/assign`, {
          primary_monitor_branch: form.primary_monitor_branch,
          validator_branch: form.validator_branch,
          assigned_to_user_id: null,
        });
      }

      navigate(`/memos/${memoId}`, {
        state: {
          message: showAssignmentFields
            ? "Memo created, approved and assigned successfully."
            : isApproved
              ? "Memo created and approved successfully."
              : "Memo created successfully.",
        },
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create memo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackButton fallback="/memos" />
      <SectionCard
        title="Create Memo"
        subtitle="Register memo using backend doctrine category, workflow type, and status."
        className="max-w-4xl"
      >
      <ErrorBox message={error} className="mb-5" />

      <form onSubmit={submitMemo} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SelectField
          name="memo_status"
          value={form.memo_status}
          onChange={updateMemoField}
          label="Memo Status"
          required
        >
          <option value="DRAFT">Draft</option>
          <option value="KIV">KIV</option>
          <option value="APPROVED">Approved</option>
        </SelectField>

        <CategorySelect
          name="category"
          value={form.category}
          onChange={updateField}
          required
        />

        {form.category && (
          <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">
              {workflowLabel}
            </p>

            {isHeavyWorkflow && (
              <p className="text-xs text-slate-500 mt-1">
                Heavy workflow requires assignment, commencement, progress tracking, validation, and roadmap monitoring.
              </p>
            )}

            {isLightWorkflow && (
              <p className="text-xs text-slate-500 mt-1">
                Light workflow follows simplified controlled processing and does not require operational assignment.
              </p>
            )}
          </div>
        )}

        {isKiv && (
          <div className="xl:col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This memo will be kept in view and will not proceed to fund release or tracking.
          </div>
        )}

        {isDraft && (
          <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Draft memo will be saved without assignment or workflow movement.
          </div>
        )}

        <FormField
          name="reference_no"
          value={form.reference_no}
          onChange={updateMemoField}
          label="Reference Number"
          placeholder="Reference number"
          required
        />

        <FormField
          name="heading"
          value={form.heading}
          onChange={updateMemoField}
          label="Heading"
          placeholder="Heading"
          required
        />

        <OrganizationalUnitSelect
          name="branch_dru"
          value={form.branch_dru}
          onChange={updateMemoField}
          label="Branch / DRU"
          type="HQ_BRANCH"
          required
        />

        <FormField
          name="beneficiary_name"
          value={form.beneficiary_name}
          onChange={updateMemoField}
          label="Beneficiary Name"
          placeholder="Beneficiary Name"
          required
        />

        <FormField
          name="amount"
          type="number"
          value={form.amount}
          onChange={updateMemoField}
          label="Amount"
          placeholder="Amount"
          required
        />

        <SelectField
          name="currency"
          value={form.currency}
          onChange={updateMemoField}
          label="Currency"
          required
        >
          <option value="">Select currency</option>
          <option value="NGN">NGN</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="OTHERS">Others</option>
        </SelectField>

        {showMovementType && (
          <SelectField
            name="movement_type"
            value={form.movement_type}
            onChange={updateMemoField}
            label="Movement / Project Type"
          >
            <option value="LOCAL">Local</option>
            <option value="FOREIGN">Foreign</option>
          </SelectField>
        )}

        {!isForeignMovement && (
          <SelectField
            name="state"
            value={form.state}
            onChange={updateMemoField}
            label="State"
          >
            <option value="">Select state</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </SelectField>
        )}

        <FormField
          name="location"
          value={form.location}
          onChange={updateMemoField}
          label="Location"
          placeholder="Project or delivery location"
        />

        {!isForeignMovement && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Geopolitical Zone</p>
            <p className="mt-1 font-semibold text-slate-900">
              {geopoliticalZone || "Select a state"}
            </p>
          </div>
        )}

        {showAssignmentFields && (
          <>
            <OrganizationalUnitSelect
              name="primary_monitor_branch"
              value={form.primary_monitor_branch}
              onChange={updateMemoField}
              label="Primary Monitor"
              required
            />

            <OrganizationalUnitSelect
              name="validator_branch"
              value={form.validator_branch}
              onChange={updateMemoField}
              label="Final Validator"
              required
            />
          </>
        )}

        {isApproved && isLightWorkflow && form.category && (
          <div className="xl:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Light workflow memo will follow simplified controlled processing and does not require Primary Monitor or Final Validator assignment.
          </div>
        )}

        <div className="xl:col-span-2">
          <TextAreaField
            name="description"
            value={form.description}
            onChange={updateMemoField}
            label="Description"
            placeholder="Description"
          />
        </div>

        <div className="xl:col-span-2 flex flex-col gap-2 sm:flex-row">
          <ActionButton type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : showAssignmentFields
                ? "Create, Approve and Assign"
                : isApproved
                  ? "Create and Approve"
                  : "Save Memo"}
          </ActionButton>

          <ActionButton to="/memos" variant="ghost">
            Cancel
          </ActionButton>
        </div>
      </form>
      </SectionCard>
    </div>
  );
}
