
import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true
    },

    action: {
      type: String,
      required: true,
      trim: true
    },

    module: {
      type: String,
      required: true,
      enum: [
        "Authentication",
        "Patient",
        "Department",
        "Doctor",
        "Schedule",
        "Appointment",
        "Visit",
        "Prescription",
        "DiagnosticReport",
        "Billing"
      ]
    },

    description: {
      type: String,
      trim: true
    },

    resourceId: {
      type: String
    },

    ipAddress: {
      type: String
    },

    status: {
      type: String,
      enum: ["Success", "Failed"],
      default: "Success"
    }
  },
  { timestamps: true }
);

// Indexes for audit log searches
auditLogSchema.index({ staff: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;
