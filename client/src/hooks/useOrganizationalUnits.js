import { useCallback, useEffect, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

function normalizeOrganizationalUnitType(type) {
  if (!type) return "";

  const value = String(type).toUpperCase();

  if (value === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return value;
}

export default function useOrganizationalUnits(type = "") {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const normalizedType = normalizeOrganizationalUnitType(type);

  const loadUnits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get("/organizational-units");
      const data = unwrapResponse(res);

      const activeUnits = Array.isArray(data)
        ? data.filter((item) => item.is_active !== false)
        : [];

      const filteredUnits = normalizedType
        ? activeUnits.filter((item) => item.unit_type === normalizedType)
        : activeUnits;

      setUnits(filteredUnits);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load organizational units.");
    } finally {
      setLoading(false);
    }
  }, [normalizedType]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  return { units, loading, error, reload: loadUnits };
}
