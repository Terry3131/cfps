const ROLE_HOME = {
  SUPER_ADMIN: "/cas/dashboard",
  CAS: "/cas/dashboard",
  AA_CAS: "/aa-cas/dashboard",
  PASO_CAS: "/paso-cas/dashboard",
  CAB: "/cab/dashboard",
  REGISTRY: "/memos",
  CASH_OFFICE: "/fund-release",
  MONITOR: "/monitor/dashboard",
  VALIDATOR: "/validator/dashboard",
  VIEWER: "/notifications",
};

const CAS_COMMAND_SECTIONS = [
  { label: "All Financial Approvals", slug: "financial-approvals" },
  { label: "Executive Metrics", slug: "" },
  { label: "Statistical Financial Summary", slug: "financial-summary" },
  { label: "Geography", slug: "geography" },
  { label: "Operational Intelligence", slug: "operational-intelligence" },
  { label: "Trackers and Validators", slug: "validation" },
  { label: "Reports / Export", slug: "reports" },
];

function buildCommandPages(prefix, group) {
  return CAS_COMMAND_SECTIONS.map((item) => ({
    label: item.label,
    path: item.slug === "financial-approvals"
      ? `${prefix}/financial-approvals`
      : `${prefix}/dashboard${item.slug ? `/${item.slug}` : ""}`,
    group,
  }));
}

const CAS_PAGES = buildCommandPages("/cas", "CAS Command");
const AA_CAS_PAGES = buildCommandPages("/aa-cas", "AA-CAS Command");
const PASO_CAS_PAGES = buildCommandPages("/paso-cas", "PASO-CAS Command");

