import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  Lock,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

import logo from "../../assets/logo.jpg";
import api from "../../services/api";
import { getUser, isTokenExpired } from "../../utils/auth";
import "./Register.css";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[\d\s-]{7,15}$/;

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    bloodGroup: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect accordingly
  useEffect(() => {
    const token = localStorage.getItem("hospital_token");
    if (token && !isTokenExpired(token)) {
      const user = getUser();
      if (user.role === "client") {
        navigate("/client/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // Clear field-specific validation error on user input
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (serverError) setServerError("");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!PHONE_REGEX.test(formData.phone.trim())) {
      newErrors.phone = "Please enter a valid phone number (at least 7 digits)";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      const dob = new Date(formData.dateOfBirth);
      if (isNaN(dob.getTime())) {
        newErrors.dateOfBirth = "Invalid date of birth";
      } else if (dob > new Date()) {
        newErrors.dateOfBirth = "Date of birth cannot be in the future";
      }
    }

    if (!formData.gender) {
      newErrors.gender = "Please select your gender";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address.trim(),
        bloodGroup: formData.bloodGroup || undefined
      };

      const response = await api.post("/auth/client/register", payload);

      const { token, data, message } = response.data;

      if (!token || !data) {
        throw new Error("Invalid registration response from server");
      }

      setSuccessMessage(message || "Account created successfully! Redirecting...");

      // Store auth session
      localStorage.setItem("hospital_token", token);
      localStorage.setItem("hospital_user", JSON.stringify(data));

      // Redirect to Client Dashboard
      setTimeout(() => {
        navigate("/client/dashboard");
      }, 1200);

    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Registration failed. Please check your information and try again.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Maximum allowed date of birth is today
  const todayString = new Date().toISOString().split("T")[0];

  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-brand">
          <img
            src={logo}
            alt="Hospital Management System Logo"
            className="register-logo-img"
          />
          <h1>MediCare Hospital</h1>
          <p>Patient & Client Portal Registration</p>
        </div>

        <div className="register-heading">
          <h2>Create Your Account</h2>
          <p>Register as a patient to schedule appointments and access healthcare services</p>
        </div>

        {serverError && (
          <div className="register-alert error">
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        {successMessage && (
          <div className="register-alert success">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>

          <div className="register-grid">

            {/* Full Name */}
            <div className="form-group full-width">
              <label htmlFor="reg-name">
                Full Name <span className="req">*</span>
              </label>
              <div className={`register-input ${errors.name ? "has-error" : ""}`}>
                <User size={18} />
                <input
                  id="reg-name"
                  type="text"
                  name="name"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label htmlFor="reg-email">
                Email Address <span className="req">*</span>
              </label>
              <div className={`register-input ${errors.email ? "has-error" : ""}`}>
                <Mail size={18} />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label htmlFor="reg-phone">
                Phone Number <span className="req">*</span>
              </label>
              <div className={`register-input ${errors.phone ? "has-error" : ""}`}>
                <Phone size={18} />
                <input
                  id="reg-phone"
                  type="tel"
                  name="phone"
                  placeholder="e.g. +1 555-0123"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label htmlFor="reg-password">
                Password <span className="req">*</span>
              </label>
              <div className={`register-input ${errors.password ? "has-error" : ""}`}>
                <Lock size={18} />
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label htmlFor="reg-confirm">
                Confirm Password <span className="req">*</span>
              </label>
              <div className={`register-input ${errors.confirmPassword ? "has-error" : ""}`}>
                <Lock size={18} />
                <input
                  id="reg-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword}</span>
              )}
            </div>

            {/* Date of Birth */}
            <div className="form-group">
              <label htmlFor="reg-dob">
                Date of Birth <span className="req">*</span>
              </label>
              <div className={`register-input ${errors.dateOfBirth ? "has-error" : ""}`}>
                <Calendar size={18} />
                <input
                  id="reg-dob"
                  type="date"
                  name="dateOfBirth"
                  max={todayString}
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {errors.dateOfBirth && (
                <span className="field-error">{errors.dateOfBirth}</span>
              )}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label htmlFor="reg-gender">
                Gender <span className="req">*</span>
              </label>
              <div className={`register-select ${errors.gender ? "has-error" : ""}`}>
                <select
                  id="reg-gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {errors.gender && <span className="field-error">{errors.gender}</span>}
            </div>

            {/* Blood Group (Optional) */}
            <div className="form-group">
              <label htmlFor="reg-blood">Blood Group (Optional)</label>
              <div className="register-select">
                <select
                  id="reg-blood"
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <div className="form-group full-width">
              <label htmlFor="reg-address">
                Residential Address <span className="req">*</span>
              </label>
              <div className={`register-textarea ${errors.address ? "has-error" : ""}`}>
                <MapPin size={18} className="textarea-icon" />
                <textarea
                  id="reg-address"
                  name="address"
                  rows={2}
                  placeholder="Enter your street address, city, and state"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              {errors.address && <span className="field-error">{errors.address}</span>}
            </div>

          </div>

          <div className="register-terms">
            <p>
              By signing up, you agree to MediCare's terms of health service and privacy policy. Your medical records are protected under medical confidentiality laws.
            </p>
          </div>

          <button
            type="submit"
            className="register-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="button-loader">
                <Loader2 size={18} className="spin-icon" />
                Creating Your Account...
              </span>
            ) : (
              "Sign Up as Patient"
            )}
          </button>

        </form>

        <div className="register-login-prompt">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="login-link">
              Sign In to MediCare
            </Link>
          </p>
        </div>

        <p className="register-footer">
          © 2026 MediCare Hospital Management System. All rights reserved.
        </p>

      </div>
    </div>
  );
}

export default Register;

