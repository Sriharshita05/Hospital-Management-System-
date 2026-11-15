
import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true
    },

    password: {
      type: String,
      minlength: 8
    },

    role: {
      type: String,
      enum: ["client"],
      default: "client"
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    dateOfBirth: {
      type: Date,
      required: true
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true
    },

    address: {
      type: String,
      trim: true,
      required: true
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    },

    emergencyContact: {
      name: {
        type: String,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      relationship: {
        type: String,
        trim: true
      }
    },

    // Patient's active status
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;
