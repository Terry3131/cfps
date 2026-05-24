import { useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import MemoTable from "../components/MemoTable";
import PageHeader from "../components/PageHeader";
import RoleGuard from "../components/RoleGuard";
import SearchBox from "../components/SearchBox";
import API from "../api/api";
import useMemos from "../hooks/useMemos";
import useOrganizationalUnits from "../hooks/useOrganizationalUnits";
import {
  getMemoReference,
  getMemoStatus,
  getMemoTitle,
  getMemoWorkflowType,
} from "../utils/memoFields";
import { getOrganizationLabelFromMemo } from "../utils/organizationalUnits";

export default function MemoRegistry() {
  const [search, setSearch] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [businessStatus, setBusinessStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [actionState, setActionState] = useState({ id: null, error: "", message: "" });
  const query = useMemo(() => ({
    search,
    approval_status: approvalStatus,
    business_status: businessStatus,
    created_from: startDate,
    created_to: endDate,
    page,
    limit: 25,
  }), [approvalStatus, businessStatus, endDate, page, search, startDate]);
  const { memos, pagination, loading, error, reload } = useMemos(query);
  const { units: organizationalUnits } = useOrganizationalUnits("");

  const filteredMemos = useMemo(() => {
    const term = search.trim().toLowerCase();

    const rows = term ? memos.filter((memo) => {
      const searchableText = [
        getMemoReference(memo),
        getMemoTitle(memo),
        getMemoStatus(memo),
        getMemoWorkflowType(memo),
        memo?.description,
        memo?.category,
        memo?.branch_dru,
        getOrganizationLabelFromMemo(memo, "branch_dru", "branch_dru_name", organizationalUnits),
        memo?.beneficiary_name,
        memo?.state,
        memo?.location,
        memo?.geopolitical_zone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    }) : memos;

    return [...rows].sort((a, b) => compareMemos(a, b, sortBy));
  }, [memos, organizationalUnits, search, sortBy]);

  const updateDraftStatus = async (memo, status) => {
    setActionState({ id: memo.id, error: "", message: "" });

    try {
      await API.patch(`/memos/${memo.id}/lifecycle`, { status });
      setActionState({
        id: null,
        error: "",
        message: `${getMemoReference(memo)} moved to ${status}.`,
      });
      await reload();
    } catch (err) {
      setActionState({
        id: null,
        error: err?.response?.data?.message || "Failed to update memo lifecycle.",
        message: "",
      });
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Memo Registry"
        subtitle="Registered memos from the backend."
        action={
          <RoleGuard roles={["SUPER_ADMIN", "REGISTRY"]}>
            <ActionButton to="/memos/create">
              Create Memo
            </ActionButton>
          </RoleGuard>
        }
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <SearchBox
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search reference, heading, beneficiary, branch, category, workflow, state, or location..."
        />

        <p className="text-sm text-slate-500">
          {pagination?.total ?? filteredMemos.length} memo{(pagination?.total ?? filteredMemos.length) === 1 ? "" : "s"} found
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <SelectControl label="Approval" value={approvalStatus} onChange={setApprovalStatus} setPage={setPage}>
            <option value="">All approval</option>
            <option value="PENDING">Draft / Pending</option>
            <option value="APPROVED">Approved</option>
          </SelectControl>
          <SelectControl label="Business" value={businessStatus} onChange={setBusinessStatus} setPage={setPage}>
            <option value="">All business</option>
            <option value="DRAFT">Draft</option>
            <option value="KIV">KIV</option>
            <option value="APPROVED">Approved</option>
          </SelectControl>
          <DateControl label="From" value={startDate} onChange={setStartDate} setPage={setPage} />
          <DateControl label="To" value={endDate} onChange={setEndDate} setPage={setPage} />
          <SelectControl label="Sort" value={sortBy} onChange={setSortBy} setPage={setPage}>
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="branch">Branch</option>
            <option value="workflow">Workflow</option>
            <option value="status">Status</option>
          </SelectControl>
        </div>
      </div>

      <ErrorBox message={error} />
      <ErrorBox message={actionState.error} />
      {actionState.message && (
        <div className="rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700">
          {actionState.message}
        </div>
      )}

      {loading ? (
        <LoadingBox message="Loading memos..." />
      ) : filteredMemos.length === 0 ? (
        <EmptyState
          title="No memos found."
          message={search ? "No memo matches your search." : "No memo has been registered yet."}
        />
      ) : (
        <>
          <MemoTable
            memos={filteredMemos}
            organizationalUnits={organizationalUnits}
            renderActions={(memo) => (
              <RegistryActions
                memo={memo}
                busy={actionState.id === memo.id}
                onLifecycle={updateDraftStatus}
              />
            )}
          />
          <PaginationControls pagination={pagination} page={page} setPage={setPage} />
        </>
      )}
    </div>
  );
}

function SelectControl({ label, value, onChange, setPage, children }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setPage(1);
        }}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      >
        {children}
      </select>
    </label>
  );
}

function DateControl({ label, value, onChange, setPage }) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <input
        type="date"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setPage(1);
        }}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
      />
    </label>
  );
}

function RegistryActions({ memo, busy, onLifecycle }) {
  const isDraft = String(memo.business_status || getMemoStatus(memo)).toUpperCase() === "DRAFT";

  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton to={`/memos/${memo.id}`} variant="link">View</ActionButton>
      {isDraft && (
        <RoleGuard roles={["SUPER_ADMIN", "REGISTRY"]}>
          <ActionButton
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => onLifecycle(memo, "KIV")}
          >
            KIV
          </ActionButton>
          <ActionButton
            type="button"
            variant="success"
            disabled={busy}
            onClick={() => onLifecycle(memo, "APPROVED")}
          >
            Approve
          </ActionButton>
        </RoleGuard>
      )}
    </div>
  );
}

function PaginationControls({ pagination, page, setPage }) {
  if (!pagination) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-600">
        Page {pagination.page} of {pagination.pageCount}
      </p>
      <div className="flex gap-2">
        <ActionButton
          type="button"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Previous
        </ActionButton>
        <ActionButton
          type="button"
          variant="ghost"
          disabled={page >= pagination.pageCount}
          onClick={() => setPage((current) => Math.min(pagination.pageCount, current + 1))}
        >
          Next
        </ActionButton>
      </div>
    </div>
  );
}

function compareMemos(a, b, sortBy) {
  if (sortBy === "created_asc") return compareDate(a.created_at, b.created_at);
  if (sortBy === "branch") return String(a.branch_dru || "").localeCompare(String(b.branch_dru || ""));
  if (sortBy === "workflow") return getMemoWorkflowType(a).localeCompare(getMemoWorkflowType(b));
  if (sortBy === "status") return getMemoStatus(a).localeCompare(getMemoStatus(b));

  return compareDate(b.created_at, a.created_at);
}

function compareDate(a, b) {
  return Date.parse(a || "") - Date.parse(b || "");
}
