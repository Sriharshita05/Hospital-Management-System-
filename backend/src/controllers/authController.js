import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import logAudit from "../utils/auditLogger.js";
import generateId from "../utils/generateId.js";

const ROLES = ["admin", "clinician", "frontDesk"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

const staffResponse = (staff) => ({
  staffId: staff.staffId,
  name: staff.name,
  email: staff.email,
  role: staff.role,
  doctor: staff.doctor || null,
  isActive: staff.isActive
});

const clientResponse = (client) => ({
  id: client._id,
  patientId: client.patientId,
  name: client.name,
  email: client.email,
  phone: client.phone,
  dateOfBirth: client.dateOfBirth,
  gender: client.gender,
  address: client.address,
  bloodGroup: client.bloodGroup || null,
  emergencyContact: client.emergencyContact || null,
  role: "client"
});

// Check that a doctor link is valid (active doctor) – returns an error string or null
const validateDoctorLink = async (role, doctorId) => {
  if (!doctorId) return null;

  if (role !== "clinician") {
    return "Only clinician accounts can be linked to a doctor";
  }

  if (!mongoose.isValidObjectId(doctorId)) {
    return "Invalid doctor ID";
  }

  const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });
  return doctor ? null : "Active doctor not found";
};

// Register staff (admin only)
export const registerStaff = async (req, res) => {
  try {
    const { staffId, name, email, password, role, doctor } = req.body;

    if (
      !isNonEmptyString(staffId) ||
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(password) ||
      !isNonEmptyString(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters"
      });
    }

    if (!ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff role"
      });
    }

    const linkError = await validateDoctorLink(role, doctor);
    if (linkError) {
      return res.status(400).json({ success: false, message: linkError });
    }

    const existingStaff = await Staff.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { staffId: staffId.trim() }
      ]
    });

    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "Email or staff ID already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const staff = await Staff.create({
      staffId: staffId.trim(),
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      role,
      doctor: doctor || null
    });

    await logAudit(
      req,
      "CREATE",
      "Authentication",
      `Registered staff account (${staff.role})`,
      staff.staffId
    );

    return res.status(201).json({
      success: true,
      message: "Staff registered successfully",
      data: staffResponse(staff)
    });
  } catch (error) {
    console.error("Registration Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or staff ID already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Staff registration failed"
    });
  }
};

// Register client (public)
export const registerClient = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      confirmPassword,
      dateOfBirth,
      gender,
      address,
      bloodGroup
    } = req.body;

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(phone) ||
      !isNonEmptyString(password) ||
      !isNonEmptyString(dateOfBirth) ||
      !isNonEmptyString(gender) ||
      !isNonEmptyString(address)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields"
      });
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const phoneCleaned = phone.trim();
    if (!/^[+]?[\d\s-]{7,15}$/.test(phoneCleaned)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters"
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and Confirm Password do not match"
      });
    }

    if (!["Male", "Female", "Other"].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male, Female, or Other"
      });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date of birth"
      });
    }
    if (dob > new Date()) {
      return res.status(400).json({
        success: false,
        message: "Date of birth cannot be in the future"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check duplicate in Staff
    const existingStaff = await Staff.findOne({ email: normalizedEmail });
    if (existingStaff) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists"
      });
    }

    // Check duplicate in Patient
    const existingPatient = await Patient.findOne({ email: normalizedEmail });
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const patientId = generateId("PAT");

    // Automatically and strictly assign the role "client"
    // Never allow users to select or modify their role during public registration
    const patient = await Patient.create({
      patientId,
      name: name.trim(),
      email: normalizedEmail,
      phone: phoneCleaned,
      password: hashedPassword,
      dateOfBirth: dob,
      gender,
      address: address.trim(),
      bloodGroup: bloodGroup || undefined,
      role: "client"
    });

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      { id: patient._id, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      success: true,
      message: "Client registered successfully",
      token,
      data: clientResponse(patient)
    });
  } catch (error) {
    console.error("Client Registration Error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or patient ID already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Client registration failed"
    });
  }
};

