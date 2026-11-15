
import Patient from "../models/Patient.js";
import Visit from "../models/Visit.js";
import Prescription from "../models/Prescription.js";
import DiagnosticReport from "../models/DiagnosticReport.js";
import logAudit from "../utils/auditLogger.js";

export const registerPatient = async (req, res) => {
  try {
    const {
      patientId,
      name,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      bloodGroup,
      emergencyContact
    } = req.body;

    // Check required fields
    if (
      !patientId ||
      !name ||
      !phone ||
      !dateOfBirth ||
      !gender ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Check duplicate patient ID
    const existingPatient = await Patient.findOne({ patientId });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "Patient ID already exists"
      });
    }

    // Create patient
    const patient = await Patient.create({
      patientId,
      name,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      bloodGroup,
      emergencyContact
    });
    await logAudit(
      req,
      "CREATE",
      "Patient",
      "Registered a new patient",
      patient.patientId
    );
    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: patient
    });

  } catch (error) {
    console.error("Patient registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Patient ID already exists"
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient information"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while registering patient"
    });
  }
};

export const getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({
      isActive: { $ne: false }
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });

  } catch (error) {
    console.error("Get patients error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching patients"
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOne({
      patientId,
      isActive: { $ne: false }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: patient
    });

  } catch (error) {
    console.error("Get patient error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching patient"
    });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    // A client may only update their own patient profile
    const currentUser = req.user || req.staff;
    if (currentUser?.role === "client" && currentUser.patientId !== patientId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update other patient profiles"
      });
    }

    const allowedFields = [
      "name",
      ...(currentUser?.role !== "client" ? ["email"] : []),
      "phone",
      "dateOfBirth",
      "gender",
      "address",
      "bloodGroup",
      "emergencyContact"
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

    const patient = await Patient.findOneAndUpdate(
      { patientId },
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Audit log must come before the success response
    await logAudit(
      req,
      "UPDATE",
      "Patient",
      "Updated patient details",
      patient.patientId
    );

    return res.status(200).json({
      success: true,
      message: "Patient updated successfully",
      data: patient
    });
  } catch (error) {
    console.error("Update patient error:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient information"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating patient"
    });
  }
};


export const deletePatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findOneAndUpdate(
      {
        patientId,
        isActive: { $ne: false }
      },
      {
        $set: { isActive: false }
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Active patient not found"
      });
    }

    await logAudit(
      req,
      "DEACTIVATE",
      "Patient",
      "Deactivated a patient",
      patient.patientId
    );

    return res.status(200).json({
      success: true,
      message: "Patient deactivated successfully",
      data: patient
    });

  } catch (error) {
    console.error("Delete patient error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deactivating patient"
    });
  }
};

// Client specific: Get authenticated patient's medical records (visits, prescriptions, reports)
export const getClientMedicalRecords = async (req, res) => {
  try {
    const patientId = req.user?._id || req.staff?._id;

    if (!patientId) {
      return res.status(401).json({
        success: false,
        message: "Client authentication required"
      });
    }

    const [visits, prescriptions, reports] = await Promise.all([
      Visit.find({ patient: patientId })
        .populate("doctor", "doctorId name specialization department consultationFee")
        .populate("appointment", "appointmentId appointmentDate startTime endTime")
        .sort({ visitDate: -1 }),
      Prescription.find({ patient: patientId })
        .populate("doctor", "doctorId name specialization")
        .populate("visit", "visitId visitDate")
        .sort({ createdAt: -1 }),
      DiagnosticReport.find({ patient: patientId })
        .populate("doctor", "doctorId name specialization")
        .populate("visit", "visitId visitDate")
        .sort({ reportDate: -1 })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        visits: visits || [],
        prescriptions: prescriptions || [],
        reports: reports || []
      }
    });
  } catch (error) {
    console.error("Get medical records error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching medical records"
    });
  }
};

