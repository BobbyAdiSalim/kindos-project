# GitHub Workflows

This document describes the GitHub Actions CI/CD workflows for the UTLWA project.

## Overview

The project uses a **gated deployment model**: 
1. **CI workflow** runs tests, linting, and security scans on every push and pull request
2. **Deploy workflows** only trigger when CI succeeds
3. Deployments are automatic on push to `develop` and `main` branches

```
Code Push
    ↓
[CI: Lint, Test, Security] ← Mandatory gate
    ↓ (if successful)
[Backend Deploy] ─→ Cloud Run
  ↓
[Database Migrations]

[Frontend Deploy] ─→ Firebase Hosting
```

---

## Workflows

### 1. `ci.yml` — Continuous Integration

**Trigger**: Every push and pull request

**Jobs**:
- **`lint`** — Run ESLint on `frontend/` and `backend/`
  - Runs on Node 20
  - Matrix: frontend and backend (2 parallel jobs)
  - Caches dependencies via `package-lock.json`
- **`unit-tests`** — Run Vitest on `frontend/` and `backend/`
  - Same matrix and caching as lint
- **`security-scan`** — Run `npm audit` on backend dependencies
  - Only runs on pushes to `develop`/`main` or manual workflow dispatch
  - Checks for high-severity vulnerabilities (`--audit-level=high`)
  - Omits dev dependencies (`--omit=dev`)

**Demo features**:
- Optional `force_lint_failure` input (workflow dispatch) to simulate lint failure
- Optional `force_security_failure` input to simulate security failure
- Used for testing enforcement of CI gates

**Exit criteria**:
- All lint jobs pass (no ESLint errors)
- All test jobs pass (100% test suite)
- All security jobs pass (no high-severity audit findings)

If CI fails, deploy workflows will not trigger automatically.

---

### 2. `deploy-backend.yml` — Backend Deployment

**Trigger**: 
- Automatically when CI succeeds on push to `develop` or `main`
- Or manually via `workflow_dispatch` (allows selecting branch: develop | main)

**Jobs**:
- **`deploy-backend`** (single job, runs sequentially with migration job):
  1. **Authenticate to GCP** using `GCP_SA_KEY` secret
  2. **Build Docker image** from `backend/Dockerfile`
     - Tags: `us-central1-docker.pkg.dev/{PROJECT_ID}/utlwa-backend/backend:{branch}-{sha}` and `:branch-latest`
  3. **Push to Artifact Registry** in Google Cloud
  4. **Deploy to Cloud Run**
     - Service name: `utlwa-backend`
     - Region: `us-central1` 
     - Attaches Cloud SQL instance: `utlwa-postgres`
     - Sets environment variables (NODE_ENV, DB config, API keys, etc.)
     - Binds secrets from Google Secret Manager (JWT_SECRET, PG_PWD)
  5. **Run database migrations**
     - Creates/updates Cloud Run Job `utlwa-db-migrate`
     - Executes `npm run migrate` with same DB config
     - Waits for job to complete before marking workflow as done

**Secrets required** (stored in GitHub Actions):
- `GCP_SA_KEY` — Service account JSON key (Google Cloud)
- `FIREBASE_SERVICE_ACCOUNT_KEY` — Firebase Hosting deploy service account JSON key
- `R2_*` — Cloudflare R2 credentials (for doctor document storage)

