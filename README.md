# Project Structure

This project is a full-stack web application with a React frontend and Express backend.

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