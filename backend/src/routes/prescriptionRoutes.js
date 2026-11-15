
import express from "express";

import {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionById
} from "../controllers/prescriptionController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All prescription routes require login
router.use(protect);

// Admin and clinicians can create prescriptions
router.post(
  "/",
  authorize("admin", "clinician"),
  createPrescription
);

// Only admin and clinicians can view prescriptions
router.get(
  "/",
  authorize("admin", "clinician"),
  getAllPrescriptions
);

router.get(
  "/:prescriptionId",
  authorize("admin", "clinician"),
  getPrescriptionById
);

export default router;
