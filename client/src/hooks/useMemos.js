import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

export default function useMemos(filters = {}) {
  const [memos, setMemos] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const queryKey = useMemo(() => JSON.stringify(filters || {}), [filters]);

  const loadMemos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = Object.fromEntries(
        Object.entries(filters || {}).filter(([, value]) => value !== "" && value !== null && value !== undefined)
      );
      const res = await API.get("/memos", { params });
      const data = unwrapResponse(res);

      if (Array.isArray(data)) {
        setMemos(data);
        setPagination(null);
      } else {
        setMemos(Array.isArray(data?.items) ? data.items : []);
        setPagination(data?.pagination || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load memos.");
    } finally {
      setLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  return {
    memos,
    pagination,
    loading,
    error,
    reload: loadMemos,
  };
}
