const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sanitize = require("sanitize-filename");
const { UPLOAD_DIR } = require("./env");

const uploadRoot = path.resolve(
  UPLOAD_DIR || path.join(__dirname, "../../uploads")
);
const uploadDir = path.join(uploadRoot, "memo-attachments");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".docx",
  ".xlsx"
];

const DANGEROUS_EXTENSIONS = [
  ".php",
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".js"
];

const DANGEROUS_MIME_TYPES = [
  "application/javascript",
  "application/x-javascript",
  "application/x-msdownload",
  "application/x-sh",
  "text/javascript",
  "text/x-shellscript"
];

function unsupportedFileTypeError() {
  return Object.assign(new Error("Unsupported file type"), { statusCode: 400 });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const originalExt = path.extname(file.originalname).toLowerCase();

    const safeBaseName = sanitize(
      path.basename(file.originalname, originalExt)
    )
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "");

    const uniqueSuffix =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, `${safeBaseName}-${uniqueSuffix}${originalExt}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const baseName = path.basename(file.originalname, ext);
  const lowerName = file.originalname.toLowerCase();

  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
  const hasDangerousExtension = DANGEROUS_EXTENSIONS.some((dangerousExt) =>
    lowerName.endsWith(dangerousExt) || lowerName.includes(`${dangerousExt}.`)
  );
  const hasDoubleExtension = baseName.includes(".");
  const dangerousMime = DANGEROUS_MIME_TYPES.includes(file.mimetype);

  if (
    !mimeAllowed ||
    !extAllowed ||
    hasDangerousExtension ||
    hasDoubleExtension ||
    dangerousMime
  ) {
    return cb(
      unsupportedFileTypeError(),
      false
    );
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

upload.uploadRoot = uploadRoot;
upload.memoAttachmentDir = uploadDir;

module.exports = upload;
