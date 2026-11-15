import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
  {
    visitId: {
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

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment"
    },

    visitDate: {
      type: Date,
      required: true
    },

    reason: {
      type: String,
      required: true,
      trim: true
    },

    symptoms: {
      type: String,
      trim: true
    },

    clinicalNotes: {
      type: String,
      trim: true
    },

    followUpDate: {
      type: Date
    },

    status: {
      type: String,
      enum: ["In Progress", "Completed"],
      default: "In Progress"
    }
  },
  { timestamps: true }
);

const Visit = mongoose.model("Visit", visitSchema);

export default Visit;