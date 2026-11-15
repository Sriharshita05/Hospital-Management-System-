
import express from "express";

import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from "../controllers/departmentController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All department routes require login
router.use(protect);

// Only admin can create departments
router.post(
  "/",
  authorize("admin"),
  createDepartment
);

// Staff and clients can view departments
router.get(
  "/",
  authorize("admin", "clinician", "frontDesk", "client"),
  getAllDepartments
);

router.get(
  "/:departmentId",
  authorize("admin", "clinician", "frontDesk", "client"),
  getDepartmentById
);

// Only admin can update departments
router.put(
  "/:departmentId",
  authorize("admin"),
  updateDepartment
);

// Only admin can deactivate departments
router.delete(
  "/:departmentId",
  authorize("admin"),
  deleteDepartment
);

export default router;
