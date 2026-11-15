import mongoose from "mongoose";
import Bill from "../models/Bill.js";
import Visit from "../models/Visit.js";
import logAudit from "../utils/auditLogger.js";
import generateId from "../utils/generateId.js";

const round2 = (n) => Math.round(n * 100) / 100;

const populateBill = (query) =>
  query
    .populate("patient", "patientId name phone")
    .populate("visit", "visitId visitDate reason");

// Create a new bill (patient is taken from the visit)
export const createBill = async (req, res) => {
  try {
    const { billId, visit, items } = req.body;
    const taxRate = Number(req.body.taxRate ?? 0);

    if (!visit || !mongoose.isValidObjectId(visit)) {
      return res.status(400).json({ success: false, message: "A valid visit is required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one bill item is required"
      });
    }

    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      return res.status(400).json({
        success: false,
        message: "Tax rate must be between 0 and 100"
      });
    }

    const visitDoc = await Visit.findById(visit);

    if (!visitDoc) {
      return res.status(404).json({ success: false, message: "Visit not found" });
    }

    // One active bill per visit
    const existingBill = await Bill.findOne({
      visit,
      paymentStatus: { $ne: "Refunded" }
    });

    if (existingBill) {
      return res.status(409).json({
        success: false,
        message: `A bill (${existingBill.billId}) already exists for this visit`
      });
    }

    let subtotal = 0;
    const calculatedItems = [];

    for (const item of items) {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);

      if (
        typeof item.description !== "string" ||
        !item.description.trim() ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Each item needs a description, whole-number quantity and valid price"
        });
      }

      const amount = round2(quantity * unitPrice);
      subtotal += amount;

      calculatedItems.push({
        description: item.description.trim(),
        quantity,
        unitPrice,
        amount
      });
    }

    subtotal = round2(subtotal);
    const tax = round2((subtotal * taxRate) / 100);
    const totalAmount = round2(subtotal + tax);

    const bill = await Bill.create({
      billId: billId?.trim() || generateId("BILL"),
      patient: visitDoc.patient,
      visit: visitDoc._id,
      items: calculatedItems,
      subtotal,
      tax,
      totalAmount
    });

    await logAudit(req, "CREATE", "Billing", "Created a new patient bill", bill.billId);

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: bill
    });
  } catch (error) {
    console.error("Create Bill Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Bill ID already exists" });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }

    return res.status(500).json({ success: false, message: "Failed to create bill" });
  }
};

// Get all bills
export const getAllBills = async (req, res) => {
  try {
    const bills = await populateBill(Bill.find().sort({ createdAt: -1 }));

    return res.status(200).json({
      success: true,
      count: bills.length,
      data: bills
    });
  } catch (error) {
    console.error("Get Bills Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve bills" });
  }
};

// Get one bill by billId
export const getBillById = async (req, res) => {
  try {
    const bill = await populateBill(Bill.findOne({ billId: req.params.billId }));

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    return res.status(200).json({ success: true, data: bill });
  } catch (error) {
    console.error("Get Bill Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to retrieve bill" });
  }
};

// Simulated payment update (no real payment gateway)
export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod } = req.body;
    const { billId } = req.params;

    if (!["Paid", "Failed", "Refunded"].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Payment status must be Paid, Failed or Refunded"
      });
    }

    const bill = await Bill.findOne({ billId });

    if (!bill) {
      return res.status(404).json({ success: false, message: "Bill not found" });
    }

    if (bill.paymentStatus === "Refunded") {
      return res.status(400).json({
        success: false,
        message: "A refunded bill cannot be changed"
      });
    }

    if (paymentStatus === "Refunded") {
      if (req.staff.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only an admin can refund a bill"
        });
      }

      if (bill.paymentStatus !== "Paid") {
        return res.status(400).json({
          success: false,
          message: "Only paid bills can be refunded"
        });
      }
    } else {
      if (!["Cash", "Card", "UPI", "Online"].includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: "Invalid payment method" });
      }

      if (bill.paymentStatus === "Paid") {
        return res.status(400).json({
          success: false,
          message: "This bill has already been paid"
        });
      }
    }

    const previousStatus = bill.paymentStatus;

    bill.paymentStatus = paymentStatus;

    if (paymentStatus === "Paid") {
      bill.paymentMethod = paymentMethod;
      bill.paidAt = new Date();
      bill.paymentReference = `SIM-${Date.now()}`;
    } else if (paymentStatus === "Failed") {
      bill.paymentMethod = paymentMethod;
      bill.paidAt = undefined;
      bill.paymentReference = undefined;
    }

    await bill.save();

    await logAudit(
      req,
      "UPDATE",
      "Billing",
      `Payment status changed from ${previousStatus} to ${paymentStatus}`,
      bill.billId
    );

    return res.status(200).json({
      success: true,
      message: "Simulated payment processed successfully",
      data: bill
    });
  } catch (error) {
    console.error("Payment Error:", error.message);

    return res.status(500).json({ success: false, message: "Payment processing failed" });
  }
};
