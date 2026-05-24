export const ALLOWED_ROLES = [
  "CAS",
  "CAB",
  "REGISTRY",
  "MONITOR",
  "VALIDATOR",
  "CASH_OFFICE",
  "VIEWER",
];

export function isAllowedRole(role) {
  return ALLOWED_ROLES.includes(String(role || "").toUpperCase());
}

export function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

export function getRoleLabel(role) {
  const normalized = normalizeRole(role);

  const labels = {
    CAS: "CAS",
    CAB: "CAB",
    REGISTRY: "Registry",
    MONITOR: "Monitor",
    VALIDATOR: "Validator",
    CASH_OFFICE: "Cash Office",
    VIEWER: "Viewer",
  };

  return labels[normalized] || "Unsupported";
}

export function getRoleScope(role) {
  const normalized = normalizeRole(role);

  const scopes = {
    CAS: "Executive notification oversight",
    CAB: "Release and action alerts",
    REGISTRY: "Registry and sync alerts",
    MONITOR: "Release, overdue, and rejection alerts",
    VALIDATOR: "Validation pending alerts",
    CASH_OFFICE: "Release alert visibility",
    VIEWER: "Read-only notification visibility",
  };

  return scopes[normalized] || "Mobile access unavailable";
}