// Staff and Client login
export const loginStaff = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Reject non-string values (prevents object/NoSQL injection payloads)
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check Staff account first
    const staff = await Staff.findOne({
      email: normalizedEmail,
      isActive: true
    });

    if (staff) {
      const isPasswordValid = await bcrypt.compare(password, staff.password);

      if (!isPasswordValid) {
        req.staff = staff;
        await logAudit(
          req,
          "LOGIN",
          "Authentication",
          "Failed login attempt (wrong password)",
          staff.staffId,
          "Failed"
        );

        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
      }

      const token = jwt.sign(
        { id: staff._id, role: staff.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      req.staff = staff;
      await logAudit(req, "LOGIN", "Authentication", "Staff logged in", staff.staffId);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        data: staffResponse(staff)
      });
    }

    // 2. Check Client account
    const patient = await Patient.findOne({
      email: normalizedEmail,
      isActive: true
    });

    if (patient && patient.password) {
      const isPasswordValid = await bcrypt.compare(password, patient.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
      }

      const token = jwt.sign(
        { id: patient._id, role: "client" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        data: clientResponse(patient)
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  } catch (error) {
    console.error("Login Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
};

// Current logged-in user (Staff or Client)
export const getMe = (req, res) => {
  const user = req.user || req.staff;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  if (user.role === "client") {
    return res.status(200).json({
      success: true,
      data: clientResponse(user)
    });
  }

  return res.status(200).json({
    success: true,
    data: staffResponse(user)
  });
};

// Update current logged-in user profile (Client)
export const updateMe = async (req, res) => {
  try {
    const user = req.user || req.staff;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (user.role === "client") {
      const allowedFields = [
        "name",
        "phone",
        "dateOfBirth",
        "gender",
        "address",
        "bloodGroup",
        "emergencyContact"
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (updates.name !== undefined) {
        if (typeof updates.name !== "string" || updates.name.trim().length < 2) {
          return res.status(400).json({
            success: false,
            message: "Name must be at least 2 characters long"
          });
        }
        updates.name = updates.name.trim();
      }

      if (updates.phone !== undefined) {
        if (!/^[+]?[\d\s-]{7,15}$/.test(updates.phone.trim())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid phone number"
          });
        }
        updates.phone = updates.phone.trim();
      }

      if (updates.dateOfBirth !== undefined) {
        const dob = new Date(updates.dateOfBirth);
        if (isNaN(dob.getTime()) || dob > new Date()) {
          return res.status(400).json({
            success: false,
            message: "Date of birth cannot be in the future"
          });
        }
        updates.dateOfBirth = dob;
      }

      if (updates.gender !== undefined) {
        if (!["Male", "Female", "Other"].includes(updates.gender)) {
          return res.status(400).json({
            success: false,
            message: "Gender must be Male, Female, or Other"
          });
        }
      }

      if (updates.address !== undefined) {
        if (typeof updates.address !== "string" || !updates.address.trim()) {
          return res.status(400).json({
            success: false,
            message: "Address cannot be empty"
          });
        }
        updates.address = updates.address.trim();
      }

      const updatedPatient = await Patient.findByIdAndUpdate(
        user._id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: clientResponse(updatedPatient)
      });
    }

    return res.status(400).json({
      success: false,
      message: "Profile update not available for this role"
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};

// List staff (admin only)
export const getAllStaff = async (req, res) => {
  try {
    const staff = await Staff.find()
      .select("-password")
      .populate("doctor", "doctorId name specialization")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: staff.length,
      data: staff
    });
  } catch (error) {
    console.error("Get staff error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff"
    });
  }
};

// Update staff (admin only)
export const updateStaff = async (req, res) => {
  try {
    const { name, role, isActive, password, doctor } = req.body;

    const staff = await Staff.findOne({ staffId: req.params.staffId });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    const isSelf = staff._id.equals(req.staff._id);

    if (isSelf && (isActive === false || (role !== undefined && role !== staff.role))) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate or change the role of your own account"
      });
    }

    if (name !== undefined) {
      if (!isNonEmptyString(name)) {
        return res.status(400).json({ success: false, message: "Name cannot be empty" });
      }
      staff.name = name.trim();
    }

    if (role !== undefined) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid staff role" });
      }
      staff.role = role;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ success: false, message: "isActive must be true or false" });
      }
      staff.isActive = isActive;
    }

    if (doctor !== undefined) {
      const linkError = await validateDoctorLink(staff.role, doctor);
      if (linkError) {
        return res.status(400).json({ success: false, message: linkError });
      }
      staff.doctor = doctor || null;
    }

    // Non-clinician accounts cannot keep a doctor link
    if (staff.role !== "clinician") {
      staff.doctor = null;
    }

    if (password !== undefined && password !== "") {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters"
        });
      }
      staff.password = await bcrypt.hash(password, 12);
    }

    await staff.save();

    await logAudit(
      req,
      "UPDATE",
      "Authentication",
      "Updated staff account",
      staff.staffId
    );

    return res.status(200).json({
      success: true,
      message: "Staff updated successfully",
      data: staffResponse(staff)
    });
  } catch (error) {
    console.error("Update staff error:", error.message);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid staff information"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update staff"
    });
  }
};
