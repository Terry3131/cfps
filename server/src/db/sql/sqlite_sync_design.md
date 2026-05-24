# SQLite Sync Design

## Sync Timestamp Standard

All sync timestamps MUST use UTC ISO 8601 format.

Example:

2026-05-09T12:30:00.000Z

Required rule:

Use:

new Date().toISOString()

Do NOT use:

- toLocaleString()
- local timezone strings
- browser-formatted dates
- non-UTC timestamps

This applies to:

- last_modified_at
- synced_at
- sync conflict timestamps

---

# Conflict Strategy

## Official Conflict Rule

1. Match records using sync_id
2. Higher version wins
3. If version is equal:
   newer last_modified_at wins
4. If both are equal:
   server wins
5. Log unresolved conflict in sync_conflicts

This replaces the old timestamp-first rule.

---

# Offline Write Scope

## Offline write support currently allowed

Only:

- memos

## Offline write support NOT YET allowed

Until safe sync columns are added and approved:

- memo_progress_logs
- memo_validations
- memo_attachments
- notifications

The desktop app MUST block offline write actions for:

- progress update
- validation decision
- attachment upload/delete
- notification mark-as-read

These operations currently require online/server mode.

---

# Current Sync Tables

Server:

- sync_queue
- sync_conflicts

SQLite mirror currently prepared for:

- memos

---

# Required Sync Fields

Each syncable table should include:

- sync_id
- version
- last_modified_at
- sync_status
- synced_at

---

# Sync Status Values

- PENDING
- SYNCED
- CONFLICT
- FAILED

---

# Safety Rule

No additional sync columns should be added to live workflow tables without Integrator approval.