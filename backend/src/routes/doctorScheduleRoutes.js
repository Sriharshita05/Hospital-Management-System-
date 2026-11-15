
import express from "express";

import {
  createDoctorSchedule,
  getAllDoctorSchedules,
  getDoctorScheduleById,
  updateDoctorSchedule,
  deleteDoctorSchedule
} from "../controllers/doctorScheduleController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All schedule routes require login
router.use(protect);

// Only admin can create schedules
router.post(
  "/",
  authorize("admin"),
  createDoctorSchedule
);

// Staff and clients can view schedules
router.get(
  "/",
  authorize("admin", "clinician", "frontDesk", "client"),
  getAllDoctorSchedules
);

router.get(
  "/doctor/:doctorId",
  authorize("admin", "clinician", "frontDesk", "client"),
  getDoctorScheduleById
);

// Only admin can update schedules
router.put(
  "/:scheduleId",
  authorize("admin"),
  updateDoctorSchedule
);

// Only admin can deactivate schedules
router.delete(
  "/:scheduleId",
  authorize("admin"),
  deleteDoctorSchedule
);

export default router;

