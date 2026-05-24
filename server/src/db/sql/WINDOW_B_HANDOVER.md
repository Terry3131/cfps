# WINDOW B HANDOVER

## STATUS
COMPLETED

## DATABASE
Using existing PostgreSQL database:

cfps_db

No separate database created.

## VERIFIED EXISTING TABLES

- memos
- memo_assignments
- memo_releases
- memo_commencements
- memo_progress_logs
- memo_validations
- memo_attachments
- notifications
- audit_logs
- users

## ACTIONS COMPLETED

### Performance Indexes Added

Indexes added on:

- memo reference
- approval status
- lifecycle stage
- business status
- category
- branch_dru
- created_at
- updated_at
- progress reports
- validations
- releases
- notifications
- audit logs
- attachments

### Sync Preparation

Safe sync columns added to:

memos

Added fields:

- sync_id
- version
- last_modified_at
- sync_status

Indexes added for sync operations.

### New Tables Added

- sync_queue
- sync_conflicts

### SQLite Preparation Files Added

- sqlite_sync_design.md
- sqlite_memo_mirror.sql
- sqlite_sync_queue.sql
- sqlite_sync_conflicts.sql

## IMPORTANT SAFETY NOTE

roles, branches, and categories tables were NOT created because Window A backend currently uses:

- users.role
- users.branch_dru
- memos.category
- memos.branch_dru

Creating relational replacements now could break backend contracts.

## CONFLICT STRATEGY

Official Integrator-approved sync rule:

1. Match by sync_id
2. Higher version wins
3. If version is equal:
   newer last_modified_at wins
4. If both are equal:
   server wins final tie
5. Conflicts logged in sync_conflicts

## UTC TIMESTAMP STANDARD

All sync timestamps MUST use UTC ISO 8601 format.

Example:

2026-05-09T12:30:00.000Z

Required implementation:

new Date().toISOString()

Never use:

- toLocaleString()
- local timezone strings
- browser-local formatted dates

## OFFLINE WRITE LIMITATION

Offline write support is currently approved ONLY for:

- memos

Offline writes are NOT approved yet for:

- memo_progress_logs
- memo_validations
- memo_attachments
- notifications

Desktop/offline clients must block offline write attempts for those modules until Integrator approval.

## STATUS

Window B PostgreSQL indexing and sync foundation completed successfully without breaking Window A APIs.