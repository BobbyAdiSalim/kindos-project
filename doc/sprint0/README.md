## Project Overview

**UTLWA** is a hearing health technology venture that expands access to hearing care through digital tools, local sign language, and clinical services. This project delivers a **lightweight, web-based appointment and referral booking page** that can be embedded into **utlwa.com**, connecting patients with hearing loss to **virtual and in-person** hearing care.

Designed with a strong focus on **clarity and accessibility**, the booking flow helps patients register or log in, complete a short needs questionnaire, and get routed to the right next step using **simple referral rules**. Patients can browse providers, view availability, and manage appointments, while doctors can set their schedules and communicate with patients. System administrators can verify provider registrations and monitor booking activity through basic analytics.

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
│   ├── server.js           # Server file that handles sign ups and logins.
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── main.jsx        # React entry point
│   │   ├── App.jsx         # Main sign up / login application
│   │   ├── App.css
│   │   ├── index.css
│   │   └── assets/
│   ├── index.html
│   ├── vite.config.js      # Vite configuration with proxy setup to connect to backend
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

## Tech Stack

### Backend
- **Express.js** - Web server framework
- **PostgreSQL** - Database
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

Create a `.env` file in the `backend/` directory with your PostgreSQL credentials:
```env
PG_HOST="localhost"
PG_PORT=5432
PG_USER="postgres"
PG_PWD=your_password
PG_DATABASE="your_database_name"
```

Install dependencies and run:
```bash
cd backend
npm install
npm run dev  # Runs on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Runs with Vite dev server
```

## Features

- User registration with password hashing
- User login with JWT authentication

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
