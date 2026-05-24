import { useEffect, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

export default function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const res = await API.get("/categories");
        const data = unwrapResponse(res) || [];
        const activeCategories = data.filter((category) => category?.is_active !== false);

        if (mounted) {
          setCategories(activeCategories);
          setError("");
        }
      } catch (err) {
        if (mounted) {
          setError("Unable to load categories");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    categories,
    loading,
    error,
  };
}
