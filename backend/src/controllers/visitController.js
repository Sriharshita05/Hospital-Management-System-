import mongoose from "mongoose";
import Visit from "../models/Visit.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import logAudit from "../utils/auditLogger.js";
import generateId from "../utils/generateId.js";
import { clinicianScope, isLinkedClinician } from "../utils/clinicianScope.js";

// Front desk staff may see visits but not clinical details
const hiddenFieldsFor = (req) =>
  req.staff.role === "frontDesk" ? "-clinicalNotes -symptoms" : "";

const populateVisit = (query) =>
  query
    .populate("patient", "patientId name phone")
    .populate("doctor", "doctorId name specialization")
    .populate("appointment", "appointmentId appointmentDate startTime status");

// Create a new visit
export const createVisit = async (req, res) => {
  try {
    let {
      visitId,
      patient,
      doctor,
      appointment,
      visitDate,
      reason,
      symptoms,
      clinicalNotes,
      followUpDate
    } = req.body;

    // A linked clinician can only create visits for their own doctor profile
    if (isLinkedClinician(req)) {
      doctor = req.staff.doctor.toString();
    }

    let appointmentDoc = null;

    if (appointment) {
      if (!mongoose.isValidObjectId(appointment)) {
        return res.status(400).json({ success: false, message: "Invalid appointment ID" });
      }

      appointmentDoc = await Appointment.findById(appointment);

      if (!appointmentDoc) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
      }

      if (appointmentDoc.status === "Cancelled") {
        return res.status(400).json({
          success: false,
          message: "Cannot create a visit for a cancelled appointment"
        });
      }

      const existingVisit = await Visit.findOne({ appointment });

      if (existingVisit) {
        return res.status(409).json({
          success: false,
          message: `A visit (${existingVisit.visitId}) already exists for this appointment`
        });
      }

      // Fill patient / doctor from the appointment when not supplied
      patient = patient || appointmentDoc.patient.toString();
      doctor = doctor || appointmentDoc.doctor.toString();

      if (
        appointmentDoc.patient.toString() !== String(patient) ||
        appointmentDoc.doctor.toString() !== String(doctor)
      ) {
        return res.status(400).json({
          success: false,
          message: "Appointment, patient and doctor do not match"
        });
      }
    }

    if (!patient || !doctor || !visitDate || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide patient, doctor, visit date and reason"
      });
    }

    if (!mongoose.isValidObjectId(patient) || !mongoose.isValidObjectId(doctor)) {
      return res.status(400).json({ success: false, message: "Invalid patient or doctor ID" });
    }

    if (Number.isNaN(new Date(visitDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid visit date" });
    }

    if (followUpDate && Number.isNaN(new Date(followUpDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid follow-up date" });
    }

    const patientExists = await Patient.findOne({ _id: patient, isActive: { $ne: false } });

    if (!patientExists) {
      return res.status(404).json({ success: false, message: "Active patient not found" });
    }

    const doctorExists = await Doctor.findOne({ _id: doctor, isActive: true });

    if (!doctorExists) {
      return res.status(404).json({ success: false, message: "Active doctor not found" });
    }

    const visit = await Visit.create({
      visitId: visitId?.trim() || generateId("VIS"),
      patient,
      doctor,
      appointment: appointment || undefined,
      visitDate,
      reason: reason.trim(),
      symptoms,
      clinicalNotes,
      followUpDate: followUpDate || undefined
    });

    await logAudit(req, "CREATE", "Visit", "Created a new patient visit record", visit.visitId);

    return res.status(201).json({
      success: true,
      message: "Visit record created successfully",
      data: visit
    });
  } catch (error) {
    console.error("Create Visit Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Visit ID already exists" });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Failed to create visit" });
  }
};

// Get all visits
export const getAllVisits = async (req, res) => {
  try {
    const visits = await populateVisit(
      Visit.find(clinicianScope(req))
        .select(hiddenFieldsFor(req))
        .sort({ visitDate: -1, createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: visits.length,
      data: visits
    });
  } catch (error) {
    console.error("Get Visits Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve visits" });
  }
};

// Get visit by visitId
export const getVisitById = async (req, res) => {
  try {
    const visit = await populateVisit(
      Visit.findOne({ visitId: req.params.visitId, ...clinicianScope(req) })
        .select(hiddenFieldsFor(req))
    );

    if (!visit) {
      return res.status(404).json({ success: false, message: "Visit record not found" });
    }

    return res.status(200).json({ success: true, data: visit });
  } catch (error) {
    console.error("Get Visit Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve visit" });
  }
};

// Update visit
export const updateVisit = async (req, res) => {
  try {
    const allowedFields = ["reason", "symptoms", "clinicalNotes", "followUpDate", "status"];
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

    if (updates.status && !["In Progress", "Completed"].includes(updates.status)) {
      return res.status(400).json({ success: false, message: "Invalid visit status" });
    }

    if (updates.reason !== undefined && !String(updates.reason).trim()) {
      return res.status(400).json({ success: false, message: "Reason cannot be empty" });
    }

    if (updates.followUpDate === "") {
      updates.followUpDate = null;
    }

    if (updates.followUpDate && Number.isNaN(new Date(updates.followUpDate).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid follow-up date" });
    }

    const existing = await Visit.findOne({
      visitId: req.params.visitId,
      ...clinicianScope(req)
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Visit record not found" });
    }

    // A completed visit is a closed medical record
    if (existing.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed visits cannot be edited"
      });
    }

    Object.assign(existing, updates);
    await existing.save();

    // Completing the visit also completes a confirmed appointment
    if (updates.status === "Completed" && existing.appointment) {
      const linked = await Appointment.findById(existing.appointment);

      if (linked && linked.status === "Confirmed") {
        linked.status = "Completed";
        await linked.save();
      }
    }

    await logAudit(req, "UPDATE", "Visit", "Updated patient visit details", existing.visitId);

    return res.status(200).json({
      success: true,
      message: "Visit updated successfully",
      data: existing
    });
  } catch (error) {
    console.error("Update Visit Error:", error.message);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Failed to update visit" });
  }
};
