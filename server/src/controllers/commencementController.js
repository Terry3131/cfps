const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { getMemoById } = require("../services/memoService");
const { logAudit } = require("../utils/audit");
const { isHeavyWorkflow } = require("../utils/workflowDoctrine");

const commenceMemoHandler = async (req, res, next) => {
  try {
    const { commencement_date, remarks = null } = req.body;

    if (!commencement_date) {
      return errorResponse(res, "commencement_date is required", 400);
    }

    const memo = await getMemoById(req.params.id);

    if (!memo) {
      return errorResponse(res, "Memo not found", 404);
    }

    if (memo.is_locked) {
      return errorResponse(res, "Locked memo cannot be commenced", 400);
    }

    if (!isHeavyWorkflow(memo.category)) {
      return errorResponse(
        res,
        "Light workflow memos do not require commencement tracking",
        400
      );
    }

    const result = await pool.query(
      `INSERT INTO memo_commencements (memo_id, commencement_date, remarks, recorded_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, commencement_date, remarks, req.user.id]
    );

    await pool.query(
      `UPDATE memos
       SET lifecycle_stage = 'COMMENCED',
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    await logAudit({
      userId: req.user.id,
      action: "COMMENCE_MEMO",
      entityType: "MEMO",
      entityId: req.params.id,
      metadata: { commencement_date }
    });

    return successResponse(res, "Memo commenced successfully", result.rows[0], 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  commenceMemoHandler
};
