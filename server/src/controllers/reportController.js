const reportService = require("../services/reportService");
const { successResponse } = require("../utils/responses");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

function sanitizeSpreadsheetValue(value) {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@")
  ) {
    return `'${trimmed}`;
  }

  return trimmed;
}

function formatOrgDisplay(code, name) {
  if (code && name && code !== name) return `${code} - ${name}`;
  return code || name || "N/A";
}

async function getMemoReportsHandler(req, res, next) {
  try {
    const format = req.query.format || "json";
    const data = await reportService.getMemoReports(req.query);

    if (format === "json") {
      return successResponse(res, "Memo reports fetched successfully", data);
    }

    if (format === "csv") {
      const parser = new Parser();
      const sanitizedData = data.map((row) => {
        const sanitizedRow = {};

        Object.keys(row).forEach((key) => {
          sanitizedRow[key] = sanitizeSpreadsheetValue(row[key]);
        });

        return sanitizedRow;
      });

      const csv = parser.parse(sanitizedData);

      res.header("Content-Type", "text/csv");
      res.attachment("memo_reports.csv");

      return res.send(csv);
    }

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Memo Reports");

      worksheet.columns = [
        { header: "Reference No", key: "reference_no", width: 28 },
        { header: "Heading", key: "heading", width: 35 },
        { header: "Category", key: "category", width: 30 },
        { header: "Branch/DRU", key: "branch_dru_display", width: 36 },
        { header: "Primary Monitor Branch", key: "primary_monitor_branch_display", width: 36 },
        { header: "Validator Branch", key: "final_validator_branch_display", width: 36 },
        { header: "Beneficiary", key: "beneficiary_name", width: 28 },
        { header: "Amount", key: "amount", width: 16 },
        { header: "Currency", key: "currency", width: 12 },
        { header: "Approval Status", key: "approval_status", width: 18 },
        { header: "Business Status", key: "business_status", width: 18 },
        { header: "Lifecycle Stage", key: "lifecycle_stage", width: 20 },
        { header: "Progress %", key: "progress_percent", width: 12 },
        { header: "Created At", key: "created_at", width: 28 },
        { header: "Updated At", key: "updated_at", width: 28 },
      ];

      worksheet.getRow(1).font = { bold: true };

      data.forEach((memo) => {
        const memoWithDisplays = {
          ...memo,
          branch_dru_display: formatOrgDisplay(memo.branch_dru, memo.branch_dru_name),
          primary_monitor_branch_display: formatOrgDisplay(memo.primary_monitor_branch, memo.primary_monitor_branch_name),
          final_validator_branch_display: formatOrgDisplay(memo.final_validator_branch, memo.final_validator_branch_name),
        };
        const sanitizedMemo = {};

        Object.keys(memoWithDisplays).forEach((key) => {
          sanitizedMemo[key] = sanitizeSpreadsheetValue(memoWithDisplays[key]);
        });

        worksheet.addRow(sanitizedMemo);
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=memo_reports.xlsx"
      );

      return workbook.xlsx.write(res).then(() => {
        res.end();
      });
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40, size: "A4" });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=memo_reports.pdf"
      );

      doc.pipe(res);

      doc.fontSize(16).text("Memo Reports", { align: "center" });
      doc.moveDown();

      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
      doc.text(`Total Records: ${data.length}`);
      doc.moveDown();

      data.forEach((memo, index) => {
        doc
          .fontSize(11)
          .text(`${index + 1}. ${memo.reference_no || "N/A"}`, {
            underline: true,
          });

        doc.fontSize(9);
        doc.text(`Heading: ${memo.heading || "N/A"}`);
        doc.text(`Category: ${memo.category || "N/A"}`);
        doc.text(`Branch/DRU: ${formatOrgDisplay(memo.branch_dru, memo.branch_dru_name)}`);
        doc.text(`Primary Monitor Branch: ${formatOrgDisplay(memo.primary_monitor_branch, memo.primary_monitor_branch_name)}`);
        doc.text(`Validator Branch: ${formatOrgDisplay(memo.final_validator_branch, memo.final_validator_branch_name)}`);
        doc.text(`Beneficiary: ${memo.beneficiary_name || "N/A"}`);
        doc.text(`Amount: ${memo.currency || ""} ${memo.amount || "0.00"}`);
        doc.text(`Approval Status: ${memo.approval_status || "N/A"}`);
        doc.text(`Business Status: ${memo.business_status || "N/A"}`);
        doc.text(`Lifecycle Stage: ${memo.lifecycle_stage || "N/A"}`);
        doc.text(`Progress: ${memo.progress_percent || 0}%`);
        doc.text(`Created At: ${memo.created_at || "N/A"}`);
        doc.moveDown();

        if (doc.y > 720) {
          doc.addPage();
        }
      });

      doc.end();
      return;
    }

    const error = new Error("Unsupported format");
    error.statusCode = 400;
    throw error;
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMemoReportsHandler,
};
