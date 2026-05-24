# CFPS Temporary UAT Deployment

Target stack:

- Frontend: Vercel
- Backend: Render
- Database: Supabase PostgreSQL
- Uploads: Render local `/tmp/cfps-uploads` for temporary UAT only

This deployment is temporary and free-tier oriented. Final production should still use the single VPS plan so the backend, PostgreSQL, uploads, backups, and process manager are controlled together.

## Secrets

Do not commit real secrets. Configure these in the provider dashboards:

Render backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

Vercel frontend:

- `VITE_API_BASE_URL`

UAT seed step:

- `UAT_DEFAULT_PASSWORD` or role-specific `UAT_*_PASSWORD` values

## Supabase

1. Create a Supabase PostgreSQL project.
2. Copy a pooled PostgreSQL connection string with `sslmode=require`.
3. Use it as `DATABASE_URL`.
4. From `server/`, run:

```bash
npm run migrate
npm run seed:uat
```

The migration runner applies `server/src/db/sql/000_schema_baseline.sql` followed by the incremental SQL files.

## Render Backend

Use `render.yaml` or create a Web Service manually:

- Root directory: `server`
- Build command: `npm ci --omit=dev`
- Start command: `npm start`
- Runtime: Node
- Free plan

Set:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=10000
DATABASE_URL=<supabase-url>
JWT_SECRET=<32+ char secret>
CORS_ORIGIN=<vercel-url>
ENFORCE_HTTPS=true
TRUST_PROXY=true
UPLOAD_DIR=/tmp/cfps-uploads
DB_POOL_MAX=5
```

## Vercel Frontend

Deploy from `client/`.

Set:

```text
VITE_API_BASE_URL=<render-backend-url>
```

The frontend calls backend routes directly, for example `/auth/login` and `/memos`; do not append `/api`.

## Smoke Tests

Backend:

```bash
curl <render-backend-url>/health
curl -X POST <render-backend-url>/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"uat_cas","password":"<uat-password>"}'
```

Authenticated checks:

- `GET /memos`
- `GET /dashboard/summary`
- `GET /notifications`

Frontend:

- Open Vercel URL.
- Log in as CAS, PASO-CAS, AA-CAS, Monitor, Validator, and CAB UAT users.
- Verify dashboard and notifications.
- Verify mobile login.
- Verify desktop API setting points to the Render backend URL.

## Free-Tier Limits

- Render free services may sleep and cold-start slowly.
- Render local uploads under `/tmp` are ephemeral and can disappear on restart/redeploy.
- Supabase free project limits apply.
- Vercel preview/production URLs must be included in `CORS_ORIGIN` if both are used.
- This setup is for UAT only, not final production.
