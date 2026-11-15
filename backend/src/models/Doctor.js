
import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    specialization: {
      type: String,
      required: true,
      trim: true
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true
    },

    qualification: {
      type: String,
      required: true,
      trim: true
    },

    experience: {
      type: Number,
      required: true,
      min: 0
    },

    consultationFee: {
      type: Number,
      required: true,
      min: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
