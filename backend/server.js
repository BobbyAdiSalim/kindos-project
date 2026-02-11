import express from "express";
import pg from "pg";
const { Pool } = pg;

// Import routes
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = 4000;

// Connect to PostgreSQL
let pool;

async function connectToPG() {
  try {
    pool = new Pool({
      user: process.env.PG_USER,
      host: process.env.PG_HOST,
      database: process.env.PG_DATABASE,
      password: process.env.PG_PWD,
      port: process.env.PG_PORT,
    });
    
    // Store pool in app.locals to make it accessible in routes
    app.locals.pool = pool;
    
    console.log("Connected to PostgreSQL successfully");
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
  }
}

connectToPG();

// Middleware
app.use(express.json());

// API Routes
// All routes defined in userRoutes will be prefixed with /api
app.use("/api", userRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// Open Port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
