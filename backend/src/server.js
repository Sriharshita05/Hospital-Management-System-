import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import patientRoutes from "./routes/patientRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import doctorScheduleRoutes from "./routes/doctorScheduleRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import visitRoutes from "./routes/visitRoutes.js";
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import diagnosticReportRoutes from "./routes/diagnosticReportRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import {
  securityHeaders,
  sanitizeBody,
  createRateLimiter
} from "./middleware/securityMiddleware.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

export const app = express();

app.disable("x-powered-by");
app.use(securityHeaders);

// Only the configured frontend may call the API from a browser
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
  })
);

app.use(express.json({ limit: "100kb" }));
app.use(sanitizeBody);

// Rate limits
app.use(
  "/api/auth/login",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many login attempts. Please try again later."
  })
);
app.use(
  "/api/auth/client/register",
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many registration attempts. Please try again later."
  })
);
app.use(
  "/api",
  createRateLimiter({
    windowMs: 60 * 1000,
    max: 600,
    message: "Too many requests. Please slow down."
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/schedules", doctorScheduleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/diagnostic-reports", diagnosticReportRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("Hospital Management System API is running");
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must be set and at least 32 characters long");
    }

    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

// Start only when run directly (lets tests import `app`)
if (process.env.NODE_ENV !== "test") {
  startServer();
}
