import mongoose from "mongoose";
import DiagnosticReport from "../models/DiagnosticReport.js";
import Visit from "../models/Visit.js";
import logAudit from "../utils/auditLogger.js";
import generateId from "../utils/generateId.js";
import { clinicianScope, isLinkedClinician } from "../utils/clinicianScope.js";

const populateReport = (query) =>
  query
    .populate("visit", "visitId visitDate")
    .populate("patient", "patientId name")
    .populate("doctor", "doctorId name specialization");

// Create diagnostic report (patient and doctor are taken from the visit)
export const createDiagnosticReport = async (req, res) => {
  try {
    const {
      reportId,
      visit,
      testName,
      reportDate,
      status,
      fileName,
      fileReference,
      remarks
    } = req.body;

    if (!visit || !mongoose.isValidObjectId(visit) || !testName?.trim() || !reportDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid visit, test name and report date"
      });
    }

    if (Number.isNaN(new Date(reportDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid report date" });
    }

    if (status && !["Pending", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid report status" });
    }

    const visitDoc = await Visit.findById(visit);

    if (!visitDoc) {
      return res.status(404).json({ success: false, message: "Visit record not found" });
    }

    if (isLinkedClinician(req) && visitDoc.doctor.toString() !== req.staff.doctor.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only create reports for your own visits"
      });
    }

    const report = await DiagnosticReport.create({
      reportId: reportId?.trim() || generateId("DR"),
      visit: visitDoc._id,
      patient: visitDoc.patient,
      doctor: visitDoc.doctor,
      testName: testName.trim(),
      reportDate,
      status,
      fileName,
      fileReference,
      remarks
    });

    await logAudit(
      req,
      "CREATE",
      "DiagnosticReport",
      "Created a new diagnostic report",
      report.reportId
    );

    return res.status(201).json({
      success: true,
      message: "Diagnostic report created successfully",
      data: report
    });
  } catch (error) {
    console.error("Create Diagnostic Report Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Report ID already exists" });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Failed to create diagnostic report" });
  }
};

// Get all diagnostic reports
export const getAllDiagnosticReports = async (req, res) => {
  try {
    const reports = await populateReport(
      DiagnosticReport.find(clinicianScope(req)).sort({ reportDate: -1, createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    console.error("Get Diagnostic Reports Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve diagnostic reports" });
  }
};

// Get one report by reportId
export const getDiagnosticReportById = async (req, res) => {
  try {
    const report = await populateReport(
      DiagnosticReport.findOne({ reportId: req.params.reportId, ...clinicianScope(req) })
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "Diagnostic report not found" });
    }

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error("Get Diagnostic Report Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve diagnostic report" });
  }
};

// Update a diagnostic report
export const updateDiagnosticReport = async (req, res) => {
  try {
    const allowedFields = [
      "testName",
      "reportDate",
      "status",
      "fileName",
      "fileReference",
      "remarks"
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update"
      });
    }

    if (updates.status && !["Pending", "Completed"].includes(updates.status)) {
      return res.status(400).json({ success: false, message: "Invalid report status" });
    }

    if (updates.testName !== undefined && !String(updates.testName).trim()) {
      return res.status(400).json({ success: false, message: "Test name cannot be empty" });
    }

    if (updates.reportDate && Number.isNaN(new Date(updates.reportDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid report date" });
    }

    const report = await DiagnosticReport.findOneAndUpdate(
      { reportId: req.params.reportId, ...clinicianScope(req) },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: "Diagnostic report not found" });
    }

    await logAudit(
      req,
      "UPDATE",
      "DiagnosticReport",
      "Updated a diagnostic report",
      report.reportId
    );

    return res.status(200).json({
      success: true,
      message: "Diagnostic report updated successfully",
      data: report
    });
  } catch (error) {
    console.error("Update Diagnostic Report Error:", error.message);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Failed to update diagnostic report" });
  }
};
