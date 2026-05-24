import { useCallback, useEffect, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

export default function useMemoDetails(id) {
  const [memo, setMemo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMemo = useCallback(async () => {
    if (!id) {
      setMemo(null);
      setError("Memo ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/memos/${id}`);
      const data = unwrapResponse(res);

      setMemo(data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load memo details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMemo();
  }, [loadMemo]);

  return {
    memo,
    loading,
    error,
    setError,
    reload: loadMemo,
  };
}
