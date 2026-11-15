import express from "express";

import {
  registerStaff,
  registerClient,
  loginStaff,
  getMe,
  updateMe,
  getAllStaff,
  updateStaff
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public client registration
router.post("/client/register", registerClient);

// Public login (supports Admin, Doctor, Receptionist, and Client)
router.post("/login", loginStaff);

// Current user profile
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

// Staff management – admin only
router.post("/register", protect, authorize("admin"), registerStaff);
router.get("/staff", protect, authorize("admin"), getAllStaff);
router.put("/staff/:staffId", protect, authorize("admin"), updateStaff);

export default router;