**Variables required** (stored in GitHub Actions):
- `GCP_PROJECT_ID` — Google Cloud project ID
- `FIREBASE_PROJECT_ID` — Firebase project ID
- `FRONTEND_URL` — Public frontend domain (e.g., https://example.com)
- non-sensitive `R2_*` config values (account ID, bucket, endpoint, public base URL)

**Secrets in Google Secret Manager** (accessed by Cloud Run):
- `JWT_SECRET` — JWT signing key
- `PG_PWD` — PostgreSQL password

**Output**: 
- Deployment summary posted to GitHub Actions (service URL, branch, commit hash)

---

### 3. `deploy-frontend.yml` — Frontend Deployment

**Trigger**: 
- Automatically when CI succeeds on push to `develop` or `main`
- Or manually via `workflow_dispatch`

**Jobs**:
- **`deploy-frontend`** (single job):
  1. **Checkout** code
  2. **Install frontend dependencies** (`npm ci`)
  3. **Build frontend** (`npm run build` → `frontend/dist/`)
  4. **Deploy to Firebase Hosting** using Firebase CLI
      - Uses service account ADC via `google-github-actions/auth`
      - Targets `FIREBASE_PROJECT_ID` variable
     - Only deploys Hosting (not other Firebase services)

**Rewrite routing** (defined in `firebase.json`):
- `/api/*` → rewrites to Cloud Run service `utlwa-backend`
- `/**` → serves `index.html` (SPA routing)

**Output**: 
- Deployment summary posted to GitHub Actions

---

## Scheduling & Parallelization

```
        [CI] (always on push)
         ↓ (success only)
    ┌────┴────┐
    ↓         ↓
[Backend Deploy] [Frontend Deploy]  ← Both run in parallel
    ↓                              (no dependency between them)
[Migrations]
    ↓
Both services live
```

- CI runs first and gates all deployments
- Backend and frontend deployments run **in parallel** (no cross-dependency)
- Migrations run as part of the backend deployment job
- If either deploy workflow fails, services are not re-deployed

---

## Artifacts & Registry

### Docker Images
- **Registry**: Google Artifact Registry (`us-central1`)
- **Repository**: `utlwa-backend`
- **Image naming**: `us-central1-docker.pkg.dev/{PROJECT_ID}/utlwa-backend/backend`
- **Tags**:
  - `develop-{commit_sha}` — Every develop push
  - `develop-latest` — Latest develop commit
  - `main-{commit_sha}` — Every main push
  - `main-latest` — Latest production commit

### Frontend Build
- **Output directory**: `frontend/dist/`
- **Hosting**: Firebase Hosting
- **Routing**: Configured in `firebase.json` (rewrites to Cloud Run for API calls)

---

## GCP Service Account

The deploy workflows use a dedicated Google Cloud service account (`github-actions-deployer`) with minimal permissions:

**Roles**:
- ✅ Cloud Run Admin — Deploy and manage Cloud Run services
- ✅ Artifact Registry Service Agent — Push/pull Docker images
- ✅ Secret Manager Secret Accessor — Read JWT_SECRET and PG_PWD at runtime
- ✅ Cloud SQL Client — Execute database operations
- ✅ Cloud SQL Instance User — Connect to Cloud SQL from Cloud Run

**No roles**:
- ❌ Editor / Owner (overly permissive, not needed)
- ❌ Storage Admin (not used by backend)
- ❌ Compute Admin (too broad; we only use Cloud Run, not VMs)

---

## Firebase Authentication

**Firebase deploy credentials**:
1. Create a dedicated service account key for Firebase Hosting deployment
2. Store it as `FIREBASE_SERVICE_ACCOUNT_KEY` GitHub Actions secret
3. `deploy-frontend.yml` authenticates via ADC (`GOOGLE_APPLICATION_CREDENTIALS` managed by auth action)

Credential setup is a one-time manual step (see setup docs below).

---

## Monitoring & Logs

### GitHub Actions UI
- All workflow runs visible in **Actions** tab
- Per-job logs available (click workflow run → click job)
- Deployment summaries shown in **Step Summary** section

### Cloud Run Logs
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="utlwa-backend"' --limit=50
```

### Firebase Hosting Deploy Logs
- Available in Firebase Console → Hosting → Releases

---

## Manual Overrides

**Rerun a failed deployment**:
1. Go to **Actions** → failed workflow run
2. Click **Re-run failed jobs** or **Re-run all jobs**

**Deploy without CI**:
- Use `workflow_dispatch` on deploy workflows (not recommended; CI gates are there for a reason)
- Requires manually selecting the branch to deploy

**Emergency rollback**:
```bash
# List Cloud Run revisions
gcloud run revisions list --service utlwa-backend --region us-central1

# Route traffic to previous revision
gcloud run services describe utlwa-backend --region us-central1  # see current setup
gcloud run services update-traffic utlwa-backend --region us-central1 --to-revisions PREVIOUS_REVISION_ID=100
```

---

## Setup Guide

See [GCP Service Account Setup](#) and [Firebase Authentication Setup](#) for initial one-time configuration.

---

## Troubleshooting

### Deploy workflow won't trigger after CI success
- **Check**: Are you pushing to `develop` or `main`? (workflow_run triggers only on these branches)
- **Check**: Did CI actually pass? (look at CI workflow run first)
- **Fix**: Manual trigger via `workflow_dispatch` to debug

### Docker image build fails
- **Check**: Is `backend/Dockerfile` valid? Run `docker build ./backend` locally
- **Check**: Are dependencies missing? Check `backend/package-lock.json`

### Cloud Run deployment fails
- **Check**: Are secrets (`JWT_SECRET`, `PG_PWD`) configured in Google Secret Manager?
- **Check**: Is Cloud SQL instance `utlwa-postgres` accessible?
- **Check**: Are IAM permissions correct on the service account?
- **Check logs**: `gcloud run services describe utlwa-backend --region us-central1`

### Database migrations fail
- **Check**: Does `npm run migrate` work locally?
- **Check**: Are migrations files in `backend/db/migrations/`?
- **Check**: Is Cloud SQL password correct in `PG_PWD` secret?

### Frontend deploy fails
- **Check**: Does `npm run build` work locally in `frontend/`?
- **Check**: Is `FIREBASE_SERVICE_ACCOUNT_KEY` present and valid JSON?
- **Check**: Does the service account have Firebase Hosting deploy permissions?
- **Check**: Is `FIREBASE_PROJECT_ID` variable correct?

---

## Related Documentation

- [DEPLOYMENT.md](../DEPLOYMENT.md) — Detailed cloud infrastructure setup guide
- [CLAUDE.md](../CLAUDE.md) — Project overview and architecture
- [GCP Service Account Setup](./GCP_SERVICE_ACCOUNT_SETUP.md) — Create service account for CI/CD
- [Firebase Authentication Setup](./FIREBASE_AUTH_SETUP.md) — Generate Firebase CLI token
