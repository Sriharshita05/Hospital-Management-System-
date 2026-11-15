import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2
} from "lucide-react";

import logo from "../../assets/logo.jpg";
import api from "../../services/api";
import { getUser, isTokenExpired } from "../../utils/auth";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password
      });

      const { token, data } = response.data;

      if (!token || !data) {
        throw new Error("Invalid login response from server");
      }

      localStorage.setItem("hospital_token", token);
      localStorage.setItem("hospital_user", JSON.stringify(data));

      if (data.role === "client") {
        navigate("/client/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <img
            src={logo}
            alt="Hospital Management System Logo"
            className="login-logo-img"
          />
        </div>

        <div className="login-heading">
          <h2>Welcome Back</h2>
          <p>Sign in to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Email Address</label>

            <div className="login-input">
              <Mail size={18} />

              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>

            <div className="login-input">
              <Lock size={18} />

              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <span className="button-loader">
                <Loader2 size={18} className="spin-icon" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>

        </form>

        <div className="login-register-prompt">
          <p>
            New patient?{" "}
            <Link to="/register" className="register-link">
              Create Client Account
            </Link>
          </p>
        </div>

        <p className="login-footer">
          © 2026 MediCare Hospital Management System. All rights reserved.
        </p>

      </div>
    </div>
  );
}

export default Login;