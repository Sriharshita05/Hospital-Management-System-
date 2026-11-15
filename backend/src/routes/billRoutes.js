
import express from "express";

import {
  createBill,
  getAllBills,
  getBillById,
  updatePaymentStatus
} from "../controllers/billController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All billing routes require login
router.use(protect);

// Admin and front desk can create bills
router.post(
  "/",
  authorize("admin", "frontDesk"),
  createBill
);

// Admin and front desk can view bills
router.get(
  "/",
  authorize("admin", "frontDesk"),
  getAllBills
);

router.get(
  "/:billId",
  authorize("admin", "frontDesk"),
  getBillById
);

// Admin and front desk can update payment status (only admin can refund)
router.patch(
  "/:billId/payment",
  authorize("admin", "frontDesk"),
  updatePaymentStatus
);

export default router;
