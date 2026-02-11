import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";

/**
 * Routes define the API endpoints and map them to controller functions
 * This keeps your server.js clean and organized
 */

// Create a router instance
const router = express.Router();

/**
 * @route   POST /api/users
 * @desc    Register a new user
 * @access  Public
 */
router.post("/users", express.json(), (req, res) => {
  registerUser(req, res, req.app.locals.pool);
});

/**
 * @route   POST /api/users/token
 * @desc    Login user and get authentication token
 * @access  Public
 */
router.post("/users/token", express.json(), (req, res) => {
  loginUser(req, res, req.app.locals.pool);
});

export default router;
