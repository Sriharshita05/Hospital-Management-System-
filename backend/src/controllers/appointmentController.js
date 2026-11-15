
import mongoose from "mongoose";

import Appointment from "../models/Appointment.js";
import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import DoctorSchedule from "../models/DoctorSchedule.js";
import logAudit from "../utils/auditLogger.js";
import generateId from "../utils/generateId.js";

// Convert HH:mm into minutes
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

// Generate occupied slots at fixed 5-minute intervals
const generateOccupiedSlots = (startMinutes, endMinutes) => {
  const slots = [];

  for (let time = startMinutes; time < endMinutes; time += 5) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;

    slots.push(
      `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    );
  }

  return slots;
};

// Get current date and time in India
const getHospitalDateTime = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const values = {};

  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute)
  };
};

// Book appointment
export const bookAppointment = async (req, res) => {
  try {
    const {
      patient,
      doctor,
      appointmentDate,
      startTime,
      reason
    } = req.body;

    // Use the supplied ID or generate one
    const appointmentId =
      typeof req.body.appointmentId === "string" && req.body.appointmentId.trim()
        ? req.body.appointmentId.trim()
        : generateId("APT");

    if (
      !patient ||
      !doctor ||
      !appointmentDate ||
      !startTime ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields"
      });
    }

    if (
      typeof patient !== "string" ||
      typeof doctor !== "string" ||
      typeof appointmentDate !== "string" ||
      typeof startTime !== "string" ||
      !mongoose.isValidObjectId(patient) ||
      !mongoose.isValidObjectId(doctor)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient or doctor ID"
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date. Use YYYY-MM-DD"
      });
    }

    const [year, month, day] = appointmentDate.split("-").map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid calendar date"
      });
    }

    // Validate appointment date and time using India timezone
    const hospitalDateTime = getHospitalDateTime();
    const todayString = hospitalDateTime.date;

    if (appointmentDate < todayString) {
      return res.status(400).json({
        success: false,
        message: "Appointment date cannot be in the past"
      });
    }

    // Validate start time
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment start time"
      });
    }

    const startMinutes = timeToMinutes(startTime);

    if (
      appointmentDate === todayString &&
      startMinutes <= hospitalDateTime.minutes
    ) {
      return res.status(400).json({
        success: false,
        message: "Appointment time must be in the future"
      });
    }

    // Check active patient
    const existingPatient = await Patient.findOne({
      _id: patient,
      isActive: true
    });

    if (!existingPatient) {
      return res.status(404).json({
        success: false,
        message: "Active patient not found"
      });
    }

    // Check active doctor
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

    // Get weekday from the canonical UTC calendar date
    const dayOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ][date.getUTCDay()];

    // Find doctor's active schedule
    const schedule = await DoctorSchedule.findOne({
      doctor,
      dayOfWeek,
      isActive: true
    });

    if (!schedule) {
      return res.status(400).json({
        success: false,
        message: "Doctor is not available on this day"
      });
    }

    // Calculate appointment end time
    const endMinutes = startMinutes + schedule.slotDuration;

    if (
      startMinutes < timeToMinutes(schedule.startTime) ||
      endMinutes > timeToMinutes(schedule.endTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Selected time is outside doctor's working hours"
      });
    }

    // Require the start time to align with the schedule
    const offset =
      startMinutes - timeToMinutes(schedule.startTime);

    if (
      !Number.isInteger(schedule.slotDuration) ||
      schedule.slotDuration < 5 ||
      schedule.slotDuration % 5 !== 0 ||
      offset % schedule.slotDuration !== 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Selected time does not match the doctor's slot interval"
      });
    }

    // Calculate end time in HH:mm format
    const endTime =
      `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:` +
      `${String(endMinutes % 60).padStart(2, "0")}`;

    // Generate fixed 5-minute occupied slots
    const occupiedSlots = generateOccupiedSlots(
      startMinutes,
      endMinutes
    );

    // Define the selected calendar day
    const appointmentStart = new Date(date);
    const appointmentEnd = new Date(date);
    appointmentEnd.setUTCDate(appointmentEnd.getUTCDate() + 1);

    // Check for overlapping active appointments
   // Check for overlapping appointments that still reserve slots
const overlappingAppointment = await Appointment.findOne({
  doctor,
  appointmentDate: {
    $gte: appointmentStart,
    $lt: appointmentEnd
  },
  isSlotReserved: true,
  occupiedSlots: {
    $in: occupiedSlots
  }
});

    if (overlappingAppointment) {
      return res.status(409).json({
        success: false,
        message: "This appointment slot is already booked"
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      appointmentId,
      patient,
      doctor,
      schedule: schedule._id,
      appointmentDate: date,
      startTime,
      endTime,
      occupiedSlots,
      reason: reason.trim()
    });

    // Create audit log
    await logAudit(
      req,
      "CREATE",
      "Appointment",
      "Booked a new appointment",
      appointment.appointmentId
    );

    return res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      data: appointment
    });

  } catch (error) {
    console.error("Book appointment error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Appointment ID or time slot already exists"
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while booking appointment"
    });
  }
};

// Get all appointments
export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "patientId name phone")
      .populate("doctor", "doctorId name specialization")
      .populate("schedule", "dayOfWeek startTime endTime slotDuration")
      .sort({ appointmentDate: 1, startTime: 1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });

  } catch (error) {
    console.error("Get appointments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching appointments"
    });
  }
};

// Get appointment by appointmentId
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      appointmentId: req.params.appointmentId
    })
      .populate("patient", "patientId name phone email")
      .populate("doctor", "doctorId name specialization")
      .populate("schedule", "dayOfWeek startTime endTime slotDuration");

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error("Get appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve appointment"
    });
  }
};

// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Approved",
      "Completed",
      "Cancelled",
      "Rejected"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status"
      });
    }

    const appointment = await Appointment.findOne({
      appointmentId: req.params.appointmentId
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    const previousStatus = appointment.status;
  
    if (["Cancelled", "Rejected", "Completed"].includes(previousStatus)) {
      return res.status(400).json({
        success: false,
        message: "Cancelled, rejected or completed appointments cannot be changed"
      });
    }

    if (
      previousStatus === "Pending" &&
      !["Confirmed", "Approved", "Cancelled", "Rejected"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Pending appointments can only be approved, confirmed, rejected or cancelled"
      });
    }

    if (
      ["Confirmed", "Approved"].includes(previousStatus) &&
      !["Completed", "Cancelled", "Rejected"].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Confirmed appointments can only be completed, cancelled or rejected"
      });
    }
appointment.status = status;

// Release the reserved slots when cancelled or rejected.
if (status === "Cancelled" || status === "Rejected") {
  appointment.isSlotReserved = false;
}

await appointment.save();

    await logAudit(
      req,
      "UPDATE",
      "Appointment",
      `Changed appointment status from ${previousStatus} to ${status}`,
      appointment.appointmentId
    );

    return res.status(200).json({
      success: true,
      message: "Appointment status updated successfully",
      data: appointment
    });

  } catch (error) {
    console.error("Update appointment status error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update appointment status"
    });
  }
};

// Client specific: Get logged-in client's appointments
export const getClientAppointments = async (req, res) => {
  try {
    const clientId = req.user?._id || req.staff?._id;

    const appointments = await Appointment.find({ patient: clientId })
      .populate("patient", "patientId name phone email")
      .populate({
        path: "doctor",
        select: "doctorId name specialization department consultationFee",
        populate: { path: "department", select: "name departmentId" }
      })
      .populate("schedule", "dayOfWeek startTime endTime slotDuration")
      .sort({ appointmentDate: -1, startTime: -1 });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error("Get client appointments error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching your appointments"
    });
  }
};

// Client specific: Book appointment for self
export const bookClientAppointment = async (req, res) => {
  try {
    const clientId = (req.user?._id || req.staff?._id)?.toString();

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: "Client authentication required"
      });
    }

    // Assign authenticated client's patient ID so clients cannot book for others
    req.body.patient = clientId;

    return await bookAppointment(req, res);
  } catch (error) {
    console.error("Book client appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while booking appointment"
    });
  }
};

// Client specific: Cancel own pending appointment
export const cancelClientAppointment = async (req, res) => {
  try {
    const clientId = req.user?._id || req.staff?._id;
    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({
      appointmentId,
      patient: clientId
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    if (appointment.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending appointments can be cancelled"
      });
    }

    appointment.status = "Cancelled";
    appointment.isSlotReserved = false;
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully",
      data: appointment
    });
  } catch (error) {
    console.error("Cancel client appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel appointment"
    });
  }
};

// Client specific: Reschedule own pending or confirmed appointment
export const rescheduleClientAppointment = async (req, res) => {
  try {
    const clientId = req.user?._id || req.staff?._id;
    const { appointmentId } = req.params;
    const { appointmentDate, startTime, reason } = req.body;

    if (!appointmentDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: "New appointment date and start time are required"
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date format. Use YYYY-MM-DD"
      });
    }

    const appointment = await Appointment.findOne({
      appointmentId,
      patient: clientId
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    if (!["Pending", "Confirmed", "Approved"].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: "Completed, cancelled or rejected appointments cannot be rescheduled"
      });
    }

    const hospitalDateTime = getHospitalDateTime();
    if (appointmentDate < hospitalDateTime.date) {
      return res.status(400).json({
        success: false,
        message: "Appointment date cannot be in the past"
      });
    }

    const startMinutes = timeToMinutes(startTime);
    if (appointmentDate === hospitalDateTime.date && startMinutes <= hospitalDateTime.minutes) {
      return res.status(400).json({
        success: false,
        message: "Appointment time must be in the future"
      });
    }

    const [year, month, day] = appointmentDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ][date.getUTCDay()];

    const schedule = await DoctorSchedule.findOne({
      doctor: appointment.doctor,
      dayOfWeek,
      isActive: true
    });

    if (!schedule) {
      return res.status(400).json({
        success: false,
        message: `Doctor is not scheduled on ${dayOfWeek}`
      });
    }

    const endMinutes = startMinutes + schedule.slotDuration;
    if (
      startMinutes < timeToMinutes(schedule.startTime) ||
      endMinutes > timeToMinutes(schedule.endTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "Selected time is outside doctor's working hours"
      });
    }

    const offset = startMinutes - timeToMinutes(schedule.startTime);
    if (offset % schedule.slotDuration !== 0) {
      return res.status(400).json({
        success: false,
        message: "Selected time does not match doctor's slot interval"
      });
    }

    const endTime =
      `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:` +
      `${String(endMinutes % 60).padStart(2, "0")}`;

    const occupiedSlots = generateOccupiedSlots(startMinutes, endMinutes);

    const appointmentStart = new Date(date);
    const appointmentEnd = new Date(date);
    appointmentEnd.setUTCDate(appointmentEnd.getUTCDate() + 1);

    const overlapping = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor,
      appointmentDate: {
        $gte: appointmentStart,
        $lt: appointmentEnd
      },
      isSlotReserved: true,
      occupiedSlots: { $in: occupiedSlots }
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: "This appointment slot is already booked"
      });
    }

    appointment.appointmentDate = date;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.occupiedSlots = occupiedSlots;
    appointment.schedule = schedule._id;
    appointment.status = "Pending";
    appointment.isSlotReserved = true;
    if (reason && reason.trim()) {
      appointment.reason = reason.trim();
    }
    await appointment.save();

    return res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully and is pending confirmation",
      data: appointment
    });
  } catch (error) {
    console.error("Reschedule appointment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to reschedule appointment"
    });
  }
};

// Public/Staff/Client helper: Get available slots for doctor and date
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID and date are required"
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    const [year, month, day] = date.split("-").map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));

    const dayOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ][calendarDate.getUTCDay()];

    const doctor = mongoose.isValidObjectId(doctorId)
      ? await Doctor.findOne({ _id: doctorId, isActive: true })
      : await Doctor.findOne({ doctorId, isActive: true });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Active doctor not found"
      });
    }

    const schedule = await DoctorSchedule.findOne({
      doctor: doctor._id,
      dayOfWeek,
      isActive: true
    });

    if (!schedule) {
      return res.status(200).json({
        success: true,
        data: {
          doctor: { id: doctor._id, name: doctor.name },
          schedule: null,
          availableSlots: [],
          message: `Doctor is not scheduled on ${dayOfWeek}`
        }
      });
    }

    const appointmentStart = new Date(calendarDate);
    const appointmentEnd = new Date(calendarDate);
    appointmentEnd.setUTCDate(appointmentEnd.getUTCDate() + 1);

    const reservedAppointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: {
        $gte: appointmentStart,
        $lt: appointmentEnd
      },
      isSlotReserved: true
    }).select("occupiedSlots");

    const occupiedTimes = new Set();
    reservedAppointments.forEach((apt) => {
      (apt.occupiedSlots || []).forEach((slot) => occupiedTimes.add(slot));
    });

    const startMinutes = timeToMinutes(schedule.startTime);
    const endMinutes = timeToMinutes(schedule.endTime);
    const slotDuration = schedule.slotDuration;

    const hospitalDateTime = getHospitalDateTime();
    const todayString = hospitalDateTime.date;
    const isToday = date === todayString;

    const availableSlots = [];
    for (let time = startMinutes; time + slotDuration <= endMinutes; time += slotDuration) {
      const slotEnd = time + slotDuration;
      const hours = Math.floor(time / 60);
      const minutes = time % 60;
      const timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

      if (isToday && time <= hospitalDateTime.minutes) {
        continue;
      }

      const subslots = generateOccupiedSlots(time, slotEnd);
      const hasConflict = subslots.some((s) => occupiedTimes.has(s));

      if (!hasConflict) {
        availableSlots.push(timeStr);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        doctor: { id: doctor._id, name: doctor.name, specialization: doctor.specialization },
        schedule: { dayOfWeek, startTime: schedule.startTime, endTime: schedule.endTime, slotDuration },
        availableSlots
      }
    });
  } catch (error) {
    console.error("Get available slots error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching available slots"
    });
  }
};
