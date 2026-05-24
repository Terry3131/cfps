import { useCallback, useEffect, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

export default function useDashboardSummary() {
  const [summary, setSummary] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/dashboard/summary");
      const data = unwrapResponse(res);

      setSummary(data || {});
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to load dashboard summary."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    summary,
    loading,
    error,
    reload: loadSummary,
  };
}