const MENU_BY_ROLE = {
  SUPER_ADMIN: [
    ...CAS_PAGES,
    ...AA_CAS_PAGES,
    ...PASO_CAS_PAGES,
    { label: "CAB Dashboard", path: "/cab/dashboard", group: "Dashboards" },
    { label: "Tracker Dashboard", path: "/monitor/dashboard", group: "Dashboards" },
    { label: "Memo Registry", path: "/memos", group: "Operations" },
    { label: "Fund Release Desk", path: "/fund-release", group: "Operations" },
    { label: "Validation Desk", path: "/validation", group: "Operations" },
    { label: "User Management", path: "/users", group: "Operations" },
    { label: "Reports / Export", path: "/reports-export", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
    { label: "Local Memo Drafts", path: "/desktop/local-memos", group: "Desktop" },
  ],

  CAS: [
    ...CAS_PAGES,
    { label: "User Management", path: "/users", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  AA_CAS: [
    ...AA_CAS_PAGES,
    { label: "User Management", path: "/users", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  PASO_CAS: [
    ...PASO_CAS_PAGES,
    { label: "User Management", path: "/users", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  CAB: [
    { label: "CAB Dashboard", path: "/cab/dashboard", group: "Dashboards" },
    { label: "Fund Release Desk", path: "/fund-release", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  REGISTRY: [
    { label: "Memo Registry", path: "/memos", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
    { label: "Local Memo Drafts", path: "/desktop/local-memos", group: "Desktop" },
  ],

  CASH_OFFICE: [
    { label: "CAB Dashboard", path: "/cab/dashboard", group: "Dashboards" },
    { label: "Fund Release Desk", path: "/fund-release", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  MONITOR: [
    { label: "Tracker Dashboard", path: "/monitor/dashboard", group: "Dashboards" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  VALIDATOR: [
    { label: "Validator Dashboard", path: "/validator/dashboard", group: "Dashboards" },
    { label: "Validation Desk", path: "/validation", group: "Operations" },
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],

  VIEWER: [
    { label: "Notifications", path: "/notifications", group: "Operations" },
  ],
};

const ROUTE_RULES = [
  { path: "/cas/financial-approvals", roles: ["SUPER_ADMIN", "CAS"] },
  { path: "/cas/dashboard", roles: ["SUPER_ADMIN", "CAS"] },
  { path: "/cas/dashboard/:section", roles: ["SUPER_ADMIN", "CAS"] },
  { path: "/aa-cas/financial-approvals", roles: ["SUPER_ADMIN", "AA_CAS"] },
  { path: "/aa-cas/dashboard", roles: ["SUPER_ADMIN", "AA_CAS"] },
  { path: "/aa-cas/dashboard/:section", roles: ["SUPER_ADMIN", "AA_CAS"] },
  { path: "/paso-cas/financial-approvals", roles: ["SUPER_ADMIN", "PASO_CAS"] },
  { path: "/paso-cas/dashboard", roles: ["SUPER_ADMIN", "PASO_CAS"] },
  { path: "/paso-cas/dashboard/:section", roles: ["SUPER_ADMIN", "PASO_CAS"] },
  { path: "/cab/dashboard", roles: ["SUPER_ADMIN", "CAB", "CASH_OFFICE"] },
  { path: "/monitor/dashboard", roles: ["SUPER_ADMIN", "MONITOR"] },
  { path: "/validator/dashboard", roles: ["SUPER_ADMIN", "VALIDATOR"] },
  { path: "/projector", roles: ["SUPER_ADMIN", "CAS"] },

  { path: "/memos", roles: ["SUPER_ADMIN", "REGISTRY"] },
  { path: "/memos/create", roles: ["SUPER_ADMIN", "REGISTRY"] },
  { path: "/memos/:id", roles: ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "REGISTRY", "MONITOR", "VALIDATOR", "VIEWER"] },
  { path: "/memos/:id/assign", roles: ["SUPER_ADMIN", "REGISTRY"] },
  { path: "/memos/:id/approve", roles: ["SUPER_ADMIN", "REGISTRY"] },
  { path: "/memos/:id/commence", roles: ["SUPER_ADMIN", "MONITOR"] },
  { path: "/memos/:id/progress", roles: ["SUPER_ADMIN", "MONITOR"] },
  { path: "/memos/:id/validate", roles: ["SUPER_ADMIN", "VALIDATOR"] },
  { path: "/memos/:id/attachments", roles: ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "REGISTRY", "MONITOR", "VALIDATOR"] },

  { path: "/fund-release", roles: ["SUPER_ADMIN", "CAB", "CASH_OFFICE"] },
  { path: "/fund-release/:id", roles: ["SUPER_ADMIN", "CAB", "CASH_OFFICE"] },
  { path: "/validation", roles: ["SUPER_ADMIN", "VALIDATOR"] },
  { path: "/reports-export", roles: ["SUPER_ADMIN"] },
  { path: "/users", roles: ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"] },
  { path: "/notifications", roles: ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"] },
  { path: "/desktop/settings", roles: ["SUPER_ADMIN", "CAS", "REGISTRY"] },
  { path: "/desktop/local-memos", roles: ["SUPER_ADMIN", "CAS", "REGISTRY"] },
];

export const VALID_ROLES = Object.keys(ROLE_HOME);

export function getDefaultRoute(role) {
  return ROLE_HOME[role] || "/memos";
}

export function getMenuForRole(role) {
  return MENU_BY_ROLE[role] || [];
}

export function getAllowedRolesForPath(pathname) {
  const cleanPath = normalizePath(pathname);

  const exactMatch = ROUTE_RULES.find((rule) => rule.path === cleanPath);

  if (exactMatch) {
    return exactMatch.roles;
  }

  const dynamicMatch = ROUTE_RULES.find((rule) => {
    const pattern = routePatternToRegex(rule.path);
    return pattern.test(cleanPath);
  });

  return dynamicMatch?.roles || [];
}

export function canAccessPath(role, pathname) {
  if (!role || !pathname) return false;

  const allowedRoles = getAllowedRolesForPath(pathname);

  if (allowedRoles.length === 0) {
    return true;
  }

  return allowedRoles.includes(role);
}

function normalizePath(pathname) {
  if (!pathname) return "/";

  const cleanPath = String(pathname).split(/[?#]/)[0] || "/";

  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    return cleanPath.slice(0, -1);
  }

  return cleanPath;
}

function routePatternToRegex(path) {
  const escaped = path.replace(/\//g, "\\/");
  const dynamic = escaped.replace(/:[^/]+/g, "[^/]+");

  return new RegExp(`^${dynamic}$`);
}
