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
  getDoctorVerificationDocument,
  resubmitDoctorVerification,
  getDoctors,
  getDoctorById,
} from "../controllers/userController.js";
import {
  getUnverifiedDoctors,
  updateDoctorVerificationStatus,
  getDoctorVerificationHistory,
} from "../controllers/adminController.js";
import {
  getAvailabilityPatterns,
  setAvailabilityPatterns,
  deleteAvailabilityPattern,
  getAvailabilitySlots,
  createAvailabilitySlots,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  getDoctorAvailability,
  getDoctorsWithAvailability,
  getBookableSlots,
} from "../controllers/availabilityController.js";
import {
  createAppointmentBooking,
  getMyAppointments,
  getAppointmentById,
  updateAppointmentDecision,
  cancelAppointmentByPatient,
  rescheduleAppointmentByPatient,
} from "../controllers/bookingController.js";
import {
  joinWaitlist,
  getMyWaitlistEntries,
  removeMyWaitlistEntry,
} from "../controllers/waitlistController.js";
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
 * @route   GET /api/doctors
 * @desc    Get all verified doctors with optional filtering
 * @access  Public
 */
router.get("/doctors", (req, res) => {
  getDoctors(req, res);
});

/**
 * @route   GET /api/doctors/with-availability
 * @desc    Get doctors with availability slots matching criteria
 * @access  Public
 */
router.get("/doctors/with-availability", (req, res) => {
  getDoctorsWithAvailability(req, res);
});

/**
 * @route   GET /api/doctors/:doctorId
 * @desc    Get a specific doctor by ID
 * @access  Public
 */
router.get("/doctors/:doctorId", (req, res) => {
  getDoctorById(req, res);
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

router.get(
  "/doctor/verification/:doctorId/documents/:documentIndex",
  requireAuth,
  requireRole("doctor", "admin"),
  (req, res) => {
    getDoctorVerificationDocument(req, res);
  }
);

/**
 * Availability Routes - Doctor availability management
 */

// Get doctor's own availability patterns (recurring weekly schedule)
router.get("/availability/patterns", requireAuth, requireRole("doctor"), (req, res) => {
  getAvailabilityPatterns(req, res);
});

// Set/update doctor's availability patterns
router.post("/availability/patterns", requireAuth, requireRole("doctor"), (req, res) => {
  setAvailabilityPatterns(req, res);
});

// Delete a specific availability pattern
router.delete("/availability/patterns/:patternId", requireAuth, requireRole("doctor"), (req, res) => {
  deleteAvailabilityPattern(req, res);
});

// Get doctor's specific availability slots
router.get("/availability/slots", requireAuth, requireRole("doctor"), (req, res) => {
  getAvailabilitySlots(req, res);
});

// Create specific availability slots
router.post("/availability/slots", requireAuth, requireRole("doctor"), (req, res) => {
  createAvailabilitySlots(req, res);
});

// Update a specific availability slot
router.put("/availability/slots/:slotId", requireAuth, requireRole("doctor"), (req, res) => {
  updateAvailabilitySlot(req, res);
});

// Delete a specific availability slot
router.delete("/availability/slots/:slotId", requireAuth, requireRole("doctor"), (req, res) => {
  deleteAvailabilitySlot(req, res);
});

// Public route - Get computed bookable time slots for a doctor on a specific date
router.get("/availability/doctor/:userId/slots", (req, res) => {
  getBookableSlots(req, res);
});

// Public route - Get raw availability for a specific doctor (for patients)
router.get("/availability/doctor/:doctorId", (req, res) => {
  getDoctorAvailability(req, res);
});

/**
 * Appointment Booking Routes
 */
router.post("/appointments", requireAuth, requireRole("patient"), (req, res) => {
  createAppointmentBooking(req, res);
});

router.get("/appointments/my", requireAuth, requireRole("patient", "doctor"), (req, res) => {
  getMyAppointments(req, res);
});

router.get("/appointments/:appointmentId", requireAuth, requireRole("patient", "doctor"), (req, res) => {
  getAppointmentById(req, res);
});

router.patch("/appointments/:appointmentId/status", requireAuth, requireRole("doctor"), (req, res) => {
  updateAppointmentDecision(req, res);
});

router.patch("/appointments/:appointmentId/cancel", requireAuth, requireRole("patient"), (req, res) => {
  cancelAppointmentByPatient(req, res);
});

router.patch("/appointments/:appointmentId/reschedule", requireAuth, requireRole("patient"), (req, res) => {
  rescheduleAppointmentByPatient(req, res);
});

/**
 * Waitlist Routes
 */
router.post("/waitlist", requireAuth, requireRole("patient"), (req, res) => {
  joinWaitlist(req, res);
});

router.get("/waitlist/my", requireAuth, requireRole("patient"), (req, res) => {
  getMyWaitlistEntries(req, res);
});

router.delete("/waitlist/:waitlistEntryId", requireAuth, requireRole("patient"), (req, res) => {
  removeMyWaitlistEntry(req, res);
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
