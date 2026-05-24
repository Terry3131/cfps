import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../auth/authStore";
import { getMenuForRole } from "../auth/roleAccess";
import { isDesktopShell } from "../desktop/desktopApi";
import DesktopNotificationIndicator from "../desktop/DesktopNotificationIndicator";
import DesktopSyncStatus from "../desktop/DesktopSyncStatus";
import NotificationDropdown from "./NotificationDropdown";

export default function Layout() {
  const navigate = useNavigate();
  const user = getUser();
  const starCount = getRankStarCount(user);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(
    localStorage.getItem("ui_theme") || "airforce"
  );

  const isAirforce = theme === "airforce";

  const menuItems = getMenuForRole(user?.role).filter((item) => {
    if (item.path?.startsWith("/desktop/")) {
      return isDesktopShell();
    }

    return true;
  });

  const groupedMenu = menuItems.reduce((groups, item) => {
    const groupName = item.group || "Menu";

    return {
      ...groups,
      [groupName]: [...(groups[groupName] || []), item],
    };
  }, {});

  const toggleTheme = () => {
    const nextTheme = isAirforce ? "smoke" : "airforce";
    setTheme(nextTheme);
    localStorage.setItem("ui_theme", nextTheme);
  };

  const logout = () => {
    clearAuth();
    setSidebarOpen(false);
    navigate("/login");
  };

  const sidebarClass = isAirforce
    ? "bg-gradient-to-b from-[#04152d] via-[#071f3f] to-[#0b2d55] text-white shadow-2xl shadow-slate-950/20"
    : "border-r border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-900/5";

  const inactiveLinkClass = isAirforce
    ? "text-slate-200 hover:bg-white/10 hover:text-white"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950";

  const activeLinkClass = isAirforce
    ? "bg-white text-[#071f3f] font-black shadow-lg shadow-blue-950/20 before:bg-emerald-400"
    : "bg-[#071f3f] text-white font-black shadow-lg shadow-slate-900/10 before:bg-emerald-400";

  const groupLabelClass = isAirforce ? "text-slate-300" : "text-slate-500";

  const linkClass = ({ isActive }) =>
    `
      relative flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200
      before:absolute before:left-1 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-full before:content-['']
      ${isActive ? "before:opacity-100" : "before:opacity-0"}
      ${isActive ? activeLinkClass : inactiveLinkClass}
      ${sidebarCollapsed ? "md:justify-center md:px-2" : ""}
    `;

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_top_left,_#e0f2fe_0,_#f8fafc_28rem,_#eef2f7_100%)]">
      <aside
        className={`
          fixed left-0 top-0 z-40 h-screen w-[17rem] shrink-0 p-5 print:hidden md:relative
          flex flex-col overflow-hidden
          transform transition-all duration-200
          ${sidebarCollapsed ? "md:w-[5.75rem] md:px-3" : "md:w-[17rem]"}
          ${sidebarClass}
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className={`rounded-3xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur ${sidebarCollapsed ? "md:px-2" : ""}`}>
          <img
            src="/naf-logo.png"
            alt="NAF Logo"
            className={`mx-auto rounded-2xl border border-white/30 bg-white object-contain p-1 shadow-lg ${sidebarCollapsed ? "h-11 w-11 md:h-11 md:w-11" : "h-16 w-16"}`}
          />

          <div className={`mx-auto mt-3 h-1 rounded-full ${sidebarCollapsed ? "w-9" : "w-16"} ${isAirforce ? "bg-emerald-400" : "bg-[#071f3f]"}`} />

          <h2 className={`mt-3 text-lg font-black tracking-tight ${sidebarCollapsed ? "md:hidden" : ""}`}>CAS Projects</h2>
          {starCount > 0 && (
            <div className="mt-2 flex justify-center gap-1" aria-label={`${starCount} rank stars`}>
              {Array.from({ length: starCount }).map((_, index) => (
                <span key={index} className="text-sm leading-none text-amber-300 drop-shadow">
                  {"\u2605"}
                </span>
              ))}
            </div>
          )}
          <p className={`mt-1 text-[11px] font-bold uppercase tracking-[0.16em] ${sidebarCollapsed ? "md:hidden" : ""} ${isAirforce ? "text-slate-300" : "text-slate-500"}`}>
            Command Platform
          </p>
        </div>

        <div className={`mt-4 rounded-2xl border px-3 py-2 text-xs ${sidebarCollapsed ? "md:text-center" : ""} ${isAirforce ? "border-white/10 bg-black/10 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
          <p className="font-black uppercase tracking-wide">{user?.role || "Unknown Role"}</p>
          <p className={`mt-0.5 truncate ${sidebarCollapsed ? "md:hidden" : ""}`}>{user?.username || "Active session"}</p>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          className={`mt-3 hidden rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition md:block ${
            isAirforce ? "border-white/10 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          }`}
        >
          {sidebarCollapsed ? "Open" : "Collapse"}
        </button>

        <div className="mt-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(false)}
            className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
              isAirforce ? "bg-white/10 text-white" : "bg-slate-100 text-slate-800"
            }`}
          >
            Close
          </button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {Object.entries(groupedMenu).map(([groupName, items]) => (
            <div key={groupName}>
              <p className={`mb-2 px-1 text-[10px] font-black uppercase tracking-[0.18em] ${sidebarCollapsed ? "md:text-center md:tracking-normal" : ""} ${groupLabelClass}`}>
                {sidebarCollapsed ? groupName.slice(0, 3) : groupName}
              </p>

              <div className="space-y-1.5">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    className={linkClass}
                    to={item.path}
                    title={item.label}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className={`shrink-0 rounded-lg border px-1.5 py-0.5 text-[10px] font-black ${isAirforce ? "border-white/10 bg-white/10" : "border-slate-200 bg-white"}`}>
                      {getMenuInitials(item.label)}
                    </span>
                    <span className={`min-w-0 break-words leading-snug ${sidebarCollapsed ? "md:hidden" : ""}`}>
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className={`mt-4 shrink-0 rounded-3xl border p-4 backdrop-blur ${sidebarCollapsed ? "md:px-2" : ""} ${isAirforce ? "border-white/10 bg-[#04152d]/80" : "border-slate-200 bg-white/90"}`}>
          <div className={`mb-3 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.16em] ${sidebarCollapsed ? "md:hidden" : ""}`}>
            <span className={isAirforce ? "text-white" : "text-[#071f3f]"}>
              AIRFORCE
            </span>
            <span className={isAirforce ? "text-slate-400" : "text-slate-600"}>
              SMOKE
            </span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`relative h-8 w-full rounded-full border p-1 transition ${
              isAirforce ? "border-white/10 bg-black/25" : "border-slate-200 bg-slate-100"
            }`}
            aria-label="Toggle sidebar theme"
          >
            <span
              className={`absolute top-1 h-6 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-lg transition ${
                isAirforce ? "left-1" : "left-[calc(50%+0.125rem)]"
              }`}
            />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex h-screen w-full min-w-0 flex-1 flex-col overflow-hidden md:ml-0">
        <header className="sticky top-0 z-30 flex shrink-0 min-w-0 items-center justify-between gap-3 border-b border-white/60 bg-white/95 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur print:hidden sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl bg-[#071f3f] px-3 py-2 text-sm font-bold text-white md:hidden"
            >
              Menu
            </button>

            <div className="min-w-0">
              <h1 className="truncate font-black tracking-tight text-slate-950">CAS Projects Manager</h1>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {user?.role || "Unknown Role"} command session
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-3">
            <NotificationDropdown />

            <button
              onClick={logout}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="shrink-0 print:hidden">
          <DesktopNotificationIndicator />
          <DesktopSyncStatus />
        </div>

        <section className="min-h-0 w-full min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden p-4 print:p-0 sm:p-6">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

function getMenuInitials(label = "") {
  return String(label)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "MN";
}

function getRankStarCount(user = {}) {
  const role = String(user.role || "").toUpperCase().replace("-", "_");
  const title = String(user.title || user.appointment || user.rank || "").toUpperCase();
  const unitCode = user.branch_dru || user.unit_code || user.code;

  if (role === "AA_CAS" || title.includes("AA-CAS") || title.includes("AA CAS")) return 0;
  if (role === "PASO_CAS" || title.includes("PASO")) return 1;
  if (role === "CAS" || role === "SUPER_ADMIN" || title === "CAS" || title.includes("CHIEF OF THE AIR STAFF")) return 3;
  if (unitCode || ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"].includes(role)) return 2;

  return 0;
}
