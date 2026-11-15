
import express from "express";

import {
  registerPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getClientMedicalRecords
} from "../controllers/patientController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All patient routes require login
router.use(protect);

// Client medical records (visits, prescriptions, diagnostic reports)
router.get(
  "/my/records",
  authorize("client"),
  getClientMedicalRecords
);

// Admin and front desk can register patients
router.post(
  "/register",
  authorize("admin", "frontDesk"),
  registerPatient
);

// All staff roles can view patients
router.get(
  "/",
  authorize("admin", "frontDesk", "clinician"),
  getAllPatients
);

router.get(
  "/:patientId",
  authorize("admin", "frontDesk", "clinician"),
  getPatientById
);

// Admin, front desk, and client (own profile only) can update patient details
router.put(
  "/:patientId",
  authorize("admin", "frontDesk", "client"),
  updatePatient
);

// Only admin can deactivate a patient
router.delete(
  "/:patientId",
  authorize("admin"),
  deletePatient
);

export default router;
