// Attachments page placeholder
import { useState } from "react";
import ConfirmButton from "../components/ConfirmButton";
import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import EmptyState from "../components/EmptyState";
import ErrorBox from "../components/ErrorBox";
import LoadingBox from "../components/LoadingBox";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import { useParams } from "react-router-dom";
import { formatFileSize } from "../utils/file";
import FormField from "../components/FormField";
import TextAreaField from "../components/TextAreaField";
import FileInput from "../components/FileInput";
import useAttachments from "../hooks/useAttachments";
import useMemoDetails from "../hooks/useMemoDetails";
import { isMemoReadOnly } from "../utils/memoFields";

export default function Attachments() {
  const { id } = useParams();
  const { memo, loading: memoLoading } = useMemoDetails(id);
  const readOnly = isMemoReadOnly(memo);

  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [attachmentCategory, setAttachmentCategory] = useState("");
  const [description, setDescription] = useState("");

  const {
    attachments,
    error,
    pageLoading,
    uploading,
    uploadAttachment,
    deleteAttachment,
  } = useAttachments(id);

  const handleUploadAttachment = async (e) => {
    e.preventDefault();

    if (readOnly) {
      return;
    }

    const success = await uploadAttachment({
      file,
      attachmentCategory,
      description,
    });

    if (success) {
      setFile(null);
      setAttachmentCategory("");
      setDescription("");
      setFileInputKey(Date.now());
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (readOnly) {
      return;
    }

    await deleteAttachment(attachmentId);
  };

  return (
    <div className="space-y-5">
      <BackButton fallback={`/memos/${id}`} />
      <PageHeader
        title="Memo Attachments"
        subtitle="Upload and manage files attached to this memo."
      />

      <ErrorBox message={error} />

      {readOnly && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 rounded-lg text-sm font-medium">
          Locked / Archived. Attachments are read-only for this memo.
        </div>
      )}

      {!readOnly && (
        <SectionCard
          title="Upload Attachment"
          subtitle="Supported files depend on backend validation rules."
        >
          <form onSubmit={handleUploadAttachment} className="space-y-4">
            <FileInput
              key={fileInputKey}
              label="Select Attachment"
              onChange={(e) => setFile(e.target.files[0])}
            />

            <FormField
              value={attachmentCategory}
              onChange={(e) => setAttachmentCategory(e.target.value)}
              label="Attachment Category"
              placeholder="Attachment category"
            />

            <TextAreaField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              label="Description"
              placeholder="Description"
              rows={3}
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <ActionButton type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Attachment"}
              </ActionButton>

              <ActionButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setAttachmentCategory("");
                  setDescription("");
                  setFileInputKey(Date.now());
                }}
              >
                Reset
              </ActionButton>
            </div>
          </form>
        </SectionCard>
      )}

      {pageLoading || memoLoading ? (
        <LoadingBox message="Loading attachments..." />
      ) : attachments.length === 0 ? (
        <EmptyState
          title="No attachments found."
          message="Uploaded files for this memo will appear here."
        />
      ) : (
        <SectionCard bodyClassName="p-0" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="text-left p-3">File Name</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Size</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {attachments.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-3 text-slate-900 font-medium break-all">
                      {item.file_name || "N/A"}
                    </td>
                    <td className="p-3 text-slate-700">{item.file_type || "N/A"}</td>
                    <td className="p-3 text-slate-700">{formatFileSize(item.file_size)}</td>
                    <td className="p-3 text-slate-700">{item.attachment_category || "N/A"}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        {(item.file_url || item.url || item.path) && (
                          <a
                            href={item.file_url || item.url || item.path}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                          >
                            View / Download
                          </a>
                        )}

                        {!readOnly && (
                          <ConfirmButton
                            message="Delete this attachment?"
                            onConfirm={() => handleDeleteAttachment(item.id)}
                            className="text-red-700 font-semibold hover:text-red-900"
                          >
                            Delete
                          </ConfirmButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
