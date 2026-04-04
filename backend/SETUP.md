# Backend Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

The `.env` file is already created with default values. Update it with your local PostgreSQL credentials:

```bash
# Edit the .env file
nano .env
```

**Important fields to update**:
- `PG_PWD` - Your PostgreSQL password
- `PG_DATABASE` - Your database name (create this database first!)
- `JWT_SECRET` - Change to a random secure string in production

### 3. Create PostgreSQL Database

Before running the app, create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE utlwa_db;

# Exit psql
\q
```

### 4. Initialize Database Tables

Run the database initialization script to create all tables:

```bash
npm run db:init
```

This will create 10 tables:
- users
- patients
- doctors
- appointments
- availability_patterns
- availability_slots
- messages
- reviews
- questionnaires
- admin_logs

### 5. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:4000`

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PG_HOST` | PostgreSQL host | `localhost` |
| `PG_PORT` | PostgreSQL port | `5432` |
| `PG_USER` | Database username | `postgres` |
| `PG_PWD` | Database password | `your_password` |
| `PG_DATABASE` | Database name | `utlwa_db` |
| `JWT_SECRET` | Secret key for JWT tokens | `change_this_secret` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment | `development` or `production` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | Session secret key | `session_secret` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `EMAIL_SERVICE` | Email service provider | `gmail` |
| `EMAIL_USER` | Email account | `noreply@utlwa.com` |
| `EMAIL_PASSWORD` | Email password | `app_password` |

---

## Database Commands

### Initialize Database (Safe)
Creates tables if they don't exist:
```bash
npm run db:init
```

### Reset Database (DANGER - Deletes All Data)
Drops all tables and recreates them:
```bash
npm run db:reset
```

⚠️ **Warning**: `db:reset` will delete ALL data in your database!

---

## Verify Setup

### Check Database Connection

1. Start the server:
```bash
npm run dev
```

2. You should see:
```
Database connection has been established successfully.
Server is running on http://localhost:4000
```

### Check Database Tables

Connect to PostgreSQL and verify tables:
```bash
psql -U postgres -d utlwa_db

# List all tables
\dt

# You should see:
# - users
# - patients
# - doctors
# - appointments
# - availability_patterns
# - availability_slots
# - messages
# - reviews
# - questionnaires
# - admin_logs

# Exit
\q
```

### Test API Endpoints

The existing endpoints should still work:

**Register a user:**
```bash
curl -X POST http://localhost:4000/users \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

**Login:**
```bash
curl -X POST http://localhost:4000/users/token \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

---

## Troubleshooting

### "Cannot connect to database"
- Verify PostgreSQL is running: `sudo service postgresql status`
- Check your `.env` credentials match your PostgreSQL setup
- Ensure the database exists: `psql -U postgres -l`

### "Database already exists"
- If using `db:init` and tables already exist, it's safe - Sequelize won't recreate them
- If you want to start fresh, use `db:reset` (WARNING: deletes all data)

### "Port 4000 already in use"
- Change the `PORT` in `.env` to another port (e.g., 4001)
- Or kill the process using port 4000

### "Module not found: sequelize"
- Run `npm install` in the backend directory
- Verify `sequelize` is in `package.json` dependencies

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env`
3. ✅ Create database
4. ✅ Run `npm run db:init`
5. ✅ Start server with `npm run dev`
6. 🔨 Build controllers (see `models/README.md` for examples)
7. 🔨 Create routes
8. 🔨 Add authentication middleware
9. 🔨 Connect frontend to backend APIs

---

## Team Workflow

### For New Team Members:

1. Clone the repository
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your local database credentials
4. Follow steps 1-5 above

### Important Notes:

