
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../../services/api";

function AddDoctor({ onClose, onSuccess }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    doctorId: "",
    name: "",
    email: "",
    phone: "",
    specialization: "",
    department: "",
    qualification: "",
    experience: "",
    consultationFee: ""
  });

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get("/departments");

        const records =
          response.data.data?.departments ??
          response.data.data ??
          response.data.departments ??
          [];

        setDepartments(Array.isArray(records) ? records : []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
          "Unable to load departments."
        );
      }
    };

    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const payload = {
        ...formData,
        experience: Number(formData.experience),
        consultationFee: Number(formData.consultationFee)
      };

      await api.post("/doctors", payload);

      await onSuccess();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to register doctor."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-modal-overlay">
      <div className="patient-modal">
        <div className="patient-modal-header">
          <div>
            <h2>Add New Doctor</h2>
            <p>Enter professional details.</p>
          </div>

          <button type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="patient-form-grid">
            {[
              ["doctorId", "Doctor ID", "DOC001"],
              ["name", "Full Name", "Doctor name"],
              ["email", "Email", "doctor@example.com"],
              ["phone", "Phone", "Phone number"],
              ["specialization", "Specialization", "Cardiology"],
              ["qualification", "Qualification", "MBBS, MD"],
              ["experience", "Experience (Years)", "Years"],
              ["consultationFee", "Consultation Fee (₹)", "Fee"]
            ].map(([name, label, placeholder]) => (
              <div className="patient-form-group" key={name}>
                <label>{label} *</label>
                <input
                  type={
                    name === "email"
                      ? "email"
                      : name === "experience" ||
                        name === "consultationFee"
                      ? "number"
                      : "text"
                  }
                  name={name}
                  value={formData[name]}
                  onChange={handleChange}
                  placeholder={placeholder}
                  min={
                    name === "experience" ||
                    name === "consultationFee"
                      ? "0"
                      : undefined
                  }
                  required
                />
              </div>
            ))}

            <div className="patient-form-group">
              <label>Department *</label>

              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select Department</option>

                {departments.map((department) => (
                  <option
                    key={department._id}
                    value={department._id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {departments.length === 0 && (
            <p className="patient-form-error">
              No departments available. Create a department first.
            </p>
          )}

          {error && (
            <p className="patient-form-error">{error}</p>
          )}

          <div className="patient-form-actions">
            <button
              type="button"
              className="patient-cancel-button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="patient-submit-button"
              disabled={loading || departments.length === 0}
            >
              {loading ? "Saving..." : "Register Doctor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddDoctor;
