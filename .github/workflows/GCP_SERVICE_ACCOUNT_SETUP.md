# GCP Service Account Setup

This guide walks through creating a Google Cloud service account for GitHub Actions CI/CD deployment.

## Overview

The GitHub Actions `deploy-backend.yml` workflow needs credentials to:
- Build and push Docker images to Google Artifact Registry
- Deploy services to Google Cloud Run
- Access secrets from Google Secret Manager
- Execute database migrations on Cloud SQL

A dedicated **service account** with minimal permissions is the secure way to grant access.

---

## Prerequisites

- **GCP Project** already created and active
- **gcloud CLI** installed and authenticated (`gcloud auth login`)
- **Appropriate IAM permissions** in the GCP project (Creator, Editor, or IAM Security Admin role)

Check your active project:
```bash
gcloud config get-value project
```

---

## Step 1: Create the Service Account

Create a service account named `github-actions-deployer`:

```bash
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer" \
  --description="Service account for GitHub Actions CI/CD workflows"
```

Verify it was created:
```bash
gcloud iam service-accounts list --filter="name:github-actions-deployer"
```

You should see output like:
```
EMAIL                                          DISPLAY NAME
github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com    GitHub Actions Deployer
```

Note the email address (you'll need it in the next steps).

---

## Step 2: Grant Required IAM Roles

The service account needs these roles to perform CI/CD tasks:

### 2.1 Cloud Run Admin
Allows deploying and managing Cloud Run services.

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/run.admin
```

### 2.2 Artifact Registry Writer
Allows pushing Docker images to Artifact Registry.

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/artifactregistry.writer
```

Optional (for local verification commands like `gcloud artifacts repositories list`):

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/artifactregistry.reader
```

### 2.3 Secret Manager Secret Accessor
Allows reading secrets (JWT_SECRET, PG_PWD) at runtime.

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### 2.4 Cloud SQL Client
Allows connecting to and executing operations on Cloud SQL instances.

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/cloudsql.client
```

### 2.5 Cloud SQL Instance User
Allows the service account to use Cloud SQL instances.

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/cloudsql.instanceUser
```

### 2.6 Service Account User (Cloud Run Runtime Identity)
Allows the deployer service account to deploy Cloud Run revisions that run as the runtime service account.

```bash
gcloud iam service-accounts add-iam-policy-binding PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --member=serviceAccount:github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser \
  --project=PROJECT_ID
```

Example (for this project):

```bash
gcloud iam service-accounts add-iam-policy-binding 219095862844-compute@developer.gserviceaccount.com \
  --member=serviceAccount:github-actions-deployer@project-9980abd5-3f4b-4037-91b.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser \
  --project=project-9980abd5-3f4b-4037-91b
```

### Verify Role Assignments

```bash
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions-deployer*"
```

You should see all required roles listed, plus `roles/iam.serviceAccountUser` on the runtime service account.

---

## Step 3: Create and Download Service Account Key

Create a JSON key for the service account:

```bash
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com
```

This creates a file `github-actions-key.json` in your current directory containing the private key.

**Keep this file safe** — it has the same privileges as the service account.

Verify the key was created:
```bash
gcloud iam service-accounts keys list \
  --iam-account=github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com
```

---

## Step 4: Add Configuration to GitHub Actions (Secrets + Variables)

1. Open your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**

Add these as **repository secrets** (sensitive values):

| Secret | Value | Example |
|--------|-------|---------|
| `GCP_SA_KEY` | Entire JSON content of `github-actions-key.json` | `{ "type": "service_account", ... }` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key ID | (from R2 dashboard) |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key | (from R2 dashboard) |

Then add these as **repository variables** (non-sensitive config):

| Variable | Value | Example |
|----------|-------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `my-utlwa-project` |
| `GCP_REGION` | Cloud Run region | `us-central1` |
| `FRONTEND_URL` | Public frontend domain | `https://utlwa.example.com` |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID | `5ffb2565a9160f63abccb1bcebb49f23` |
| `R2_BUCKET_NAME` | R2 bucket name | `utlwa-verification-docs` |
| `R2_ENDPOINT` | R2 endpoint URL | `https://5ffb2565a9160f63abccb1bcebb49f23.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | R2 public URL prefix | (empty or configured URL) |

Notes:
- Use **Secrets** for credentials and keys.
- Use **Variables** for project IDs, regions, URLs, and other non-sensitive settings.

---

## Step 5: Verify the Setup

Test that the service account has the right permissions:

```bash
gcloud auth activate-service-account --key-file=github-actions-key.json

# Test Cloud Run access
gcloud run services list --region us-central1

# Test Artifact Registry access
gcloud artifacts repositories list --location us-central1

# Test Secret Manager access
gcloud secrets list

# Test Cloud SQL access
gcloud sql instances list
```

All commands should succeed without authorization errors.

---

## Step 6: Clean Up Local Key (Optional)

Once the key is safely stored in GitHub Secrets, you can delete the local copy:

```bash
rm github-actions-key.json
```

The key is now only on:
- GitHub (encrypted in Secrets storage)
- Google Cloud (you can see the key ID and creation time in `gcloud iam service-accounts keys list`)

---

## Security Best Practices

1. **Minimize permissions**: This service account has only what's needed for deployments. It cannot delete databases or modify firewall rules.

2. **Key rotation**: Periodically rotate the JSON key:
   ```bash
   # Create a new key
   gcloud iam service-accounts keys create github-actions-key-new.json \
     --iam-account=github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com
   
   # Update GitHub secret with new key
   # Delete old key
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Monitor usage**: Check Cloud Audit Logs for actions by this service account:
   ```bash
   gcloud logging read 'protoPayload.authenticationInfo.principalEmail="github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com"' \
     --limit=20 \
     --format=json
   ```

4. **Disabling the account**: If compromised, immediately disable the service account:
   ```bash
   gcloud iam service-accounts disable github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com
   ```

---

## Troubleshooting

### "Permission denied" when running gcloud commands from GitHub Actions

**Check**:
1. Is `GCP_SA_KEY` secret set correctly? (no extra whitespace, full JSON)
2. Are all 5 IAM roles assigned? Run verification command above.
3. Is the key still valid? Check expiration: `gcloud iam service-accounts keys list --iam-account=...`

**Fix**: Re-download the key and update GitHub secret.

### "Secret not found" when Cloud Run tries to read JWT_SECRET or PG_PWD

**Check**:
1. Do the secrets exist? `gcloud secrets list`
2. Does the service account have `secretmanager.secretAccessor` role?

**Fix**: Ensure secrets are created first (see main DEPLOYMENT.md), then re-run workflow.

### "Cloud SQL instance not found"

**Check**:
1. Is the instance name correct in the workflow? (should be `utlwa-postgres`)
2. Does the instance exist? `gcloud sql instances list`

**Fix**: Verify instance name in `.github/workflows/deploy-backend.yml` and create instance if missing.

---

## Next Steps

1. ✅ Service account created and roles assigned
2. ✅ Key added to GitHub Secrets
3. → Deploy workflows are now ready to authenticate to GCP
4. → Proceed to **Firebase Authentication Setup** for frontend deployments
