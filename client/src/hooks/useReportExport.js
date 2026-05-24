import { useState } from "react";
import API from "../api/api";

export default function useReportExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const downloadMemoReport = async ({ format, start_date, end_date }) => {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams();

      query.append("format", format);

      if (start_date) query.append("start_date", start_date);
      if (end_date) query.append("end_date", end_date);

      const res = await API.get(`/reports/memos?${query.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const fileExtension = format === "excel" ? "xlsx" : format;
      const link = document.createElement("a");

      link.href = url;
      link.download = `memo-report.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to download report.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setError,
    downloadMemoReport,
  };
}