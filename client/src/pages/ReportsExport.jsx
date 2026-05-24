import ActionButton from "../components/ActionButton";
import BackButton from "../components/BackButton";
import ErrorBox from "../components/ErrorBox";
import FormField from "../components/FormField";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import SelectField from "../components/SelectField";
import useReportExport from "../hooks/useReportExport";
import useFormState from "../hooks/useFormState";

export default function ReportsExport() {
  const { form, resetForm, updateField } = useFormState({
    format: "pdf",
    start_date: "",
    end_date: "",
  });

  const { loading, error, downloadMemoReport } = useReportExport();

  const downloadReport = async (e) => {
    e.preventDefault();

    await downloadMemoReport(form);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <BackButton fallback="/memos" />
      <PageHeader
        title="Reports / Export"
        subtitle="Export memo reports using backend endpoint GET /reports/memos."
      />

      <SectionCard
        title="Export Memo Report"
        subtitle="Choose a format and optional date range."
      >
        <ErrorBox message={error} className="mb-5" />

        <form onSubmit={downloadReport} className="space-y-5">
          <SelectField
            name="format"
            value={form.format}
            onChange={updateField}
            label="Export Format"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="excel">Excel</option>
            <option value="pdf">PDF</option>
          </SelectField>

          <FormField
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={updateField}
            label="Start Date"
          />

          <FormField
            name="end_date"
            type="date"
            value={form.end_date}
            onChange={updateField}
            label="End Date"
          />

          <div className="flex flex-wrap gap-2">
            <ActionButton type="submit" disabled={loading}>
              {loading ? "Downloading..." : "Download Report"}
            </ActionButton>

            <ActionButton
              type="button"
              variant="ghost"
              onClick={() => resetForm()}
            >
              Reset
            </ActionButton>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
