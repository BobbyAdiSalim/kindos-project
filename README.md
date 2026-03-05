## Project Overview

**UTLWA** is a hearing health technology venture that expands access to hearing care through digital tools, local sign language, and clinical services. This project delivers a **lightweight, web-based appointment and referral booking page** that can be embedded into **utlwa.com**, connecting patients with hearing loss to **virtual and in-person** hearing care.

Designed with a strong focus on **clarity and accessibility**, the booking flow helps patients register or log in, complete a short needs questionnaire, and get routed to the right next step using **simple referral rules** (routing only — not diagnosis). Patients can browse providers, view availability, and manage appointments, while doctors can set their schedules and communicate with patients. System administrators can verify provider registrations and monitor booking activity through basic analytics.

### Key Features

- **Accessible Booking Flow**: A clear, embeddable web experience that supports registration/login, profile management, and a simple step-by-step appointment journey.
- **Needs Questionnaire + Referral Routing**: A short questionnaire that recommends a care type and routes patients to the appropriate next step using rule-based logic (no diagnosis).
- **Provider Discovery**: Browse doctors by care type and availability, view detailed profiles, and optionally explore nearby providers via map-based selection.
- **Availability & Scheduling**: View provider time slots, book virtual/in-person appointments, receive confirmation and reminder emails, and manage appointments (view/reschedule/cancel).
- **Patient–Doctor Communication**: Secure messaging/chat so patients can ask questions and doctors can coordinate appointment details.
- **Care Continuity Tools**: Appointment history, doctor-written visit summaries, and (when permitted) access to past summaries to support ongoing care.
- **Feedback & Waitlist**: Patient ratings/reviews and a waitlist that notifies patients when earlier slots become available.
- **Admin Controls & Analytics**: Admin login, doctor verification/approval, and booking analytics to monitor platform usage and trends.


## Directory Structure

```
Project/
│
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize database connection
│   ├── db/
│   │   ├── migrations/          # Sequelize migration files
│   │   └── seeders/             # Sequelize seeder files
│   ├── models/
│   │   ├── User.js              # User authentication model
│   │   ├── Patient.js           # Patient profile model
│   │   ├── Doctor.js            # Doctor profile model
│   │   ├── Appointment.js       # Appointment model
│   │   ├── Availability.js      # Doctor availability models
│   │   ├── Message.js           # Messaging model
│   │   ├── Review.js            # Review model
│   │   ├── Questionnaire.js     # Questionnaire model
│   │   ├── AdminLog.js          # Admin log model
│   │   ├── index.js             # Model aggregator with associations
│   │   └── README.md            # Models documentation
│   ├── server.js                # Main Express server
│   ├── db-init.js               # Legacy sync-based DB initialization script
│   ├── .env                     # Environment variables (not in git)
│   ├── .env.example             # Environment template
│   ├── SETUP.md                 # Backend setup guide
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── main.jsx             # React entry point
│   │   ├── App.jsx              # Main sign up / login application
│   │   ├── App.css
│   │   ├── index.css
│   │   └── assets/
│   ├── index.html
│   ├── vite.config.js           # Vite configuration with proxy setup
│   ├── package.json
│   └── package-lock.json
│
├── doc/
│   └── sprint0/
│       ├── product.md           # Product description
│       ├── product_backlog.md   # User stories
│       └── README.md
│
├── .gitignore
└── README.md
```

## Tech Stack

### Backend
- **Express.js** - Web server framework
- **PostgreSQL** - Database
- **Sequelize** - ORM (Object-Relational Mapping)
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **nodemon** - Development auto-reload

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **ESLint** - Code linting

## API Endpoints

### POST /users
Register a new user
- **Body**: `{ username, password }`
- **Response**: `{ response, token }`

### POST /users/token
Login existing user
- **Body**: `{ username, password }`
- **Response**: `{ response, token }`

## Setup & Running

### Backend

**Step 1: Configure Environment Variables**

Create a `.env` file in the `backend/` directory (or copy from `.env.example`):

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# PostgreSQL Database Configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PWD=your_password_here
PG_DATABASE=utlwa_db

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Server Configuration
PORT=4000
NODE_ENV=development

# Optional: Session Configuration
SESSION_SECRET=your_session_secret_here

# Optional: Email Service (for password reset)
RESET_TOKEN_EXPIRES_MINUTES=60
# Email provider options:
# EMAIL_PROVIDER=console
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password
EMAIL_FROM=your_email@gmail.com

# Frontend URL (used in reset links / CORS)
FRONTEND_URL=http://localhost:5173

# Cloudflare R2 (doctor verification document storage)
# Required for doctor verification document uploads
R2_BUCKET_NAME=kindos-verification-docs
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_PUBLIC_BASE_URL=
```

**Step 2: Create PostgreSQL Database**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE utlwa_db;

# Exit
\q
```

**Step 3: Install Dependencies**

```bash
cd backend
npm install
```

**Step 4: Run Database Migrations**

Create/update schema using migrations:

```bash
npm run migrate
```

This applies migration files in `backend/db/migrations` and records history in `SequelizeMeta`.

**Step 5 (Optional): Seed Development Data**

```bash
npm run seed
```

**Step 6: Start the Server**

```bash
npm run dev  # Development mode (runs on http://localhost:4000)
```

