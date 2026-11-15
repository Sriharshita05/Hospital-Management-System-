
import DoctorSchedule from "../models/DoctorSchedule.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import logAudit from "../utils/auditLogger.js";
import { getTodayIST } from "../utils/dates.js";

// Upcoming appointments that still hold a slot on this schedule
const countFutureBookings = (scheduleId) => {
  const { date: today } = getTodayIST();

  return Appointment.countDocuments({
    schedule: scheduleId,
    appointmentDate: { $gte: today },
    isSlotReserved: true,
    status: { $in: ["Pending", "Confirmed"] }
  });
};

export const createDoctorSchedule = async (req, res) => {
  try {
    const {
      doctor,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration
    } = req.body;

    // Check required fields
    if (
      !doctor ||
      !dayOfWeek ||
      !startTime ||
      !endTime ||
      slotDuration === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    // Check whether doctor exists and is active
    const existingDoctor = await Doctor.findOne({
      _id: doctor,
      isActive: true
    });

    if (!existingDoctor) {
      return res.status(404).json({
        success: false,
        message: "Active doctor not found"
      });
    }

    // Check for an existing schedule
    const existingSchedule = await DoctorSchedule.findOne({
      doctor,
      dayOfWeek
    });

    if (existingSchedule && existingSchedule.isActive) {
      return res.status(409).json({
        success: false,
        message: "Schedule already exists for this day"
      });
    }

    // A deactivated schedule for the same day is re-activated with the new times
    if (existingSchedule && !existingSchedule.isActive) {
      existingSchedule.startTime = startTime;
      existingSchedule.endTime = endTime;
      existingSchedule.slotDuration = slotDuration;
      existingSchedule.isActive = true;
      await existingSchedule.save();

      await logAudit(
        req,
        "UPDATE",
        "Schedule",
        "Re-activated a doctor schedule",
        existingSchedule._id.toString()
      );

      return res.status(201).json({
        success: true,
        message: "Doctor schedule created successfully",
        data: existingSchedule
      });
    }

    // Create schedule
    const schedule = await DoctorSchedule.create({
      doctor,
      dayOfWeek,
      startTime,
      endTime,
      slotDuration
    });
    await logAudit(
  req,
  "CREATE",
  "Schedule",
  "Created a doctor schedule",
  schedule._id.toString()
);
    return res.status(201).json({
      success: true,
      message: "Doctor schedule created successfully",
      data: schedule
    });

  } catch (error) {
    console.error("Schedule creation error:", error.message);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule information"
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Schedule already exists for this day"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating schedule"
    });
  }
};

export const getAllDoctorSchedules = async (req, res) => {
  try {
    const schedules = await DoctorSchedule.find({ isActive: true })
      .populate("doctor", "doctorId name specialization")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });

  } catch (error) {
    console.error("Get schedules error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching schedules"
    });
  }
};

export const getDoctorScheduleById = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Find doctor using custom doctorId
    const doctor = await Doctor.findOne({
      doctorId,
      isActive: true
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Active doctor not found"
      });
    }

    // Find doctor's active schedules
    const schedules = await DoctorSchedule.find({
      doctor: doctor._id,
      isActive: true
    }).sort({ dayOfWeek: 1 });

    return res.status(200).json({
      success: true,
      doctor: {
        doctorId: doctor.doctorId,
        name: doctor.name,
        specialization: doctor.specialization
      },
      count: schedules.length,
      data: schedules
    });

  } catch (error) {
    console.error("Get doctor schedule error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching doctor schedule"
    });
  }
};

export const updateDoctorSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const {
      dayOfWeek,
      startTime,
      endTime,
      slotDuration
    } = req.body;

    const schedule = await DoctorSchedule.findOne({
      _id: scheduleId,
      isActive: true
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Active schedule not found"
      });
    }

    if (await countFutureBookings(schedule._id)) {
      return res.status(409).json({
        success: false,
        message: "This schedule has upcoming appointments. Cancel or complete them before changing it."
      });
    }

    if (dayOfWeek !== undefined) {
      schedule.dayOfWeek = dayOfWeek;
    }

    if (startTime !== undefined) {
      schedule.startTime = startTime;
    }

    if (endTime !== undefined) {
      schedule.endTime = endTime;
    }

    if (slotDuration !== undefined) {
      schedule.slotDuration = slotDuration;
    }

    await schedule.save();
    await logAudit(
  req,
  "UPDATE",
  "Schedule",
  "Updated a doctor schedule",
  schedule._id.toString()
);
    return res.status(200).json({
      success: true,
      message: "Doctor schedule updated successfully",
      data: schedule
    });

  } catch (error) {
    console.error("Update schedule error:", error.message);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule information"
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A schedule already exists for this day"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating schedule"
    });
  }
};

export const deleteDoctorSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;

    const schedule = await DoctorSchedule.findOne({
      _id: scheduleId,
      isActive: true
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found or already inactive"
      });
    }

    if (await countFutureBookings(schedule._id)) {
      return res.status(409).json({
        success: false,
        message: "This schedule has upcoming appointments. Cancel or complete them before deactivating it."
      });
    }

    schedule.isActive = false;
    await schedule.save();
    await logAudit(
  req,
  "DEACTIVATE",
  "Schedule",
  "Deactivated a doctor schedule",
  schedule._id.toString()
);
    return res.status(200).json({
      success: true,
      message: "Doctor schedule deactivated successfully"
    });

  } catch (error) {
    console.error("Delete schedule error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while deactivating schedule"
    });
  }
};
