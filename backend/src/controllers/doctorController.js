
import Doctor from "../models/Doctor.js";
import Department from "../models/Department.js";
import Appointment from "../models/Appointment.js";
import logAudit from "../utils/auditLogger.js";
import { getTodayIST } from "../utils/dates.js";

export const createDoctor = async (req, res) => {
  try {
    const {
      doctorId,
      name,
      email,
      phone,
      specialization,
      department,
      qualification,
      experience,
      consultationFee
    } = req.body;

    // Check required fields
    if (
      !doctorId ||
      !name ||
      !email ||
      !phone ||
      !specialization ||
      !department ||
      !qualification ||
      experience === undefined ||
      consultationFee === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Check whether doctor ID or email already exists
    const existingDoctor = await Doctor.findOne({
      $or: [
        { doctorId },
        { email: email.toLowerCase() }
      ]
    });

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: "Doctor ID or email already exists"
      });
    }

    // Check whether department exists and is active
    const existingDepartment = await Department.findOne({
      _id: department,
      isActive: true
    });

    if (!existingDepartment) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid active department"
      });
    }

    // Create doctor
    const doctor = await Doctor.create({
      doctorId,
      name,
      email,
      phone,
      specialization,
      department,
      qualification,
      experience,
      consultationFee
    });
    await logAudit(
  req,
  "CREATE",
  "Doctor",
  "Registered a new doctor",
  doctor.doctorId
);
    return res.status(201).json({
      success: true,
      message: "Doctor registered successfully",
      data: doctor
    });

  } catch (error) {
    console.error("Doctor registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Doctor ID or email already exists"
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor information or department ID"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while registering doctor"
    });
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({ isActive: true })
      .populate("department", "departmentId name location")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    console.error("Get doctors error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching doctors"
    });
  }
};

export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      doctorId: req.params.doctorId,
      isActive: true
    }).populate("department", "departmentId name location");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor
    });

  } catch (error) {
    console.error("Get doctor error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching doctor"
    });
  }
};

export const updateDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      specialization,
      department,
      qualification,
      experience,
      consultationFee
    } = req.body;

    const doctor = await Doctor.findOne({
      doctorId: req.params.doctorId,
      isActive: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }

    if (email && email.toLowerCase() !== doctor.email) {
      const existingEmail = await Doctor.findOne({
        email: email.toLowerCase(),
        _id: { $ne: doctor._id }
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already exists"
        });
      }
    }

    if (department) {
      const existingDepartment = await Department.findOne({
        _id: department,
        isActive: true
      });

      if (!existingDepartment) {
        return res.status(400).json({
          success: false,
          message: "Invalid or inactive department"
        });
      }
    }

    if (name !== undefined) doctor.name = name;
    if (email !== undefined) doctor.email = email.toLowerCase();
    if (phone !== undefined) doctor.phone = phone;
    if (specialization !== undefined) doctor.specialization = specialization;
    if (department !== undefined) doctor.department = department;
    if (qualification !== undefined) doctor.qualification = qualification;
    if (experience !== undefined) doctor.experience = experience;
    if (consultationFee !== undefined) doctor.consultationFee = consultationFee;

    await doctor.save();

    const updatedDoctor = await Doctor.findById(doctor._id)
      .populate("department", "departmentId name location");
      await logAudit(
  req,
  "UPDATE",
  "Doctor",
  "Updated doctor details",
  doctor.doctorId
);

    return res.status(200).json({
      success: true,
      message: "Doctor updated successfully",
      data: updatedDoctor
    });

  } catch (error) {
    console.error("Update doctor error:", error.message);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor information"
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Doctor email already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating doctor"
    });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      doctorId: req.params.doctorId,
      isActive: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found or already inactive"
      });
    }

    const { date: today } = getTodayIST();

    const upcoming = await Appointment.countDocuments({
      doctor: doctor._id,
      appointmentDate: { $gte: today },
      isSlotReserved: true,
      status: { $in: ["Pending", "Confirmed"] }
    });

    if (upcoming > 0) {
      return res.status(409).json({
        success: false,
        message: `This doctor has ${upcoming} upcoming appointment(s). Cancel or complete them first.`
      });
    }

    doctor.isActive = false;
    await doctor.save();
    await logAudit(
  req,
  "DEACTIVATE",
  "Doctor",
  "Deactivated a doctor",
  doctor.doctorId
);
    return res.status(200).json({
      success: true,
      message: "Doctor deactivated successfully"
    });

  } catch (error) {
    console.error("Delete doctor error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while deactivating doctor"
    });
  }
};
