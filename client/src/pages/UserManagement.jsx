import { useEffect, useMemo, useState } from "react";
import ActionButton from "../components/ActionButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import SelectField from "../components/SelectField";
import API from "../api/api";
import { getUser } from "../auth/authStore";
import useFormState from "../hooks/useFormState";
import useOrganizationalUnits from "../hooks/useOrganizationalUnits";
import { formatDate } from "../utils/format";

const DEFAULT_ASSIGNABLE_ROLES = {
  SUPER_ADMIN: ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
  CAS: ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
  AA_CAS: ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
  PASO_CAS: ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
};

const INITIAL_CREATE_FORM = {
  full_name: "",
  username: "",
  password: "",
  role: "VIEWER",
  branch_dru: "",
};

export default function UserManagement() {
  const currentUser = getUser();
  const { units } = useOrganizationalUnits("");
  const [users, setUsers] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState(DEFAULT_ASSIGNABLE_ROLES[currentUser?.role] || []);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const { form, updateField, resetForm } = useFormState({
    ...INITIAL_CREATE_FORM,
    role: "VIEWER",
  });

  const assignableUnits = useMemo(
    () => units.filter((unit) => ["HQ_BRANCH", "DIRECT_TO_CAS_OFFICE"].includes(unit.unit_type)),
    [units]
  );

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await API.get("/users");
      const data = response?.data?.data || {};
      const roles = Array.isArray(data.assignable_roles) ? data.assignable_roles : assignableRoles;

      setUsers(Array.isArray(data.users) ? data.users.map(toEditableUser) : []);
      setAssignableRoles(roles);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createUser = async (event) => {
    event.preventDefault();

    try {
      setError("");
      setMessage("");
      await API.post("/users", {
        ...form,
        branch_dru: form.branch_dru || null,
      });
      setMessage("User created successfully.");
      resetForm({
        ...INITIAL_CREATE_FORM,
        role: assignableRoles.includes("VIEWER") ? "VIEWER" : assignableRoles[0] || "VIEWER",
      });
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create user.");
    }
  };

  const updateDraft = (id, field, value) => {
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, draft: { ...user.draft, [field]: value } }
          : user
      )
    );
  };

  const saveUser = async (user) => {
    try {
      setSavingId(user.id);
      setError("");
      setMessage("");
      await API.patch(`/users/${user.id}`, {
        full_name: user.draft.full_name,
        role: user.draft.role,
        branch_dru: user.draft.branch_dru || null,
        is_active: user.draft.is_active,
        password: user.draft.password || undefined,
      });
      setMessage(`${user.username} updated successfully.`);
      await loadUsers();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update user.");
    } finally {
      setSavingId("");
    }
  };

  if (loading) {
    return <LoadingBox message="Loading user management..." />;
  }

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden">
      <PageHeader
        title="User Management"
        subtitle="Leadership account provisioning for operational roles, branch assignments, and account status."
      />

      <ErrorBox message={error} />
      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

      <section className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.65fr)]">
        <SectionCard title="Create User" subtitle="Only assignable roles for your current authority are listed.">
          <form onSubmit={createUser} className="space-y-4">
            <FormField name="full_name" value={form.full_name} onChange={updateField} label="Full Name" required />
            <FormField name="username" value={form.username} onChange={updateField} label="Username" required />
            <FormField name="password" type="password" value={form.password} onChange={updateField} label="Password" required />
            <SelectField name="role" value={form.role} onChange={updateField} label="Role" required>
              {assignableRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </SelectField>
            <OrgUnitSelect value={form.branch_dru} onChange={updateField} units={assignableUnits} />
            <ActionButton type="submit">Create User</ActionButton>
          </form>
        </SectionCard>

        <SectionCard
          title="Operational Users"
          subtitle="Manage role, organizational unit, status, and password reset for visible subordinate accounts."
          action={<ActionButton type="button" variant="ghost" onClick={loadUsers}>Refresh</ActionButton>}
        >
          {users.length === 0 ? (
            <EmptyState title="No users visible for this role." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Unit</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Password Reset</th>
                    <th className="px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id} className="align-top">
                      <td className="min-w-56 px-3 py-3">
                        <input
                          value={user.draft.full_name}
                          onChange={(event) => updateDraft(user.id, "full_name", event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-900"
                        />
                        <p className="mt-1 text-xs font-semibold text-slate-500">@{user.username}</p>
                        <p className="text-[11px] text-slate-400">Created {formatDate(user.created_at)}</p>
                      </td>
                      <td className="min-w-40 px-3 py-3">
                        <select
                          value={user.draft.role}
                          onChange={(event) => updateDraft(user.id, "role", event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-56 px-3 py-3">
                        <select
                          value={user.draft.branch_dru}
                          onChange={(event) => updateDraft(user.id, "branch_dru", event.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        >
                          <option value="">No unit</option>
                          {assignableUnits.map((unit) => (
                            <option key={unit.code} value={unit.code}>{unit.code} - {unit.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-32 px-3 py-3">
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={user.draft.is_active}
                            onChange={(event) => updateDraft(user.id, "is_active", event.target.checked)}
                          />
                          Active
                        </label>
                      </td>
                      <td className="min-w-44 px-3 py-3">
                        <input
                          type="password"
                          value={user.draft.password}
                          onChange={(event) => updateDraft(user.id, "password", event.target.value)}
                          placeholder="Leave unchanged"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <ActionButton
                          type="button"
                          variant="slate"
                          onClick={() => saveUser(user)}
                          disabled={savingId === user.id}
                        >
                          {savingId === user.id ? "Saving..." : "Save"}
                        </ActionButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

function OrgUnitSelect({ value, onChange, units }) {
  return (
    <SelectField name="branch_dru" value={value} onChange={onChange} label="Organizational Unit">
      <option value="">No unit</option>
      {units.map((unit) => (
        <option key={unit.code} value={unit.code}>{unit.code} - {unit.name}</option>
      ))}
    </SelectField>
  );
}

function toEditableUser(user) {
  return {
    ...user,
    draft: {
      full_name: user.full_name || "",
      role: user.role || "VIEWER",
      branch_dru: user.branch_dru || "",
      is_active: user.is_active !== false,
      password: "",
    },
  };
}
