
import jwt from "jsonwebtoken";
import Staff from "../models/Staff.js";
import Patient from "../models/Patient.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please log in."
      });
    }

    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await Staff.findById(decoded.id).select("-password");
    if (!user) {
      user = await Patient.findById(decoded.id).select("-password");
    }

    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Invalid or inactive account"
      });
    }

    req.user = user;
    req.staff = user;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }
};
