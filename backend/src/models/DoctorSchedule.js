
import mongoose from "mongoose";

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },

    dayOfWeek: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]
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

    slotDuration: {
      type: Number,
      required: true,
      min: 5
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

// One schedule per doctor per weekday
doctorScheduleSchema.index(
  { doctor: 1, dayOfWeek: 1 },
  { unique: true }
);

doctorScheduleSchema.pre("validate", function () {
  if (this.startTime && this.endTime &&
      this.startTime >= this.endTime) {
    this.invalidate(
      "endTime",
      "End time must be later than start time"
    );
  }

  if (
    this.startTime &&
    this.endTime &&
    this.slotDuration &&
    this.startTime < this.endTime
  ) {
    const [startHour, startMinute] = this.startTime.split(":").map(Number);
    const [endHour, endMinute] = this.endTime.split(":").map(Number);

    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if ((end - start) % this.slotDuration !== 0) {
      this.invalidate(
        "slotDuration",
        "Working hours must be divisible by slot duration"
      );
    }
  }
});

const DoctorSchedule = mongoose.model(
  "DoctorSchedule",
  doctorScheduleSchema
);

export default DoctorSchedule;
