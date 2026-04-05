# Deployment Guide

## ⚡ Quick Start: Automated Deployment

**Most deployments are now automated via GitHub Actions!**

### For developers: Just push code to `master`

1. Make changes in a feature branch
2. Open a pull request to `master`
3. GitHub Actions CI runs automatically (lint, test, security checks)
4. Once CI passes and PR is merged:
  - **Backend** automatically builds, pushes to Artifact Registry, deploys a canary revision, runs canary analysis, and promotes only on success
   - **Frontend** automatically builds and deploys to Firebase Hosting
   - **Database migrations** run automatically as part of backend deployment

### One-time setup required:

Before automated deployments can start, you need to configure GitHub Actions secrets:

1. **GCP Service Account**: Follow [GCP_SERVICE_ACCOUNT_SETUP.md](.github/workflows/GCP_SERVICE_ACCOUNT_SETUP.md)
   - Creates service account with minimal permissions
   - Generates JSON key and stores it in GitHub Secrets
2. **Firebase Token**: Follow [FIREBASE_AUTH_SETUP.md](.github/workflows/FIREBASE_AUTH_SETUP.md)
   - Generates Firebase CLI token for hosting deployments
   - Stores token in GitHub Secrets

After setup, you never need to run manual deployment commands again. 🎉

### View deployment status:

All deployment runs are visible in the **Actions** tab of your GitHub repository:
- Click on a workflow run to see logs
- Check deployment summaries in **Step Summary** section

### Related documentation:

- [.github/workflows/README.md](.github/workflows/README.md) — Workflow architecture and troubleshooting
- [GCP_SERVICE_ACCOUNT_SETUP.md](.github/workflows/GCP_SERVICE_ACCOUNT_SETUP.md) — Create GCP service account
- [FIREBASE_AUTH_SETUP.md](.github/workflows/FIREBASE_AUTH_SETUP.md) — Generate Firebase token

---

## Manual Deployment (Advanced / First-Time Setup)

The sections below describe **manual deployment steps**. These are:
- **Optional** if you've set up CI/CD (you probably don't need them)
- **Necessary** for initial infrastructure setup (Cloud SQL, Artifact Registry, etc.)
- **Useful** for debugging or emergency fixes

If you're just updating code: stop here, push to `master`, and let GitHub Actions handle it.

---

## 1. Before You Deploy

Make sure your local tooling and cloud project are ready.

### Local prerequisites

- Node.js and npm installed
- Docker installed and running
- Google Cloud CLI installed and authenticated
- Firebase CLI available through npx

Check the Firebase CLI and current Firebase login/project:

```bash
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login:list
npx -y firebase-tools@latest use
```

Expected outcomes:

- Firebase CLI prints a version number
- You see the current logged-in account
- You see an active Firebase project ID

Check the active Google Cloud project:

```bash
gcloud config get-value project
```

If the Firebase project and Google Cloud project are not the same project family, stop and confirm which one is the source of truth before deploying.

## 2. Decide What Stage You Are In

Use this as the decision tree.

### Stage A: Nothing exists yet

Use this if you do not yet have:

- a Cloud SQL PostgreSQL instance
- a backend image in Artifact Registry
- a Cloud Run backend service
- a Firebase Hosting deployment

Go to sections 3 through 7 in order.

### Stage B: Cloud SQL exists, but the backend does not

Use this if the database already exists, but backend images or Cloud Run are not deployed yet.

Skip the Cloud SQL creation steps in section 3 and continue with sections 4 through 7.

### Stage C: Backend exists, but frontend is not deployed

Use this if Cloud Run is already serving the backend, but Firebase Hosting is not deployed or needs a refresh.

Skip to section 7 after verifying section 5.

### Stage D: Everything exists, but you need to update it

Use this for normal updates:

- rebuild Docker image
- push image
- redeploy Cloud Run
- rebuild frontend
- redeploy Firebase Hosting

Follow sections 4, 6, and 7.

## 3. Cloud SQL Setup

This project uses PostgreSQL. In production, the backend should connect to Cloud SQL rather than a local database.

### 3.1 Check whether Cloud SQL already exists

List instances:

```bash
gcloud sql instances list
```

If you already have a PostgreSQL instance for this project, note:

- instance name
- region
- connection name

Describe the instance:

```bash
gcloud sql instances describe utlwa-postgres
```

If that name does not exist, replace it with your actual instance name.

### 3.2 If Cloud SQL does not exist yet

Create a PostgreSQL instance in the same region as Cloud Run when possible:

```bash
gcloud sql instances create utlwa-postgres \
  --edition=ENTERPRISE \
  --database-version=POSTGRES_16 \
  --tier=db-custom-1-3840 \
  --region=us-central1
```

Then create the app database and user:

```bash
gcloud sql databases create utlwa_db --instance=utlwa-postgres
gcloud sql users create utlwa_app --instance=utlwa-postgres --password=YOUR_STRONG_PASSWORD
```

### 3.3 Verify Cloud SQL setup

Check the databases:

```bash
gcloud sql databases list --instance=utlwa-postgres
```

Check the users:

