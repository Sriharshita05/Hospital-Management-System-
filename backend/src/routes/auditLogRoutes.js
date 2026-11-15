
import express from "express";
import { getAllAuditLogs } from "../controllers/auditLogController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Only authenticated Admin users can view audit logs
router.use(protect);
router.get("/", authorize("admin"), getAllAuditLogs);

export default router;
