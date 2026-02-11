import express from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/userController.js";

/**
 * Routes define the API endpoints and map them to controller functions
 * This keeps your server.js clean and organized
 */

// Create a router instance
const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/auth/register", (req, res) => {
  registerUser(req, res);
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get authentication token
 * @access  Public
 */
router.post("/auth/login", (req, res) => {
  loginUser(req, res);
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post("/auth/logout", (req, res) => {
  logoutUser(req, res);
});

/**
 * Backward-compatible aliases for previous endpoint names
 */
router.post("/users", (req, res) => {
  registerUser(req, res);
});

router.post("/users/token", (req, res) => {
  loginUser(req, res);
});

export default router;
