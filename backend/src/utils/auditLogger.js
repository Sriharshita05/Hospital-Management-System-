import AuditLog from "../models/AuditLog.js";

const logAudit = async (
  req,
  action,
  module,
  description,
  resourceId = null,
  status = "Success"
) => {
  try {
    // Do not create an audit entry without an authenticated staff user
    if (!req.staff?._id || req.staff.role === "client") {
      return;
    }

    await AuditLog.create({
      staff: req.staff._id,
      action,
      module,
      description,
      resourceId,
      ipAddress: req.ip,
      status
    });
  } catch (error) {
    // Logging failure should not break the request
    console.error("Audit logging failed:", error.message);
  }
};

export default logAudit;
