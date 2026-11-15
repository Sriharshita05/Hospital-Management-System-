
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Staff from "../models/Staff.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    if (
      !process.env.ADMIN_NAME ||
      !process.env.ADMIN_EMAIL ||
      !process.env.ADMIN_PASSWORD
    ) {
      throw new Error("Admin environment variables are missing");
    }

    await connectDB();

    const existingAdmin = await Staff.findOne({
      role: "admin"
    });

    if (existingAdmin) {
      console.log("An admin account already exists.");
      return;
    }

    const existingEmail = await Staff.findOne({
      email: process.env.ADMIN_EMAIL.toLowerCase()
    });

    if (existingEmail) {
      console.log("This admin email is already registered.");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      12
    );

    await Staff.create({
      staffId: "ADMIN001",
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin"
    });

    console.log("Initial admin account created successfully.");

  } catch (error) {
    console.error("Admin seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
