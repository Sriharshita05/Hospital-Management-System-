import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    billId: {
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

    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visit",
      required: true
    },

    items: [
      {
        description: {
          type: String,
          required: true,
          trim: true
        },

        quantity: {
          type: Number,
          required: true,
          min: 1
        },

        unitPrice: {
          type: Number,
          required: true,
          min: 0
        },

        amount: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ],

    subtotal: {
      type: Number,
      required: true,
      min: 0
    },

    tax: {
      type: Number,
      default: 0,
      min: 0
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending"
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Online"]
    },

    paymentReference: {
      type: String,
      trim: true
    },

    paidAt: {
      type: Date
    }
  },
  { timestamps: true }
);

billSchema.index({ patient: 1, createdAt: -1 });
billSchema.index({ paymentStatus: 1 });

const Bill = mongoose.model("Bill", billSchema);

export default Bill;