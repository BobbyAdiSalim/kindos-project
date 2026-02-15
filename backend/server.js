import express from "express";
import pg from "pg";
import { shouldSeedDevelopmentData, seedDevelopmentData } from "./seed-dev-data.js";
const { Pool } = pg;

// Import routes
import userRoutes from "./routes/userRoutes.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const SHOULD_SEED = shouldSeedDevelopmentData(process.argv, process.env);

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

// Middleware
app.use(express.json({ limit: "8mb" }));

// API Routes
// All routes defined in userRoutes will be prefixed with /api
app.use("/api", userRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

let server;

const shutdown = async () => {
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }

    if (pool) {
      await pool.end();
    }

    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const startServer = async () => {
  await connectToPG();

  if (SHOULD_SEED) {
    await seedDevelopmentData();
  }

  server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use.`);
      console.error("Stop the other process using this port or run this server on a different PORT.");
      console.error("Example (PowerShell): $env:PORT=4001; npm run dev");
      process.exit(1);
    }

    console.error("Server failed to start:", error);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
