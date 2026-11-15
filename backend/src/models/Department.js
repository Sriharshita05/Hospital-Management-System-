
import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    departmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    location: {
      type: String,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const Department = mongoose.model(
  "Department",
  departmentSchema
);

export default Department;
