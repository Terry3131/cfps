# Backend Role Matrix

This document is the backend source of truth for workflow authorization. Frontend and desktop clients should not guess workflow ownership from UI state.

| Area | Endpoint(s) | Backend access |
| --- | --- | --- |
| Approve | `POST /memos/:id/approve` | `SUPER_ADMIN`, `REGISTRY` |
| Assign | `POST /memos/:id/assign` | `SUPER_ADMIN`, `REGISTRY` |
| Release | `POST /memos/:id/release` | `SUPER_ADMIN`, `CAB`, `CASH_OFFICE` |
| Commence | `POST /memos/:id/commencement` | `SUPER_ADMIN`, `MONITOR` |
| Progress | `POST /memos/:id/progress` | `SUPER_ADMIN`, `MONITOR` |
| Validate | `POST /memos/:id/validate` | `SUPER_ADMIN`, `VALIDATOR` |
| Archive | `POST /memos/:id/archive` | `SUPER_ADMIN`, `REGISTRY` |
| Attachments list | `GET /memos/:id/attachments` | Any authenticated user |
| Attachments upload | `POST /memos/:id/attachments` | `SUPER_ADMIN`, `REGISTRY`, `MONITOR`, `VALIDATOR`, `CASH_OFFICE` |
| Attachments delete | `DELETE /memos/:id/attachments/:attachmentId` | `SUPER_ADMIN`, `REGISTRY`, `MONITOR`, `VALIDATOR`, `CASH_OFFICE` |
| Reports | `GET /reports/memos` | `SUPER_ADMIN`, `CAS` |
| Dashboard | `GET /dashboard/*` | `SUPER_ADMIN`, `CAS`, `CAB`, `CASH_OFFICE`, `MONITOR` |
| Notifications list | `GET /notifications` | Authenticated user sees notifications scoped to their `target_user_id`, their `target_role`, or global notifications where both `target_user_id IS NULL` and `target_role IS NULL`. |
| Notifications mark read | `PATCH /notifications/:id/read` | Authenticated user may mark only notifications scoped to their `target_user_id`, their `target_role`, or global notifications where both `target_user_id IS NULL` and `target_role IS NULL`. |
| Notifications mark all read | `PATCH /notifications/read-all` | Authenticated user may mark only notifications scoped to their `target_user_id`, their `target_role`, or global notifications where both `target_user_id IS NULL` and `target_role IS NULL`. |

Notes:
- Global notifications are represented by `target_user_id IS NULL AND target_role IS NULL`.
- Memo state validators still apply after role checks.
- Approval is restricted to `SUPER_ADMIN` and `REGISTRY` unless a later Integrator role matrix revision changes it.
