import { useLocation, useNavigate } from "react-router-dom";
import { getUser } from "../auth/authStore";
import { canAccessPath, getDefaultRoute } from "../auth/roleAccess";

export default function BackButton({
  fallback = "/memos",
  fallbackPath,
  fromPath,
  label = "Back",
  className = "",
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const resolvedFallback = fallbackPath || fallback;

  const goBack = () => {
    const safeTarget = getSafeBackTarget({
      role: user?.role,
      fromPath,
      stateFrom: location.state?.from,
      fallback: resolvedFallback,
    });

    if (safeTarget) {
      navigate(safeTarget);
      return;
    }

    navigate(getDefaultRoute(user?.role));
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 print:hidden ${className}`}
    >
      {label}
    </button>
  );
}

function getSafeBackTarget({ role, fromPath, stateFrom, fallback }) {
  const candidates = [
    normalizeStatePath(fromPath),
    normalizeStatePath(stateFrom),
    fallback,
    getDefaultRoute(role),
  ];

  return candidates.find((path) => path && canAccessPath(role, path));
}

function normalizeStatePath(value) {
  if (!value) return "";
  if (typeof value === "string") return normalizeRoutePath(value);

  const pathname = value.pathname || "";
  const search = value.search || "";
  const hash = value.hash || "";

  return normalizeRoutePath(pathname ? `${pathname}${search}${hash}` : "");
}

function normalizeRoutePath(value) {
  const path = String(value || "").trim();

  if (!path) return "";

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);

      if (url.origin !== window.location.origin) {
        return "";
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "";
    }
  }

  return path.startsWith("/") ? path : "";
}
