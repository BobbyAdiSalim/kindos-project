import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getMyProfile,
  updateMyProfile,
  getPublicProfile,
  resubmitDoctorVerification,
} from "../controllers/userController.js";
import {
  getUnverifiedDoctors,
  updateDoctorVerificationStatus,
  getDoctorVerificationHistory,
} from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post("/auth/forgot-password", (req, res) => {
  forgotPassword(req, res);
});

/**
 * @route   GET /api/auth/reset-password/:token/validate
 * @desc    Validate reset token
 * @access  Public
 */
router.get("/auth/reset-password/:token/validate", (req, res) => {
  validateResetToken(req, res);
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using one-time token
 * @access  Public
 */
router.post("/auth/reset-password", (req, res) => {
  resetPassword(req, res);
});

router.get("/profile/me", requireAuth, (req, res) => {
  getMyProfile(req, res);
});

router.put("/profile/me", requireAuth, (req, res) => {
  updateMyProfile(req, res);
});

router.get("/profile/:userId", (req, res) => {
  getPublicProfile(req, res);
});

router.get("/admin/doctors/unverified", requireAuth, requireRole("admin"), (req, res) => {
  getUnverifiedDoctors(req, res);
});

router.patch("/admin/doctors/:doctorId/verification", requireAuth, requireRole("admin"), (req, res) => {
  updateDoctorVerificationStatus(req, res);
});

router.get("/admin/doctors/verification-history", requireAuth, requireRole("admin"), (req, res) => {
  getDoctorVerificationHistory(req, res);
});

router.post("/doctor/verification/resubmit", requireAuth, requireRole("doctor"), (req, res) => {
  resubmitDoctorVerification(req, res);
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
