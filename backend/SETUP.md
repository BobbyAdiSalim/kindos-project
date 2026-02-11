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

For more information on using the models, see [models/README.md](models/README.md)
