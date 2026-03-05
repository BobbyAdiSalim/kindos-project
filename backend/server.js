import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import pg from "pg";
import { shouldSeedDevelopmentData, seedDevelopmentData } from "./seed-dev-data.js";
import { User } from "./models/index.js";
const { Pool } = pg;

// Import routes
import userRoutes from "./routes/userRoutes.js";

const app = express();
const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 4000;
const SHOULD_SEED = shouldSeedDevelopmentData(process.argv, process.env);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Socket.io setup with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Socket.io JWT authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required."));
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(payload.userId);
    if (!user) {
      return next(new Error("Authentication failed."));
    }

    socket.auth = { userId: user.id, role: user.role };
    next();
  } catch (_error) {
    next(new Error("Invalid or expired token."));
  }
});

// Socket.io connection handler
io.on("connection", (socket) => {
  const { userId } = socket.auth;

  // Join a personal room for receiving direct notifications
  socket.join(`user_${userId}`);

  // Join a conversation room
  socket.on("join_conversation", (connectionId) => {
    socket.join(`connection_${connectionId}`);
  });

  // Leave a conversation room
  socket.on("leave_conversation", (connectionId) => {
    socket.leave(`connection_${connectionId}`);
  });

  // Handle real-time message sending
  socket.on("send_message", (data) => {
    const { connectionId, message } = data;
    // Broadcast to everyone in the conversation room except the sender
    socket.to(`connection_${connectionId}`).emit("new_message", message);
  });

  // Notify when typing
  socket.on("typing", (data) => {
    const { connectionId } = data;
    socket.to(`connection_${connectionId}`).emit("user_typing", { userId });
  });

  socket.on("stop_typing", (data) => {
    const { connectionId } = data;
    socket.to(`connection_${connectionId}`).emit("user_stop_typing", { userId });
  });

  socket.on("disconnect", () => {
    // Cleanup handled automatically by Socket.io
  });
});

// Make io accessible to controllers if needed
app.set("io", io);

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

  server = httpServer.listen(PORT, () => {
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
