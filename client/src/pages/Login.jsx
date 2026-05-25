import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/api";
import { saveAuth } from "../auth/authStore";
import { canAccessPath, getDefaultRoute } from "../auth/roleAccess";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    localStorage.getItem("ui_theme") || "airforce"
  );

  const isAirforce = theme === "airforce";

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const getDashboardPath = (role) => getDefaultRoute(role);

  const toggleTheme = () => {
    const nextTheme = isAirforce ? "smoke" : "airforce";
    setTheme(nextTheme);
    localStorage.setItem("ui_theme", nextTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", form);

      const data = res?.data?.data || res?.data;
      const token = data?.token;
      const user = data?.user;

      if (!token || !user) {
        setError("Login response is missing token or user details.");
        return;
      }

      saveAuth(token, user);

      const savedPath = location.state?.from?.pathname;
      const fallbackPath = getDashboardPath(user.role);
      const redirectPath =
        savedPath && canAccessPath(user.role, savedPath) ? savedPath : fallbackPath;

      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Login request failed", err);
      }

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Login failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 ${
        isAirforce
          ? "bg-gradient-to-br from-[#04152d] via-[#071f3f] to-[#0b2d55]"
          : "bg-gradient-to-br from-slate-50 via-white to-slate-200"
      }`}
    >
      <div className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center">
        <div
          className={`relative w-full max-w-md rounded-3xl border p-6 shadow-2xl sm:p-8 ${
            isAirforce
              ? "border-white/20 bg-white/95 shadow-slate-950/25"
              : "border-slate-200 bg-white shadow-slate-900/10"
          }`}
        >
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              {isAirforce ? "Airforce" : "Smoke"}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className={`relative h-6 w-11 rounded-full border p-0.5 transition ${
                isAirforce
                  ? "border-[#071f3f]/20 bg-[#071f3f]"
                  : "border-slate-300 bg-slate-200"
              }`}
              aria-label="Toggle login theme"
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow-sm transition ${
                  isAirforce ? "translate-x-0" : "translate-x-5"
                }`}
              />
            </button>
          </div>

          <div className="pt-7 text-center">
            <img
              src="/naf-logo.png"
              alt="NAF Logo"
              className="mx-auto h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm"
            />

            <div className="mt-3 text-lg leading-none tracking-[0.3em] text-amber-400">
              {"\u2605\u2605\u2605"}
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
              CAS Projects Manager
            </h1>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Secure command access for project intelligence, approvals, and operational oversight.
            </p>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-black text-slate-700">
                Username
              </label>

              <input
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                required
                className="mt-1 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#071f3f] focus:ring-4 focus:ring-blue-950/10"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-slate-700">
                Password
              </label>

              <div className="relative mt-1">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#071f3f] focus:ring-4 focus:ring-blue-950/10"
                  placeholder="Enter password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 min-w-14 -translate-y-1/2 rounded-lg px-2 py-1.5 text-xs font-black uppercase tracking-wide text-[#071f3f] transition hover:bg-slate-100"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-12 w-full rounded-xl bg-[#071f3f] px-4 py-3 text-sm font-black uppercase tracking-wide text-white shadow-sm shadow-slate-900/15 transition hover:bg-[#0b2d55] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>
        </div>

        <footer className={`mt-5 text-center text-xs font-bold ${isAirforce ? "text-slate-300" : "text-slate-500"}`}>
          © 2026 341 CIS Group. All Rights Reserved.
        </footer>
      </div>
    </div>
  );
}
