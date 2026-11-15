
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true
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

    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorSchedule",
      required: true
    },

    appointmentDate: {
      type: Date,
      required: true
    },

    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },

    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/
    },

    occupiedSlots: {
      type: [String],
      required: true,
      validate: {
        validator: (slots) => slots.length > 0,
        message: "At least one occupied slot is required"
      }
    },

    isSlotReserved: {
      type: Boolean,
      default: true
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Approved",
        "Completed",
        "Cancelled",
        "Rejected"
      ],
      default: "Pending"
    }
  },
  { timestamps: true }
);

// Prevent duplicate occupied slots for a doctor on a date
appointmentSchema.index(
  {
    doctor: 1,
    appointmentDate: 1,
    occupiedSlots: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      isSlotReserved: true
    }
  }
);

const Appointment = mongoose.model(
  "Appointment",
  appointmentSchema
);

export default Appointment;
