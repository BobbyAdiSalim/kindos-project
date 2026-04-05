# Firebase Authentication Setup

This guide walks through setting up Firebase CLI authentication for GitHub Actions frontend deployments.

## Overview

The GitHub Actions `deploy-frontend.yml` workflow deploys the React frontend to Firebase Hosting.

Authentication now uses a **Google service account key** with Application Default Credentials (ADC), exposed via `GOOGLE_APPLICATION_CREDENTIALS`.

This replaces deprecated `firebase deploy --token ...` usage.

---

## Prerequisites

- **Firebase CLI** installed globally
  ```bash
  npm install -g firebase-tools
  ```
  Or use npx (no installation needed):
  ```bash
  npx -y firebase-tools@latest --version
  ```

- **Active Firebase project** (same as your GCP project, or linked to it)
  - Check: `firebase projects:list`

- **Local gcloud authentication** (optional, but helpful for testing)
  ```bash
  gcloud auth login
  ```

---

## Step 1: Set Active Firebase Project

Before creating credentials, ensure the correct Firebase project is active locally.

List projects you can access:

```bash
firebase projects:list
```

Check the currently active project for this directory:

```bash
firebase use
```

Set your project as active:

```bash
firebase use PROJECT_ID
```

Example:
```bash
firebase use my-utlwa-project
```

Verify it's set:
```bash
firebase projects:list
```

---

## Step 2: Create a Firebase Deploy Service Account

Create a dedicated service account for Firebase Hosting deployments:

```bash
gcloud iam service-accounts create firebase-hosting-deployer \
  --display-name="Firebase Hosting Deployer" \
  --description="Service account for GitHub Actions Firebase Hosting deploys"
```

Grant required roles (minimum for hosting deploy):

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:firebase-hosting-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/firebasehosting.admin

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:firebase-hosting-deployer@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/firebase.viewer
```

Create a JSON key for that service account:

```bash
gcloud iam service-accounts keys create firebase-hosting-key.json \
  --iam-account=firebase-hosting-deployer@PROJECT_ID.iam.gserviceaccount.com
```

---

## Step 3: Add Credentials to GitHub Actions

1. Open your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
5. **Value**: Paste the full JSON contents of `firebase-hosting-key.json`
6. Click **Add secret**

Then add the Firebase project ID as a variable:

1. Click **New variable**
2. **Name**: `FIREBASE_PROJECT_ID`
3. **Value**: Your Firebase project ID (e.g., `my-utlwa-project`)
4. Click **Add variable**

---

## Step 4: Verify the Setup

Test ADC authentication locally to ensure it works:

```bash
firebase deploy --only hosting --dry-run --project PROJECT_ID
```

If running locally with the downloaded key file, set `GOOGLE_APPLICATION_CREDENTIALS` first:

PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\firebase-hosting-key.json"
```

Bash:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/firebase-hosting-key.json"
```

Expected output:
```
✔  Plan read successful

Resource counts
frontend/dist: 123 files, 4.5 MB

Deploy complete!
```

If you see errors like "Permission denied", check service account IAM roles and project ID.

---

## Step 5: Test GitHub Actions Workflow

Trigger the frontend deployment workflow manually to verify it works end-to-end:

1. Go to **Actions** → **Deploy Frontend**
2. Click **Run workflow**
3. Select branch: `develop` or `main`
4. Click **Run workflow**

Watch the deployment:
- Check **Build frontend** step completes successfully
- Check **Deploy to Firebase Hosting** shows no auth errors
- Verify Firebase Hosting updated in Firebase Console

---

## Step 6: Verify Frontend Deployment

After deployment, verify the frontend is live:

```bash
firebase hosting:sites:list
```

Open the hosting URL in your browser to see the deployed frontend.

Alternatively, check Firebase Console:
1. Go to https://console.firebase.google.com
2. Select your project
3. Go to **Hosting**
4. You should see the latest deployment with a green checkmark

---

## Security Notes

### Service Account Key Lifecycle
- Keys remain valid until rotated or deleted
- Keys are tied to the service account, not a user session

### Key Rotation
If a key is compromised, rotate immediately:

```bash
gcloud iam service-accounts keys create firebase-hosting-key-new.json \
  --iam-account=firebase-hosting-deployer@PROJECT_ID.iam.gserviceaccount.com
```

Update GitHub secret with the new key, then delete the old key:

```bash
gcloud iam service-accounts keys list \
  --iam-account=firebase-hosting-deployer@PROJECT_ID.iam.gserviceaccount.com

gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=firebase-hosting-deployer@PROJECT_ID.iam.gserviceaccount.com
```

### Minimal Permissions
- Use a dedicated deployer service account with the minimum required roles
- Avoid using owner/editor roles for CI deployments

### GitHub Secret Security
- GitHub automatically masks secret values in logs
- Only users with repository admin access can view/edit the secret
- The secret is only exposed to workflows that explicitly request it

---

## Troubleshooting

### "Authentication failed" during deploy
**Check**:
1. Is `FIREBASE_SERVICE_ACCOUNT_KEY` in GitHub Secrets? (Settings → Secrets)
2. Is the JSON valid and complete?
3. Does the service account have `roles/firebasehosting.admin`?

**Fix**: Regenerate key JSON, update GitHub secret, and verify IAM roles.

### "Permission denied" when deploying
**Check**:
1. Does your Firebase account have permission to deploy to this project?
2. Are you the project owner or have Editor permission?

**Fix**: Ask the project owner to grant you Firebase Editor role in the GCP Console (IAM & Admin).

### "Project not found"
**Check**:
1. Is `FIREBASE_PROJECT_ID` set correctly in GitHub Variables?
2. Does the Firebase project exist? Check `firebase projects:list` locally.

**Fix**: Verify project ID and update the variable.

### Local deploy works but GitHub Actions fails
**Check**:
1. Are `FIREBASE_SERVICE_ACCOUNT_KEY` and `FIREBASE_PROJECT_ID` configured?
2. Is the workflow using Google auth action before deploy?

**Fix**: Verify secret/variable names and workflow references.

---

## Next Steps

1. ✅ Service account key generated and stored as `FIREBASE_SERVICE_ACCOUNT_KEY`
2. ✅ `FIREBASE_PROJECT_ID` added to GitHub Variables
3. → Frontend deployment workflow is ready
4. → Proceed to **Update DEPLOYMENT.md** to document the new automated process
