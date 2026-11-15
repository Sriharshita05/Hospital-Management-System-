
import express from "express";

import {
  createVisit,
  getAllVisits,
  getVisitById,
  updateVisit
} from "../controllers/visitController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All visit routes require login
router.use(protect);

// Admin and clinicians can create visits
router.post(
  "/",
  authorize("admin", "clinician"),
  createVisit
);

// All staff can view visits
router.get(
  "/",
  authorize("admin", "clinician", "frontDesk"),
  getAllVisits
);

router.get(
  "/:visitId",
  authorize("admin", "clinician", "frontDesk"),
  getVisitById
);

// Admin and clinicians can update visits
router.put(
  "/:visitId",
  authorize("admin", "clinician"),
  updateVisit
);

export default router;
