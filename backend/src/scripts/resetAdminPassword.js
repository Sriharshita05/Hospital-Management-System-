
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Staff from "../models/Staff.js";

dotenv.config();

const resetAdminPassword = async () => {
  try {
    const email = process.env.ADMIN_EMAIL?.toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password || password.length < 8) {
      throw new Error("Valid admin email and password are required");
    }

    await connectDB();

    const admin = await Staff.findOne({
      email,
      role: "admin"
    });

    if (!admin) {
      throw new Error("Admin account not found");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    admin.password = hashedPassword;
    await admin.save();

    console.log("Admin password reset successfully!");

  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

resetAdminPassword();
