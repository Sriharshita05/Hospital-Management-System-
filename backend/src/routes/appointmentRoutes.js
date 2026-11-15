
import express from "express";

import {
  bookAppointment,
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getClientAppointments,
  bookClientAppointment,
  cancelClientAppointment,
  rescheduleClientAppointment,
  getAvailableSlots
} from "../controllers/appointmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All appointment routes require login
router.use(protect);

// Helper for checking slot availability (staff and clients)
router.get(
  "/slots/available",
  authorize("admin", "clinician", "frontDesk", "client"),
  getAvailableSlots
);

// Client appointment routes
router.get(
  "/my",
  authorize("client"),
  getClientAppointments
);

router.post(
  "/my",
  authorize("client"),
  bookClientAppointment
);

router.patch(
  "/my/:appointmentId/cancel",
  authorize("client"),
  cancelClientAppointment
);

router.patch(
  "/my/:appointmentId/reschedule",
  authorize("client"),
  rescheduleClientAppointment
);

// Admin and front desk can book appointments
router.post(
  "/",
  authorize("admin", "frontDesk"),
  bookAppointment
);

// Staff can view all appointments
router.get(
  "/",
  authorize("admin", "clinician", "frontDesk"),
  getAllAppointments
);

router.get(
  "/:appointmentId",
  authorize("admin", "clinician", "frontDesk"),
  getAppointmentById
);

// Admin and front desk can update appointment status
router.patch(
  "/:appointmentId/status",
  authorize("admin", "frontDesk"),
  updateAppointmentStatus
);

export default router;
