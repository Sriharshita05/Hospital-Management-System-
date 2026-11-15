import mongoose from "mongoose";
import Prescription from "../models/Prescription.js";
import Visit from "../models/Visit.js";
import logAudit from "../utils/auditLogger.js";
import generateId from "../utils/generateId.js";
import { clinicianScope, isLinkedClinician } from "../utils/clinicianScope.js";

const populatePrescription = (query) =>
  query
    .populate("visit", "visitId visitDate reason")
    .populate("patient", "patientId name")
    .populate("doctor", "doctorId name specialization");

// Create prescription (patient and doctor are taken from the visit)
export const createPrescription = async (req, res) => {
  try {
    const { prescriptionId, visit, medicines, notes } = req.body;

    if (!visit || !mongoose.isValidObjectId(visit)) {
      return res.status(400).json({ success: false, message: "A valid visit is required" });
    }

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one medicine is required"
      });
    }

    for (const m of medicines) {
      if (
        !m?.medicineName?.trim() ||
        !m?.dosage?.trim() ||
        !m?.frequency?.trim() ||
        !m?.duration?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Each medicine needs a name, dosage, frequency and duration"
        });
      }
    }

    const visitDoc = await Visit.findById(visit);

    if (!visitDoc) {
      return res.status(404).json({ success: false, message: "Visit record not found" });
    }

    if (isLinkedClinician(req) && visitDoc.doctor.toString() !== req.staff.doctor.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only prescribe for your own visits"
      });
    }

    const prescription = await Prescription.create({
      prescriptionId: prescriptionId?.trim() || generateId("RX"),
      visit: visitDoc._id,
      patient: visitDoc.patient,
      doctor: visitDoc.doctor,
      medicines: medicines.map((m) => ({
        medicineName: m.medicineName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions
      })),
      notes
    });

    await logAudit(
      req,
      "CREATE",
      "Prescription",
      "Created a new prescription",
      prescription.prescriptionId
    );

    return res.status(201).json({
      success: true,
      message: "Prescription created successfully",
      data: prescription
    });
  } catch (error) {
    console.error("Create Prescription Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Prescription ID already exists" });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Failed to create prescription" });
  }
};

// Get all prescriptions
export const getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await populatePrescription(
      Prescription.find(clinicianScope(req)).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error("Get Prescriptions Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve prescriptions" });
  }
};

// Get one prescription by prescriptionId
export const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await populatePrescription(
      Prescription.findOne({
        prescriptionId: req.params.prescriptionId,
        ...clinicianScope(req)
      })
    );

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    return res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    console.error("Get Prescription Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve prescription" });
  }
};
