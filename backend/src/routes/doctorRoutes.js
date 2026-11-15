
import express from "express";

import {
  createDoctor,
  getAllDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor
} from "../controllers/doctorController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All doctor routes require login
router.use(protect);

// Only admin can register doctors
router.post(
  "/",
  authorize("admin"),
  createDoctor
);

// Staff and clients can view doctors
router.get(
  "/",
  authorize("admin", "clinician", "frontDesk", "client"),
  getAllDoctors
);

router.get(
  "/:doctorId",
  authorize("admin", "clinician", "frontDesk", "client"),
  getDoctorById
);

// Only admin can update doctor details
router.put(
  "/:doctorId",
  authorize("admin"),
  updateDoctor
);

// Only admin can deactivate doctors
router.delete(
  "/:doctorId",
  authorize("admin"),
  deleteDoctor
);

export default router;

