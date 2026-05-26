const attachmentService = require("../services/attachmentService");
const { getMemoById } = require("../services/memoService");
const { successResponse, errorResponse } = require("../utils/responses");
const { validateAttachment } = require("../utils/validators");
const fs = require("fs");

async function uploadAttachment(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const memo = await getMemoById(req.params.id);

    const validationError = validateAttachment(memo, req.file);

    if (validationError) {
      removeUploadedFile(req.file?.path);

      return errorResponse(
        res,
        validationError,
        validationError === "Memo not found" ? 404 : 400
      );
    }

    const result = await attachmentService.createAttachment(
      id,
      userId,
      req.file,
      req.body
    );

    return successResponse(res, "Attachment uploaded successfully", result);
  } catch (err) {
    next(err);
  }
}

async function getAttachments(req, res, next) {
  try {
    const { id } = req.params;

    const data = await attachmentService.getAttachments(id);

    return successResponse(res, "Attachments fetched successfully", data);
  } catch (err) {
    next(err);
  }
}

async function deleteAttachment(req, res, next) {
  try {
    const { attachmentId } = req.params;

    const result = await attachmentService.deleteAttachment(attachmentId);

    return successResponse(res, "Attachment deleted successfully", result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
};

function removeUploadedFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Attachment validation failure must not be masked by cleanup errors.
  }
}