```bash
gcloud sql users list --instance=utlwa-postgres
```

Check access manually if needed:

```bash
gcloud sql connect utlwa-postgres --user=utlwa_app --database=utlwa_db
```

If you can connect here, the database side is healthy.

## 4. Backend Build, Push, and Deploy

The backend is containerized and deployed to Cloud Run.

### 4.1 Set deployment variables

Use PowerShell or your shell of choice.

```powershell
$PROJECT_ID="your-project-id"
$REGION="us-central1"
$REPO="utlwa-backend"
$IMAGE="backend"
$TAG="latest"
```

### 4.2 Enable required APIs

```bash
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com
```

### 4.3 Confirm Artifact Registry exists

List repositories:

```bash
gcloud artifacts repositories list --location=us-central1
```

If needed, create the repository:

```powershell
gcloud artifacts repositories create ${REPO} `
  --repository-format=docker `
  --location=${REGION} `
  --description="UTLWA backend Docker images"
```

### 4.4 Authenticate Docker to Artifact Registry

```powershell
gcloud auth configure-docker "${REGION}-docker.pkg.dev"
```

### 4.5 Build the backend image

Run from the backend folder:

```powershell
docker build -t "$REGION-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}" .
```

### 4.6 Push the backend image

```powershell
docker push "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}"
```

### 4.7 Check Artifact Registry images

List images and tags:

```powershell
gcloud artifacts docker images list "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}" --include-tags
```

If the new tag does not appear, the push did not succeed.

### 4.8 Check backend secrets

List secrets:

```bash
gcloud secrets list
```

Check secret versions:

```bash
gcloud secrets versions list JWT_SECRET
gcloud secrets versions list PG_PWD
```

If a secret is missing, create it. If it exists, add a new version instead of recreating it.

### 4.9 Check how the backend is wired to the database

The backend should use Cloud Run env vars plus Cloud SQL attachment.

Inspect the deployed Cloud Run service:

```bash
gcloud run services describe utlwa-backend --region us-central1
```

Look for:

- Cloud SQL instance attachment
- environment variables for PG_HOST, PG_PORT, PG_USER, PG_DATABASE
- secret bindings for JWT_SECRET and PG_PWD

Expected production values:

- PG_HOST should point to the Cloud SQL Unix socket path, not localhost
- PG_PORT should be 5432
- PG_USER should be the Cloud SQL app user
- PG_DATABASE should be the app database name

### 4.10 Deploy the backend service

Use the image you pushed to Artifact Registry.

```powershell
gcloud run deploy utlwa-backend `
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}" `
  --region ${REGION} `
  --platform managed `
  --max-instances=1 `
  --set-cloudsql-instances "${PROJECT_ID}:us-central1:utlwa-postgres" `
  --set-env-vars "NODE_ENV=production,PG_HOST=/cloudsql/${PROJECT_ID}:us-central1:utlwa-postgres,PG_PORT=5432,PG_USER=utlwa_app,PG_DATABASE=utlwa_db,FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN,R2_ACCOUNT_ID=5ffb2565a9160f63abccb1bcebb49f23,R2_ACCESS_KEY_ID=fb88b984f34183141d3d7ba6e3c6f17c,R2_SECRET_ACCESS_KEY=b50c6aabcd9e66beb958d48a719262aabe8bdea1e18daf1a536014684caa466d,R2_BUCKET_NAME=utlwa-verification-docs,R2_ENDPOINT=https://5ffb2565a9160f63abccb1bcebb49f23.r2.cloudflarestorage.com,R2_PUBLIC_BASE_URL=" `
  --set-secrets "JWT_SECRET=JWT_SECRET:latest,PG_PWD=PG_PWD:latest"
```

### 4.11 Verify the backend deployment

List Cloud Run services:

```bash
gcloud run services list --region us-central1
```

Describe the service again to confirm the latest revision:

```bash
gcloud run services describe utlwa-backend --region us-central1
```

Check active revisions:

```bash
gcloud run revisions list --service utlwa-backend --region us-central1
```

If you need to inspect live traffic, use the revision list and service description to confirm which revision is serving 100 percent of traffic.

### 4.12 Run database migrations

Use the Cloud Run Job pattern documented in the backend setup guide.

Create a job:

```powershell
gcloud run jobs create utlwa-db-migrate `
  --image "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE}:${TAG}" `
  --region us-central1 `
  --set-cloudsql-instances "${PROJECT_ID}:us-central1:utlwa-postgres" `
  --set-env-vars "NODE_ENV=production,PG_HOST=/cloudsql/${PROJECT_ID}:us-central1:utlwa-postgres,PG_PORT=5432,PG_USER=utlwa_app,PG_DATABASE=utlwa_db" `
  --set-secrets "PG_PWD=PG_PWD:latest,JWT_SECRET=JWT_SECRET:latest" `
  --command npm `
  --args run `
```

Execute it:

```bash
gcloud run jobs execute utlwa-db-migrate --region us-central1 --wait
```

If the job fails, check:

- secret values
- Cloud SQL instance attachment
- PG_HOST path
- database user password
- whether migrations already ran

