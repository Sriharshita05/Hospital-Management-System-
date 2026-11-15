import AuditLog from "../models/AuditLog.js";
import { parseDateOnly, addDays } from "../utils/dates.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Query values are always treated as plain strings
const str = (v) => (typeof v === "string" ? v.trim() : "");

export const getAllAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(str(req.query.page), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(str(req.query.limit), 10) || 20, 1), 100);

    const filter = {};

    const module = str(req.query.module);
    const action = str(req.query.action);
    const status = str(req.query.status);
    const search = str(req.query.search);

    if (module) filter.module = module;
    if (action) filter.action = action.toUpperCase();
    if (status && ["Success", "Failed"].includes(status)) filter.status = status;

    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ description: regex }, { resourceId: regex }];
    }

    const from = parseDateOnly(str(req.query.from));
    const to = parseDateOnly(str(req.query.to));

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lt = addDays(to, 1);
    }

    const [total, auditLogs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate("staff", "staffId name email role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ]);

    return res.status(200).json({
      success: true,
      count: total,
      data: auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error("Get audit logs error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching audit logs"
    });
  }
};
