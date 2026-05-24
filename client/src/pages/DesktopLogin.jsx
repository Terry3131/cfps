import { useEffect, useState } from "react";
import ActionButton from "../components/ActionButton";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import { desktopApi, isDesktopShell } from "../desktop/desktopApi";

export default function DesktopLogin() {
  const [form, setForm] = useState({
    apiBaseUrl: "",
    username: "",
    password: "",
    rememberSession: true,
  });
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isDesktopShell()) return;

    desktopApi.settings.get()
      .then((settings) => {
        setForm((current) => ({
          ...current,
          apiBaseUrl: settings.apiBaseUrl || "",
          rememberSession: Boolean(settings.rememberSession),
        }));
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const result = await desktopApi.auth.login(form);
      setSession(result);
      setMessage("Desktop session saved locally.");
    } catch (err) {
      setError(err.message || "Desktop login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Desktop Login"
        subtitle="Electron-only auth placeholder using the approved auth IPC channel."
        action={<ActionButton to="/desktop/settings" variant="ghost">Settings</ActionButton>}
      />

      {!isDesktopShell() && (
        <ErrorBox message="Desktop IPC is unavailable in the web browser. Open this screen from the Electron shell." />
      )}

      <ErrorBox message={error} />

      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      <SectionCard title="Local Desktop Session">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
          <FormField
            label="API Base URL"
            name="apiBaseUrl"
            value={form.apiBaseUrl}
            onChange={handleChange}
            placeholder="http://localhost:5000"
            required
          />

          <FormField
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <FormField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="rememberSession"
              checked={form.rememberSession}
              onChange={handleChange}
            />
            Remember session locally
          </label>

          <div className="flex flex-wrap gap-2">
            <ActionButton type="submit" disabled={loading || !isDesktopShell()}>
              {loading ? "Signing in..." : "Save Desktop Session"}
            </ActionButton>
            <ActionButton to="/desktop/local-memos" variant="ghost">
              Local Drafts
            </ActionButton>
          </div>
        </form>
      </SectionCard>

      {session?.user && (
        <SectionCard title="Current Desktop User">
          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              {session.user.name || session.user.username || "Authenticated user"}
            </p>
            <p className="mt-1">{session.user.role || "Role unavailable"}</p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
