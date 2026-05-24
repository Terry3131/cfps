const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const upload = require("../config/multer");

function removeUploadedFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // ignore file cleanup errors
  }
}

function startsWithBytes(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function validateUploadedFileContent(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const buffer = fs.readFileSync(file.path);
  const header = buffer.subarray(0, 512);
  const headerText = header.toString("utf8").trimStart().toLowerCase();

  const isExecutableLike =
    startsWithBytes(header, [0x4d, 0x5a]) ||
    headerText.startsWith("#!") ||
    headerText.startsWith("<?php") ||
    headerText.startsWith("<script") ||
    headerText.includes("<script");

  const isPdf = header.toString("latin1", 0, 4) === "%PDF";
  const isJpeg = startsWithBytes(header, [0xff, 0xd8, 0xff]);
  const isPng = startsWithBytes(header, [
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]);
  const isZipOfficeFile = startsWithBytes(header, [0x50, 0x4b]);

  const contentMatchesExtension =
    (ext === ".pdf" && isPdf) ||
    ((ext === ".jpg" || ext === ".jpeg") && isJpeg) ||
    (ext === ".png" && isPng) ||
    ((ext === ".docx" || ext === ".xlsx") && isZipOfficeFile);

  if (isExecutableLike || !contentMatchesExtension) {
    removeUploadedFile(file.path);
    throw Object.assign(new Error("Unsupported file content"), {
      statusCode: 400,
    });
  }
}

async function createAttachment(memoId, userId, file, body) {
  validateUploadedFileContent(file);

  const memoCheck = await db.query(
    "SELECT is_locked, is_completed FROM memos WHERE id = $1",
    [memoId]
  );

  if (memoCheck.rows.length === 0) {
    removeUploadedFile(file.path);
    throw Object.assign(new Error("Memo not found"), { statusCode: 404 });
  }

  const memo = memoCheck.rows[0];

  if (memo.is_locked || memo.is_completed) {
    removeUploadedFile(file.path);
    throw Object.assign(
      new Error("Cannot upload attachment to locked or completed memo"),
      { statusCode: 400 }
    );
  }

  const result = await db.query(
    `
    INSERT INTO memo_attachments (
      memo_id,
      uploaded_by,
      file_name,
      file_type,
      file_size,
      file_url,
      attachment_category,
      description
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
    `,
    [
      memoId,
      userId,
      file.originalname,
      file.mimetype,
      file.size,
      `/uploads/memo-attachments/${file.filename}`,
      body.attachment_category || null,
      body.description || null,
    ]
  );

  return result.rows[0];
}

async function getAttachments(memoId) {
  const result = await db.query(
    "SELECT * FROM memo_attachments WHERE memo_id = $1 ORDER BY created_at DESC",
    [memoId]
  );

  return result.rows;
}

async function deleteAttachment(attachmentId) {
  const record = await db.query(
    "SELECT * FROM memo_attachments WHERE id = $1",
    [attachmentId]
  );

  if (record.rows.length === 0) {
    throw Object.assign(new Error("Attachment not found"), { statusCode: 404 });
  }

  const attachment = record.rows[0];

  const uploadsBaseDir = upload.memoAttachmentDir;

  const safeFileName = path.basename(attachment.file_url);

  const filePath = path.resolve(
    uploadsBaseDir,
    safeFileName
  );

  if (!filePath.startsWith(uploadsBaseDir)) {
    throw Object.assign(
      new Error("Invalid attachment path"),
      { statusCode: 400 }
    );
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // ignore file delete errors
  }

  await db.query("DELETE FROM memo_attachments WHERE id = $1", [
    attachmentId,
  ]);

  return { success: true };
}

module.exports = {
  createAttachment,
  getAttachments,
  deleteAttachment,
};
