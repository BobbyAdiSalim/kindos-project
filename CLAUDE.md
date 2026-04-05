# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UTLWA** (by The Kindos) is a hearing health web platform for booking appointments with hearing care providers. It supports three user roles: **patient**, **doctor**, and **admin**.

## Commands

### Backend (`backend/`)
```bash
npm run dev          # Start dev server with nodemon (port 4000)
npm start            # Start production server
npm run db:init      # Create/sync all DB tables (safe, non-destructive)
npm run db:reset     # Drop and recreate all tables (DANGER: deletes all data)
node --env-file=.env seed-dev-data.js  # Seed dev data manually
npm run dev -- --seed  # Start server and auto-seed dev data
```

### Frontend (`frontend/`)
```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Running Tests (Backend)
The test files in `backend/tests/` use Jest (`@jest/globals`), but Jest is not yet in `package.json`. To run tests, install Jest first:
```bash
cd backend
npm install --save-dev jest
node --experimental-vm-modules node_modules/.bin/jest tests/<test-file>.test.js
```

### Environment Setup
```bash
cd backend && cp .env.example .env  # Then fill in PG credentials and JWT_SECRET
```
Required env vars: `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PWD`, `PG_DATABASE`, `JWT_SECRET`

Optional: `SMTP_*` vars for email, `R2_*` vars for Cloudflare R2 doctor document storage.

Default seed credentials: admin `administrator@gmail.com` / `administrator`, patients `patient123`, doctors `doctor123`.

## Architecture

### Two-service setup
- **Backend**: Express.js on `localhost:4000`, uses Sequelize ORM with PostgreSQL
- **Frontend**: React + Vite on `localhost:5173`, proxies `/api` and `/socket.io` to the backend via `vite.config.ts`

Both use ES Modules (`"type": "module"`).

### Backend structure
```
backend/
  server.js           # Express app, Socket.io setup, route mounting
  routes/userRoutes.js  # All API routes (single file, prefixed /api)
  controllers/
    userController.js       # Auth, profiles, doctor listing
    adminController.js      # Doctor verification management
    availabilityController.js  # Schedule patterns and slots
    bookingController.js    # Appointment CRUD
    chatController.js       # Connections and messaging
  middleware/auth.js  # requireAuth and requireRole middleware
  models/index.js     # Sequelize models + associations (imported by all routes)
  config/database.js  # Sequelize connection
  seed-dev-data.js    # Creates 1 admin, 10 patients, 10 doctors for dev
```

All routes are in a single file (`routes/userRoutes.js`) — new endpoints go there.

### Frontend structure
```
frontend/src/
  main.tsx            # Entry point
  app/
    App.tsx           # Root: AuthProvider + RouterProvider + Toaster
    routes.ts         # React Router config (role-protected route groups)
    pages/
      patient/        # Patient-facing pages
      doctor/         # Doctor-facing pages
      admin/          # Admin-facing pages
      auth/           # Login, register, password reset
    components/
      auth/protected-route.tsx  # RequirePatientRoute, RequireDoctorRoute, RequireAdminRoute
      layout/                   # RootLayout, header
      ui/                       # shadcn/ui components
      chat/                     # Chat UI components
    lib/
      auth-context.tsx  # AuthProvider, useAuth hook, login/register/logout
      socket.ts         # Socket.io client singleton with typed emit helpers
      *-api.ts          # Fetch wrappers for each domain (appointment, availability, chat, profile)
```

Path alias: `@` maps to `frontend/src/` (e.g., `import { useAuth } from '@/app/lib/auth-context'`).

### Authentication flow
- Auth session is cookie-based via HTTP-only cookie (`__session` in deployed environments)
- Frontend authenticated calls include `credentials: 'include'`
- `requireAuth` + `requireRole('patient'|'doctor'|'admin')` middleware guards backend routes
- Socket.io connections are also JWT-authenticated (token passed in handshake `auth`)

### Real-time chat
- Socket.io rooms: `user_<userId>` (personal) and `connection_<connectionId>` (conversation)
- Patients initiate connection requests to doctors; doctors accept/reject
- Messages persist via REST API and are broadcast in real time via socket events

### Availability system
- **AvailabilityPattern**: recurring weekly schedule (day + time range)
- **AvailabilitySlot**: specific date/time overrides
- `getBookableSlots` endpoint computes actual available slots by merging patterns and overrides, then subtracting booked appointments

### UI stack
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **shadcn/ui** components (Radix UI primitives in `components/ui/`)
- **MUI** also available but prefer shadcn/ui components
- **Leaflet** for provider map
- **Recharts** for admin analytics
- **react-hook-form** for form handling
- **sonner** for toast notifications (`<Toaster />` is mounted in App.tsx)

## Git Workflow

Branch from `develop` for all new features:
```bash
git checkout develop && git pull
git checkout -b feature/<short-description>
```
PRs target `develop`. `master` (main) is production-only.