## 5. How to Check Cloud Run and Backend Health

This section is for when the backend is deployed, but you want to inspect it.

### 5.1 Check the backend service

```bash
gcloud run services describe utlwa-backend --region us-central1
```

Use this to verify:

- service URL
- revision name
- traffic split
- env vars
- secret refs
- Cloud SQL mount

### 5.2 Check active instances and revisions

List revisions:

```bash
gcloud run revisions list --region us-central1 --service utlwa-backend
```

If you want to inspect logs for a specific revision, use Cloud Logging for the `cloud_run_revision` resource.

### 5.3 Check backend logs

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="utlwa-backend"' --limit=50 --format=json
```

This is useful for:

- 401s from auth middleware
- Cloud SQL connection failures
- secret access failures
- migration issues

## 6. Cloud SQL Troubleshooting Checks

Use these when the backend cannot connect to the database.

### 6.1 Confirm the database exists

```bash
gcloud sql databases list --instance=utlwa-postgres
```

### 6.2 Confirm the app user exists

```bash
gcloud sql users list --instance=utlwa-postgres
```

### 6.3 Confirm the password matches the secret

If login fails in the database, the most common cause is a mismatch between:

- the Cloud SQL user password
- the PG_PWD secret value

Update the secret or reset the Cloud SQL user password so they match.

### 6.4 Confirm the Cloud Run service account has Cloud SQL access

Check IAM bindings:

```bash
gcloud projects get-iam-policy $PROJECT_ID
```

Make sure the Cloud Run runtime service account has `roles/cloudsql.client`.

## 7. Frontend Build and Firebase Hosting Deploy

The frontend is built in the frontend folder and deployed to Firebase Hosting.

### 7.1 Check Firebase project context

```bash
npx -y firebase-tools@latest use
```

Confirm the active project matches the deployment target.

### 7.2 Build the frontend

Run from the frontend folder:

```bash
npm install
npm run build
```

This generates `frontend/dist`, which Firebase Hosting serves.

### 7.3 Verify the Hosting config

The hosting rules should route:

- `/api` and `/api/**` to Cloud Run service `utlwa-backend`
- everything else to `frontend/dist/index.html`

That routing is already defined in `firebase.json`.

### 7.4 Check Firebase Hosting status

List deploy targets or inspect the active project:

```bash
npx -y firebase-tools@latest use
```

If needed, check the deployed hosting release in the Firebase console.

### 7.5 Deploy Hosting

From the repository root:

```bash
npx -y firebase-tools@latest deploy --only hosting
```

If you also changed Firebase config, deploy the full project:

```bash
npx -y firebase-tools@latest deploy
```

### 7.6 Verify frontend routing

Open the Firebase Hosting URL and confirm:

- the SPA loads
- login and register work
- `/api/...` requests are reaching Cloud Run

If API requests fail, check:

- `firebase.json` rewrite target service name
- Cloud Run service region
- backend service URL and auth behavior
- frontend `FRONTEND_URL` env var on the backend

## 8. End-to-End Verification Checklist

After deploying both parts, verify these in order:

1. Frontend loads from Firebase Hosting
2. Login succeeds
3. Network tab shows `/api/profile/me` returning 200
4. Cloud Run logs show no auth 401s for the valid user
5. Cloud SQL connection succeeds in backend logs
6. The dashboard loads without forcing logout

## 9. If Something Breaks

Use this quick diagnosis order.

### Problem: Login works, then dashboard logs out

Check:

- Firebase Hosting rewrite target
- whether the auth cookie is being forwarded
- Cloud Run `/api/profile/me` response status
- Cloud Run backend logs

### Problem: Backend returns 401

Check:

- secret values
- auth cookie name
- Cloud Run request headers
- JWT secret consistency

### Problem: Backend cannot talk to Cloud SQL

Check:

- Cloud SQL instance exists
- Cloud SQL instance attached to Cloud Run
- PG_HOST uses the socket path
- PG_PWD secret matches the database user password
- service account has `roles/cloudsql.client`

### Problem: Deployment succeeds but app is stale

Check:

- whether the image tag you deployed is the image you pushed
- whether Firebase Hosting was redeployed after the frontend build
- whether Cloud Run traffic is routed to the newest revision

## 10. Useful Commands Reference

List project context:

```bash
gcloud config get-value project
npx -y firebase-tools@latest use
```

List Cloud Run services:

```bash
gcloud run services list --region us-central1
```

Describe Cloud Run service:

```bash
gcloud run services describe utlwa-backend --region us-central1
```

List revisions:

```bash
gcloud run revisions list --region us-central1 --service utlwa-backend
```

List Artifact Registry images:

```bash
gcloud artifacts docker images list "us-central1-docker.pkg.dev/$PROJECT_ID/utlwa-backend" --include-tags
```

List secrets:

```bash
gcloud secrets list
```

List Cloud SQL instances:

```bash
gcloud sql instances list
```

Run frontend build:

```bash
cd frontend
npm run build
```

Deploy Hosting:

```bash
npx -y firebase-tools@latest deploy --only hosting
```
