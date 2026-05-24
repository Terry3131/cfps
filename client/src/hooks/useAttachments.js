import { useCallback, useEffect, useState } from "react";
import API from "../api/api";
import { unwrapResponse } from "../utils/unwrap";

export default function useAttachments(memoId) {
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadAttachments = useCallback(async () => {
    if (!memoId) {
      setAttachments([]);
      setError("Memo ID is missing.");
      setPageLoading(false);
      return;
    }

    try {
      setPageLoading(true);
      setError("");

      const res = await API.get(`/memos/${memoId}/attachments`);
      const data = unwrapResponse(res);

      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load attachments.");
    } finally {
      setPageLoading(false);
    }
  }, [memoId]);

  const uploadAttachment = async ({ file, attachmentCategory, description }) => {
    if (!file) {
      setError("Please select a file first.");
      return false;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("attachment_category", attachmentCategory);
      formData.append("description", description);

      await API.post(`/memos/${memoId}/attachments`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await loadAttachments();
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to upload attachment.");
      return false;
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId) => {
    try {
      setError("");

      await API.delete(`/memos/${memoId}/attachments/${attachmentId}`);
      await loadAttachments();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete attachment.");
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  return {
    attachments,
    error,
    pageLoading,
    uploading,
    uploadAttachment,
    deleteAttachment,
    setError,
    reload: loadAttachments,
  };
}
