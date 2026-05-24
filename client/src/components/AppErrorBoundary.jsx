import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application render failed", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
          <div className="mx-auto max-w-3xl rounded-3xl border border-red-200 bg-white p-6 shadow-xl shadow-slate-900/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Dashboard Render Error</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">Unable to load this page</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
              The page hit an unexpected frontend render error. Reload after the latest update; if it repeats, share this message with support.
            </p>
            <pre className="mt-4 max-h-52 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-semibold text-slate-100">
              {this.state.error?.message || "Unknown render error"}
            </pre>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
                window.location.assign("/cas/dashboard");
              }}
              className="mt-5 rounded-xl bg-[#071f3f] px-4 py-2 text-sm font-black text-white"
            >
              Reload CAS Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
