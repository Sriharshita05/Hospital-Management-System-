import mongoose from "mongoose";

const diagnosticReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: true
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },

    testName: {
      type: String,
      required: true,
      trim: true
    },

    reportDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending"
    },

    fileName: {
      type: String,
      trim: true
    },

    fileReference: {
      type: String,
      trim: true
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

const DiagnosticReport = mongoose.model(
  "DiagnosticReport",
  diagnosticReportSchema
);

export default DiagnosticReport;