- **Never commit `.env`** to Git (it's in `.gitignore`)
- **Always commit `.env.example`** when adding new variables
- **Update `SETUP.md`** when adding new environment variables
- Use `db:init` for setup, never `db:reset` on production!

---

## Production Deployment Checklist

When deploying to production:

- [ ] Change `NODE_ENV=production`
- [ ] Generate strong random `JWT_SECRET`
- [ ] Use strong database password
- [ ] Set up proper database backups
- [ ] Use environment variables from hosting provider (don't use `.env` file)
- [ ] Enable SSL for database connection
- [ ] Set `FRONTEND_URL` to actual frontend domain
- [ ] Configure email service for notifications
- [ ] Never use `db:reset` - use proper migrations instead

---

## Manual Cloud Run Deployment

This project can be deployed with Cloud Run, Cloud SQL, and Artifact Registry. Keep the image generic and inject production values at deploy time.

## Docker + Artifact Registry Setup

Use this section to build and push the backend image before Cloud Run deployment.

### 1. Set deployment variables (PowerShell)

```powershell
$PROJECT_ID="your-project-id"
$REGION="us-central1"
$REPO="utlwa-backend"
$IMAGE="backend"
$TAG="v1"
```

### 2. Enable required APIs

```bash
gcloud services enable artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com
```

### 3. Set active project

```bash
gcloud config set project $PROJECT_ID
```

### 4. Create Artifact Registry repository (one-time)

```powershell
gcloud artifacts repositories create $REPO `
  --repository-format=docker `
  --location=$REGION `
  --description="UTLWA backend Docker images"
```

### 5. Configure Docker authentication

```powershell
gcloud auth configure-docker "$REGION-docker.pkg.dev"
```

### 6. Build backend image

Run from `backend/`:

```powershell
docker build -t "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE:$TAG" .
```

### 7. Push image to Artifact Registry

```powershell
docker push "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE:$TAG"
```

### 8. Verify pushed image

```powershell
gcloud artifacts docker images list "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO" --include-tags
```

### 9. Deploy Cloud Run from pushed image

```powershell
gcloud run deploy utlwa-backend `
  --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/$IMAGE:$TAG" `
  --region $REGION `
  --platform managed
```

Notes:

- If the repository already exists, skip step 4.
- If image push fails with permissions, ensure your account has Artifact Registry Writer on the project.
- Image naming format is `REGION-docker.pkg.dev/PROJECT_ID/REPO/IMAGE:TAG`.

## Cloud SQL Setup Guide

This project uses PostgreSQL. For production on Google Cloud, Cloud SQL is the recommended database host.
Recommended starting point: Cloud SQL Enterprise edition with a small dedicated-core tier. For this project, use `--edition=ENTERPRISE` with `--tier=db-custom-1-3840` unless you have a stronger performance requirement.

### 1. Create a Cloud SQL PostgreSQL instance

Create the instance in the same region as Cloud Run when possible:

```bash
gcloud sql instances create utlwa-postgres \
  --edition=ENTERPRISE \
  --database-version=POSTGRES_16 \
  --tier=db-custom-1-3840 \
  --region=us-central1
```

If you already have an instance, skip this step and use the existing instance connection name.

If you need the absolute cheapest instance for local testing only, Cloud SQL also offers shared-core machine types such as `db-f1-micro` and `db-g1-small`, but those are not recommended for production workloads.

### 2. Create the application database and user

Connect to the instance and create a dedicated database and user for the backend:

```bash
gcloud sql databases create utlwa_db --instance=utlwa-postgres
gcloud sql users create utlwa_app --instance=utlwa-postgres --password=YOUR_STRONG_PASSWORD
```

Do not reuse your personal database account for the app.

### 3. Grant Cloud Run access to Cloud SQL

The Cloud Run runtime service account needs the Cloud SQL Client role:

```bash
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

If you use a custom Cloud Run service account, grant the role to that identity instead.

### 4. Store secrets in Secret Manager

Keep database credentials and other production secrets out of the image and out of source control:

```bash
printf 'YOUR_STRONG_PASSWORD' | gcloud secrets create PG_PWD --data-file=-
printf 'YOUR_JWT_SECRET' | gcloud secrets create JWT_SECRET --data-file=-
```

If the secret already exists, add a new version instead of recreating it.

### 5. Configure the backend to use Cloud SQL

For Cloud Run, use the Cloud SQL socket mount path instead of `localhost`:

```bash
PG_HOST=/cloudsql/PROJECT_ID:us-central1:utlwa-postgres
PG_PORT=5432
PG_USER=utlwa_app
PG_DATABASE=utlwa_db
```

The app already reads these from environment variables in `backend/server.js` and `backend/config/database.js`.

### 6. Deploy the Cloud Run service with Cloud SQL attached

Use the Cloud SQL instance connection name when deploying:

```bash
gcloud run deploy utlwa-backend \
  --image us-central1-docker.pkg.dev/PROJECT_ID/utlwa-backend/backend:latest \
  --region us-central1 \
  --platform managed \
  --max-instances=1 \
  --set-cloudsql-instances PROJECT_ID:us-central1:utlwa-postgres \
  --set-env-vars NODE_ENV=production,PG_HOST=/cloudsql/PROJECT_ID:us-central1:utlwa-postgres,PG_PORT=5432,PG_USER=utlwa_app,PG_DATABASE=utlwa_db,FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN \
  --set-secrets JWT_SECRET=JWT_SECRET:latest,PG_PWD=PG_PWD:latest
```

PowerShell note: wrap `--set-env-vars` and `--set-secrets` values in quotes, and use `${PROJECT_ID}` when a colon follows the variable. Without this, PowerShell can parse `:` unexpectedly and Cloud Run may receive malformed values.

```powershell
gcloud run deploy utlwa-backend `
  --image "us-central1-docker.pkg.dev/${PROJECT_ID}/utlwa-backend/backend:latest" `
  --region us-central1 `
  --platform managed `
  --max-instances=1 `
  --set-cloudsql-instances "${PROJECT_ID}:us-central1:utlwa-postgres" `
  --set-env-vars "NODE_ENV=production,PG_HOST=/cloudsql/${PROJECT_ID}:us-central1:utlwa-postgres,PG_PORT=5432,PG_USER=utlwa_app,PG_DATABASE=utlwa_db,FRONTEND_URL=https://YOUR_FRONTEND_DOMAIN" `
  --set-secrets "JWT_SECRET=JWT_SECRET:latest,PG_PWD=PG_PWD:latest"
```

### 7. Run migrations against Cloud SQL

```powershell
# Create a one-off Cloud Run Job that runs the package script: sequelize-cli db:migrate.
gcloud run jobs create utlwa-db-migrate `
  --image "us-central1-docker.pkg.dev/${PROJECT_ID}/utlwa-backend/backend:latest" `
  --region us-central1 `
  --set-cloudsql-instances "${PROJECT_ID}:us-central1:utlwa-postgres" `
  --set-env-vars "NODE_ENV=production,PG_HOST=/cloudsql/${PROJECT_ID}:us-central1:utlwa-postgres,PG_PORT=5432,PG_USER=utlwa_app,PG_DATABASE=utlwa_db" `
  --set-secrets "PG_PWD=PG_PWD:latest,JWT_SECRET=JWT_SECRET:latest" `
  --command npm `
  --args run,migrate

# Execute it and wait for completion.
gcloud run jobs execute utlwa-db-migrate --region us-central1 --wait
```

You can also connect directly for manual SQL checks:

```bash
gcloud sql connect utlwa-postgres --user=utlwa_app --database=utlwa_db
```

### 8. Verify the connection

After deployment, confirm the root health endpoint works and that a database-backed route can read/write data:

```bash
curl https://YOUR_CLOUD_RUN_URL/
```

If the app cannot connect, check the instance connection name, the service account role, and the runtime environment variables first.

### 9. Optional: initialize tables on app startup

If you want the app to create or update tables automatically when it boots, set these environment variables on the service or job:

```bash
RUN_DB_INIT_ON_STARTUP=true
RUN_DB_INIT_FORCE=false
```

Notes:

- This uses Sequelize model sync, not `sequelize-cli` migrations.
- Keep `RUN_DB_INIT_ON_STARTUP=false` in normal production deployments unless you intentionally want schema sync on boot.
- For production schema changes, prefer a one-off Cloud Run Job or `gcloud sql connect` plus migrations rather than running sync every boot.

## Firebase Hosting Deployment (Frontend + Cloud Run API)

This repository is configured to host the frontend on Firebase Hosting and route `/api` requests to the Cloud Run service `utlwa-backend` in `us-central1`.

The routing is already defined in `firebase.json`:

- `public` directory: `frontend/dist`
- rewrites:
  - `/api` and `/api/**` -> Cloud Run service `utlwa-backend`
  - all other routes -> `frontend/dist/index.html` (SPA fallback)

### 1. Install and authenticate Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. Select the Firebase project

From the repository root:

```bash
firebase use YOUR_FIREBASE_PROJECT_ID
```

### 3. Build the frontend

```bash
cd frontend
npm install
npm run build
```

This creates `frontend/dist`, which is what Firebase Hosting deploys.

### 4. Deploy Hosting

From the repository root:

```bash
firebase deploy --only hosting
```

### 5. Validate end-to-end routing

After deploy:

- open the Firebase Hosting URL for the frontend.
- verify API calls to `/api/...` are served by Cloud Run.

If API requests fail, check:

- Cloud Run service name/region in `firebase.json`.
- Cloud Run service ingress/auth settings.
- backend runtime env vars (especially `FRONTEND_URL`) and secrets.

For more information on using the models, see [models/README.md](models/README.md)
