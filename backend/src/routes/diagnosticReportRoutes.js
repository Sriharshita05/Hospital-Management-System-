
import express from "express";

import {
  createDiagnosticReport,
  getAllDiagnosticReports,
  getDiagnosticReportById,
  updateDiagnosticReport
} from "../controllers/diagnosticReportController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All diagnostic report routes require login
router.use(protect);

// Admin and clinicians can create reports
router.post(
  "/",
  authorize("admin", "clinician"),
  createDiagnosticReport
);

// Only admin and clinicians can view reports
router.get(
  "/",
  authorize("admin", "clinician"),
  getAllDiagnosticReports
);

router.get(
  "/:reportId",
  authorize("admin", "clinician"),
  getDiagnosticReportById
);

// Admin and clinicians can update reports
router.put(
  "/:reportId",
  authorize("admin", "clinician"),
  updateDiagnosticReport
);

export default router;
