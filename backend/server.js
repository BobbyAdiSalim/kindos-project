import express from "express";
import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
  } catch (error) {
    console.error("Error connecting to PostgreSQL:", error);
  }
}

connectToPG();

// Open Port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });

// Register a new user
app.post("/users", express.json(), async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Basic body request check
      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password both needed to register." });
      }
  
      // Creating hashed password (search up bcrypt online for more info)
      // and storing user info in database
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id",
        [username, hashedPassword]
      );
  
      // Returning JSON Web Token (search JWT for more explanation)
      const token = jwt.sign({ userId: result.rows[0].id }, "secret-key", { expiresIn: "1h" });
      res.status(201).json({ response: "User registered successfully.", token });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// Log in an existing user
app.post("/users/token", express.json(), async (req, res) => {
    try {
      const { username, password } = req.body;
  
      // Basic body request check
      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password both needed to login." });
      }
  
      // Find username in database
      const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      const user = result.rows[0];
  
      // Validate user against hashed password in database
      if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ userId: user.id }, "secret-key", { expiresIn: "1h" });
  
        // Send JSON Web Token to valid user
        res.json({ response: "User logged in succesfully.", token: token }); //Implicitly status 200
      } else {
        res.status(401).json({ error: "Authentication failed." });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
