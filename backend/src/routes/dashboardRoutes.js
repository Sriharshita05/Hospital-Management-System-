import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);

// Billing figures inside are only returned to admin / front desk
router.get("/stats", authorize("admin", "clinician", "frontDesk"), getDashboardStats);

export default router;