For more detailed setup instructions, see [backend/SETUP.md](backend/SETUP.md).
For database models documentation, see [backend/models/README.md](backend/models/README.md).

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs with Vite dev server
```

## Database Models

The backend uses Sequelize ORM with the following models:

| Model | Table | Description |
|-------|-------|-------------|
| **User** | users | Base authentication (username, email, password, role) |
| **Patient** | patients | Patient profiles and accessibility preferences |
| **Doctor** | doctors | Doctor profiles, credentials, and verification status |
| **Appointment** | appointments | Booking between patients and doctors |
| **AvailabilityPattern** | availability_patterns | Recurring weekly schedules for doctors |
| **AvailabilitySlot** | availability_slots | Specific date/time slots for appointments |
| **Message** | messages | Patient-doctor communication |
| **Review** | reviews | Patient ratings and reviews of doctors |
| **Questionnaire** | questionnaires | Patient needs assessment |
| **AdminLog** | admin_logs | Admin verification audit trail |
| **WaitlistEntry** | waitlist_entries | Waitlist requests for booked slots |
| **Connection** | connections | Patient-doctor connection requests |

For detailed model documentation and usage examples, see [backend/models/README.md](backend/models/README.md).

## Database Migrations & Seeders

This project uses **Sequelize migrations** as the source of truth for schema changes.

### Apply Migrations
```bash
cd backend
npm run migrate
```

### Check Migration Status
```bash
npm run migrate:status
```

### Create a New Migration (for every schema change)
When updating table structure (new column, constraint, index, table), create a new migration file:

```bash
npm run migration:create -- add_age_to_users
```

Then edit the generated file in `backend/db/migrations`:
- implement `up` to apply the change
- implement `down` to rollback the change

After editing:
```bash
npm run migrate
```

### Rollback Migrations
```bash
npm run migrate:undo       # undo latest migration
npm run migrate:undo:all   # undo all migrations
```

### Seed Data
```bash
npm run seed                           # run all seeders
npm run seed:create -- dev-users       # create new seeder file
npm run seed:one -- <seeder-file.js>   # run one seeder
npm run seed:undo                      # undo last seeder
npm run seed:undo:all                  # undo all seeders
```

### Reset Local DB and Rebuild Schema
```bash
npm run db:fresh        # clean all tables in current DB + migrate
npm run db:fresh:seed   # clean + migrate + seed
```

### Team Rules
- Always create a **new migration file** for schema changes. Do not edit old applied migrations.
- Keep model updates and migration changes in the same PR.
- Use migration scripts (`migrate`, `migrate:undo`) instead of `sequelize.sync` in normal workflow.
- Use `db:fresh` only for local/dev reset (never in production).

## Available Scripts

### Backend Scripts
```bash
npm start           # Start production server
npm run dev         # Start development server with auto-reload
npm run migrate          # Apply migrations
npm run migrate:status   # Show applied/pending migrations
npm run migration:create -- <name>   # Create a migration file
npm run seed             # Run all seeders
npm run seed:create -- <name>        # Create a seeder file
npm run db:fresh         # Clean all tables + migrate
npm run db:fresh:seed    # Clean all tables + migrate + seed
```

### Frontend Scripts
```bash
npm run dev         # Start Vite development server
npm run build       # Build for production
npm run preview     # Preview production build
```

## Features

- User registration with password hashing
- User login with JWT authentication
- Sequelize ORM with PostgreSQL
- Sequelize models with proper relationships
- Database migrations and seeders

## Contribution Guidelines

Thanks for your interest in contributing to **UTLWA**! This repository is maintained by **The Kindos**.
To keep development organized, we use **Git Flow**, **GitHub Issues** for ticketing, and PR reviews.

---

## Workflow Overview

### Ticketing & Planning (GitHub Issues)
We use **GitHub Issues** to track work.
- Create an issue for every feature/bug/task
- Add labels (e.g., `feature`, `bug`, `frontend`, `backend`, `docs`)
- Assign an owner and add it to the project board (if applicable)
- Link PRs to issues using keywords:
  - `Closes #12`, `Fixes #34`, `Resolves #7`

**Issue template suggestion**
- Summary
- Acceptance Criteria (definition of done)
- Steps / Notes / Screenshots
- Dependencies

---

## Branching Strategy (Git Flow)

### Do we use Git Flow?
**Yes.** We follow **Git Flow** with long-lived branches and structured releases.

### Branch Types
- `main`
  **Production-ready** code only. Tagged releases live here.
- `develop`
  Integration branch for completed features heading into the next release.
- `feature/*`
  New features branched from `develop` and merged back into `develop`.
- `release/*`
  Release preparation (final testing, version bumps, small fixes). Merged into both `main` and `develop`.
- `hotfix/*`
  Urgent production fixes branched from `main`. Merged into both `main` and `develop`.

### Naming Conventions
Use short, descriptive branch names:
- `feature/patient-booking-flow`
- `feature/doctor-availability-ui`
- `release/v1.0.0`
- `hotfix/fix-double-booking`

---

## How to Contribute (Step-by-Step)

### 1) Pick or Create a Ticket
- Find an existing GitHub Issue or open a new one.
- Make sure the issue includes clear **Acceptance Criteria**.

### 2) Start From `develop` (for most work)
```bash
git checkout develop
git pull
git checkout -b feature/<short-description>
